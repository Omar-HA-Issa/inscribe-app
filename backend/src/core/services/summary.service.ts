import OpenAI from "openai";
import { adminClient } from "../../core/clients/supabaseClient";

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
      throw new Error("Document not found or access denied");
    }

    // 2. Check if summary already exists
    if (document.summary) {
      return JSON.parse(document.summary);
    }

    // 3. Fetch document chunks (full text)
    const { data: chunks, error: chunksError } = await sb
      .from("document_chunks")
      .select("content, chunk_index")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    console.log(`📊 Chunks query result for ${documentId}:`, {
      error: chunksError,
      chunksFound: chunks?.length || 0,
    });

    if (chunksError) {
      console.error("❌ Chunks query error:", chunksError);
      throw new Error(`Database error: ${chunksError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      console.error("❌ No chunks found for document:", documentId);
      throw new Error("No document content found. Document may still be processing.");
    }

    // 4. Combine chunks into full text
    const fullText = chunks.map((c) => c.content).join("\n\n");

    // Calculate metadata
    const wordCount = fullText.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

    // 5. Generate summary using OpenAI
    const prompt = `You are an expert document analyst. Analyze the following document and provide:

1. A comprehensive 3-4 sentence overview that captures the main theme and purpose
2. 4-6 key findings or main points (bullet points)
3. 5-8 important keywords or phrases that represent core concepts

Document to analyze:
${fullText.slice(0, 12000)} ${fullText.length > 12000 ? "... [truncated for analysis]" : ""}

Respond in JSON format:
{
  "overview": "3-4 sentence overview here",
  "keyFindings": ["finding 1", "finding 2", ...],
  "keywords": ["keyword1", "keyword2", ...]
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
        pageCount: document.metadata?.pages || Math.ceil(chunks.length / 3),
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
      console.error("Failed to save summary:", updateError);
      // Don't throw - we still have the summary to return
    }

    return result;
  } catch (error) {
    console.error("Error generating summary:", error);
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

    // Check for existing summary
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
    console.error("Error getting summary:", error);
    throw error;
  }
}