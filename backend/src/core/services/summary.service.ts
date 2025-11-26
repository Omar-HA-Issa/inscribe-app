import OpenAI from "openai";
import { adminClient } from "../../core/clients/supabaseClient";
import { logger } from "../../shared/utils/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SummaryResult {
  overview: string;
  keyFindings: string[];
  keywords: string[];
  metadata: {
    wordCount?: number;
    pageCount?: number;
    readingTime?: number; // in minutes
  };
}

/**
 * Generate a comprehensive summary of a document
 */
export async function generateDocumentSummary(
  documentId: string,
  userId: string
): Promise<SummaryResult> {
  try {
    const sb = adminClient();

    // 1. Fetch document to ensure user owns it
    const { data: document, error: docError } = await sb
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      logger.error("❌ Document query error:", { error: docError });
      throw new Error("Document not found or access denied");
    }

    // 2. If summary already exists, return it directly
    if (document.summary) {
      try {
        return JSON.parse(document.summary);
      } catch (err) {
        logger.warn("⚠️ Failed to parse existing summary JSON, regenerating:", { error: err });
      }
    }

    // 3. Fetch document chunks (full text)
    const { data: chunks, error: chunksError } = await sb
      .from("document_chunks")
      .select("content, chunk_index")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    logger.info(`📊 Chunks query result for ${documentId}:`, {
      error: chunksError,
      chunksFound: chunks?.length || 0,
    });

    if (chunksError) {
      logger.error("❌ Chunks query error:", { error: chunksError });
      throw new Error(`Database error: ${chunksError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      logger.error("❌ No chunks found for document:", { documentId });
      throw new Error("No document content found. Document may still be processing.");
    }

    // 4. Combine chunks into full text
    const fullText = (chunks as any[]).map((c: any) => c.content).join("\n\n");

    // Calculate metadata
    const wordCount = fullText.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

    // Limit how much text we send to the model while still capturing most of the document
    const MAX_CHARS_FOR_SUMMARY = 40000;
    const analysisText =
      fullText.length > MAX_CHARS_FOR_SUMMARY
        ? fullText.slice(0, MAX_CHARS_FOR_SUMMARY) +
          "\n\n[Document truncated for analysis]"
        : fullText;

    // 5. Generate summary using OpenAI (general-purpose prompt)
    const prompt = `You are an expert document analyst. Analyze the following document and provide:

1. A clear 3-4 sentence overview that captures the main theme and purpose.
2. 4-6 key findings or main points (bullet points).
3. 5-8 important keywords or phrases that represent core concepts.

The document may be technical, academic, business, legal, or general-purpose. Focus on faithfully representing the content without adding external assumptions.

Document to analyze:
${analysisText}

Respond in JSON format:
{
  "overview": "3-4 sentence overview here",
  "keyFindings": ["finding 1", "finding 2", "..."],
  "keywords": ["keyword1", "keyword2", "..."]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a document analysis expert. Provide concise, accurate summaries in JSON format.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    const summaryData = JSON.parse(responseText);

    const result: SummaryResult = {
      overview: summaryData.overview,
      keyFindings: summaryData.keyFindings || [],
      keywords: summaryData.keywords || [],
      metadata: {
        wordCount,
        // fallback: rough page estimate if metadata.pages is missing
        pageCount: document.metadata?.pages || Math.ceil((chunks as any[]).length / 3),
        readingTime,
      },
    };

    // 6. Store summary in database
    const { error: updateError } = await sb
      .from("documents")
      .update({
        summary: JSON.stringify(result),
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      logger.error("Failed to save summary:", { error: updateError });
      // Don't throw - we still have the summary to return
    }

    return result;
  } catch (error) {
    logger.error("Error generating summary:", { error });
    throw error;
  }
}

/**
 * Get existing summary or generate new one
 */
export async function getSummary(
  documentId: string,
  userId: string,
  forceRegenerate = false
): Promise<SummaryResult> {
  try {
    const sb = adminClient();

    // Check for existing summary unless forcing regeneration
    if (!forceRegenerate) {
      const { data: document } = await sb
        .from("documents")
        .select("summary")
        .eq("id", documentId)
        .eq("user_id", userId)
        .single();

      if (document?.summary) {
        return JSON.parse(document.summary);
      }
    }

    // Generate new summary
    return await generateDocumentSummary(documentId, userId);
  } catch (error) {
    logger.error("Error getting summary:", { error });
    throw error;
  }
}
