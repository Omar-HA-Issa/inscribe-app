import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../shared/utils/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type InsightCategory = "pattern" | "anomaly" | "opportunity" | "risk";

export interface Insight {
  title: string;
  description: string;
  confidence: "High" | "Medium" | "Low";
  category: InsightCategory | "correlation"; // we’ll filter correlation out later
  evidence: string[];
  impact: string;
}

export interface InsightResponse {
  insights: Insight[];
  generatedAt: string;
  documentCount: number;
  cached?: boolean;
}

// ---------- Helper: safe parsing ----------

function safeParseInsightsResponse(raw: string): Insight[] {
  if (!raw || !raw.trim()) {
    logger.warn("Empty AI response for insights");
    return [];
  }

  logger.debug("=== GPT-4 RESPONSE DEBUG ===");
  logger.debug(`Response length: ${raw.length}`);
  logger.debug(`First 500 chars: ${raw.slice(0, 500)}`);
  logger.debug(`Last 500 chars: ${raw.slice(-500)}`);
  logger.debug("=== END DEBUG ===");

  let cleaned = raw.trim();
  logger.debug(`Raw AI insights response length: ${cleaned.length}`);

  // Strip ```json ... ``` or ``` ... ``` fences if they exist
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/m, "");
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
  }

  try {
    const parsed: any = JSON.parse(cleaned);

    // Support:
    // 1) [ { ... }, { ... } ]
    // 2) { "insights": [ ... ] }
    if (Array.isArray(parsed)) {
      return parsed as Insight[];
    }

    if (parsed && Array.isArray(parsed.insights)) {
      return parsed.insights as Insight[];
    }

    logger.warn("Unexpected insights JSON structure. Returning empty array.");
    return [];
  } catch (error) {
    logger.error("Failed to parse AI insights JSON:", { error });
    return [];
  }
}

// ---------- OpenAI helpers ----------

async function analyzeDocumentWithAI(
  documentName: string,
  content: string
): Promise<Insight[]> {
  // GPT-4o has large context; keep a buffer for prompt + response
  const MAX_CONTENT_LENGTH = 100000;
  const truncatedContent =
    content.length > MAX_CONTENT_LENGTH
      ? content.slice(0, MAX_CONTENT_LENGTH) +
        "\n\n[Document truncated due to length...]"
      : content;

  logger.info(
    `📊 Analyzing document with ${content.length} chars (${truncatedContent.length} sent to GPT-4)`
  );

  const prompt = `
You are an expert document analyst. The document you will read could be an academic paper, a student report, a guide, a policy document, a business report, or any other non-fiction text.

Your job is to extract NON-OBVIOUS insights that would be genuinely useful to someone who wants to understand, use, or improve this document.

Document name: ${documentName || "Untitled document"}

Document content:
"""${truncatedContent}"""

CRITICAL INSTRUCTIONS:
1. You MUST return between 10 and 16 insights.
2. Do NOT use the "correlation" category at all.
3. Only use these categories:
   - "pattern": recurring or emerging themes, behaviour, or structure in the document
   - "anomaly": contradictions, blind spots, inconsistencies, or surprising elements
   - "opportunity": chances to improve, extend, clarify, or apply the document’s ideas
   - "risk": potential problems, weaknesses, limitations, or points of confusion
4. Each insight must be clearly distinct from the others (no duplicates or near-duplicates).
5. Each insight MUST be supported by specific evidence from the document (quotes, data points, or described sections).
6. Write in clear, accessible language that would make sense to a smart reader who has not yet read the full document.

Return ONLY valid JSON in this structure:

[
  {
    "title": "Short descriptive title of the insight",
    "description": "2–4 sentence explanation of the insight and how it relates to the document",
    "confidence": "High" | "Medium" | "Low",
    "category": "pattern" | "anomaly" | "opportunity" | "risk",
    "evidence": [
      "Specific quote, data point, or section that supports this insight",
      "You may include multiple short evidence items"
    ],
    "impact": "2 sentences explaining why this insight matters and how it could influence decisions, understanding, or further work related to this document."
  }
]
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an expert document analyst. You find non-obvious, helpful insights in any kind of non-fiction document. Always return valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 5500,
  });

  const responseText = completion.choices[0].message.content || "";
  const parsed = safeParseInsightsResponse(responseText);

  // Belt-and-suspenders: drop any stray 'correlation' category
  const filtered = parsed.filter((i) => i.category !== "correlation");

  return filtered;
}

async function analyzeCrossDocumentWithAI(
  documents: {
    name: string;
    summary: string;
    metadata?: Record<string, any>;
  }[]
): Promise<Insight[]> {
  const prompt = `
You are an expert analyst comparing multiple documents. You will receive a list of document summaries with optional metadata.

Your task:
- Identify cross-document insights that rely on comparing or combining information across documents.
- Go beyond surface-level observations.
- Each insight MUST reference which documents it comes from.

Documents (JSON):
${JSON.stringify(documents, null, 2)}

CRITICAL INSTRUCTIONS:
1. You MUST return between 8 and 15 insights.
2. Do NOT use the "correlation" category at all.
3. Only use these categories:
   - "pattern": recurring or shared themes across documents
   - "anomaly": contradictions, diverging results, or inconsistencies between documents
   - "opportunity": chances for synthesis, extension, or useful combination of ideas
   - "risk": conflicts, gaps, or limitations that appear when comparing documents
4. Each insight must reference at least two documents.
5. Provide specific evidence from the summaries.

Return ONLY valid JSON in this structure:

[
  {
    "title": "Short descriptive title",
    "description": "2–4 sentence explanation that explicitly references multiple documents",
    "confidence": "High" | "Medium" | "Low",
    "category": "pattern" | "anomaly" | "opportunity" | "risk",
    "evidence": ["Doc A: specific point", "Doc B: specific point"],
    "impact": "2 sentences: what this multi-document insight implies strategically or intellectually"
  }
]
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an expert document analyst who compares multiple documents to find cross-document insights. Always respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 3000,
  });

  const responseText = completion.choices[0].message.content || "";
  const parsed = safeParseInsightsResponse(responseText);

  // Filter out any stray 'correlation' just in case
  return parsed.filter((i) => i.category !== "correlation");
}

// ---------- Public service functions ----------

export async function generateDocumentInsights(
  documentId: string,
  userId: string,
  forceRegenerate = false
): Promise<InsightResponse> {
  // 1) Try cache (unless forcing regeneration)
  const { data: cached, error: cacheError } = await supabase
    .from("document_insights")
    .select("insights, created_at")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .single();

  if (cacheError) {
    // This includes the "Cannot coerce the result to a single JSON object" case
    logger.warn(
      "Error reading cached insights (ok to continue):",
      { error: cacheError.message }
    );
  }

  if (!forceRegenerate && cached?.insights) {
    const cacheAgeMs = Date.now() - new Date(cached.created_at).getTime();
    const hours = cacheAgeMs / (1000 * 60 * 60);

    if (hours < 24) {
      logger.info("📦 Returning cached insights");
      const filtered = (cached.insights as Insight[]).filter(
        (i) => i.category !== "correlation"
      );
      return {
        insights: filtered,
        generatedAt: cached.created_at,
        documentCount: 1,
        cached: true,
      };
    }
  }

  // 2) Validate document ownership
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, file_name, user_id")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (docError || !doc) {
    logger.error("Error fetching document for insights:", { error: docError });
    throw new Error("Document not found");
  }

  // 3) Fetch ALL chunks
  logger.info(`📄 Fetching all chunks for document ${documentId}...`);
  const { data: chunks, error: chunksError } = await supabase
    .from("document_chunks")
    .select("content, chunk_index")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (chunksError) {
    logger.error("Error fetching document chunks for insights:", { error: chunksError });
    throw new Error("Failed to fetch document chunks");
  }

  logger.info(`✅ Fetched ${chunks?.length || 0} chunks`);

  const fullContent =
    chunks && chunks.length > 0
      ? (chunks as any[]).map((c) => c.content).join("\n\n")
      : "";

  logger.info(`📊 Full document: ${fullContent.length} characters`);

  // 4) Call OpenAI
  const insights = await analyzeDocumentWithAI(
    (doc as any).file_name ?? "Document",
    fullContent
  );

  logger.info(`✨ Generated ${insights.length} insights`);

  // 5) Cache insights in DB
  const { error: upsertError } = await supabase
    .from("document_insights")
    .upsert(
      {
        document_id: documentId,
        user_id: userId,
        insights,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "document_id,user_id",
      }
    );

  if (upsertError) {
    logger.warn(
      "Failed to upsert document_insights cache:",
      { error: upsertError.message }
    );
  }

  return {
    insights,
    generatedAt: new Date().toISOString(),
    documentCount: 1,
    cached: false,
  };
}

export async function generateCrossDocumentInsights(
  documentIds: string[],
  userId: string,
  forceRegenerate = false
): Promise<InsightResponse> {
  if (!documentIds.length) {
    return {
      insights: [],
      generatedAt: new Date().toISOString(),
      documentCount: 0,
      cached: false,
    };
  }

  const { data: docs, error: docsError } = await supabase
    .from("documents")
    .select("id, file_name, metadata")
    .in("id", documentIds)
    .eq("user_id", userId);

  if (docsError) {
    logger.error("Error fetching documents for cross-document insights:", { error: docsError });
    throw new Error("Failed to fetch documents");
  }

  if (!docs || !docs.length) {
    return {
      insights: [],
      generatedAt: new Date().toISOString(),
      documentCount: 0,
      cached: false,
    };
  }

  const summaries: {
    name: string;
    summary: string;
    metadata?: Record<string, any>;
  }[] = [];

  for (const doc of docs) {
    const { data: summaryDoc, error: summaryError } = await supabase
      .from("documents")
      .select("summary")
      .eq("id", doc.id)
      .single();

    if (summaryError) {
      logger.warn("Error fetching summary for document:", { documentId: doc.id, error: summaryError });
      continue;
    }

    let summary: any = summaryDoc?.summary;
    if (typeof summary === "string") {
      try {
        summary = JSON.parse(summary);
      } catch {
        // ignore parse error, treat as raw text
      }
    }

    summaries.push({
      name: doc.file_name ?? "Document",
      summary: summary?.overview || summary?.summary || "",
      metadata: doc.metadata || {},
    });
  }

  const insights = await analyzeCrossDocumentWithAI(summaries);

  return {
    insights,
    generatedAt: new Date().toISOString(),
    documentCount: docs.length,
    cached: false,
  };
}
