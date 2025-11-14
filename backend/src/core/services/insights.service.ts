import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Insight {
  title: string;
  description: string;
  confidence: 'High' | 'Medium' | 'Low';
  category: 'correlation' | 'pattern' | 'anomaly' | 'opportunity' | 'risk';
  evidence: string[];
  impact: string;
}

export interface InsightResponse {
  insights: Insight[];
  generatedAt: string;
  documentCount: number;
}

// ---------- Helper to safely parse model output ----------

function safeParseInsightsResponse(responseText: string): Insight[] {
  if (!responseText) return [];

  let cleaned = responseText.trim();
  console.log('Raw AI insights response:', cleaned);

  // Strip ```json ... ``` or ``` ... ``` fences if they exist
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/m, '');
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
  }

  try {
    const parsed: any = JSON.parse(cleaned);

    // Support both `[ {...} ]` and `{ "insights": [ {...} ] }`
    if (Array.isArray(parsed)) {
      return parsed as Insight[];
    }
    if (parsed && Array.isArray(parsed.insights)) {
      return parsed.insights as Insight[];
    }

    console.error('Parsed JSON does not have expected shape:', parsed);
    return [];
  } catch (err) {
    console.error('Failed to parse AI response as JSON:', err, '\nRaw:', responseText);
    return [];
  }
}

// ---------- OpenAI helpers ----------

async function analyzeDocumentWithAI(
  documentName: string,
  content: string
): Promise<Insight[]> {
  const prompt = `
You are an expert analyst reading a document. Your goal is to find NON-OBVIOUS insights that require deeper analysis.

Document name: ${documentName || 'Untitled document'}

Document content:
"""${content.slice(0, 20000)}"""

CRITICAL INSTRUCTIONS:
1. Go beyond surface-level observations - don't just repeat what's stated
2. Find hidden patterns, connections between concepts, and implicit implications
3. Identify contradictions, gaps, risks, or opportunities that aren't explicitly mentioned
4. Connect multiple pieces of information to form new insights
5. Analyze what's NOT said but implied
6. Consider strategic, operational, and tactical implications

Generate 8-12 insights. Each insight should be:
- NON-OBVIOUS: Requires analysis, not just reading
- SPECIFIC: Use concrete details from the document
- ACTIONABLE: Has clear implications

Return ONLY valid JSON (no markdown, no explanation):

[
  {
    "title": "Specific, compelling insight title",
    "description": "2-3 sentences explaining the insight with analytical depth. Connect multiple concepts. Explain WHY this matters.",
    "confidence": "High" | "Medium" | "Low",
    "category": "correlation" | "pattern" | "anomaly" | "opportunity" | "risk",
    "evidence": ["Specific quote or data point", "Another supporting point", "Third piece of evidence"],
    "impact": "2 sentences: What this means strategically and what actions it suggests"
  }
]

Categories:
- correlation: Unexpected relationships between concepts
- pattern: Recurring themes that reveal deeper meaning
- anomaly: Inconsistencies, contradictions, or gaps
- opportunity: Untapped potential or strategic advantages
- risk: Hidden concerns or potential problems
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert analyst who discovers non-obvious insights through deep analysis. Always respond with valid JSON only.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 3000,
  });

  const responseText = completion.choices[0].message.content || '';
  return safeParseInsightsResponse(responseText);
}

interface CrossDocSummary {
  name: string;
  summary: string;
  metadata: any;
}

async function analyzeCrossDocumentWithAI(
  docs: CrossDocSummary[]
): Promise<Insight[]> {
  const prompt = `
You are an expert analyst comparing multiple documents.

You will receive a JSON array of documents with this shape:
[
  {
    "name": "Document name",
    "summary": "Short summary of the document",
    "metadata": { ...optional key facts like date, author, tags... }
  }
]

Your task:
- Look for patterns, correlations, contradictions, and opportunities across the documents.
- Focus on cross-document insights, not per-document summaries.
- Produce 3–10 insights.

Return ONLY valid JSON, with the same Insight schema as before
(either an array or { "insights": [ ... ] }).

Documents:
"""${JSON.stringify(docs).slice(0, 18000)}"""`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert document analyst. Always respond with valid JSON only, following the requested schema.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 2500,
  });

  const responseText = completion.choices[0].message.content || '';
  return safeParseInsightsResponse(responseText);
}

// ---------- Public service functions ----------

export async function generateDocumentInsights(
  documentId: string,
  userId: string
): Promise<InsightResponse> {
  // Check for cached insights first
  const { data: cached, error: cacheError } = await supabase
    .from('document_insights')
    .select('insights, created_at')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .single();

  if (cacheError) {
    console.warn('Error reading cached insights (ok to continue):', cacheError.message);
  }

  if (cached?.insights) {
    const cacheAgeMs = Date.now() - new Date(cached.created_at).getTime();
    const hours = cacheAgeMs / (1000 * 60 * 60);

    // Reuse cache if younger than 24h
    if (hours < 24) {
      console.log('📦 Returning cached insights');
      return {
        insights: cached.insights as Insight[],
        generatedAt: cached.created_at,
        documentCount: 1,
      };
    }
  }

  // Fetch document meta
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, file_name, user_id')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (docError || !doc) {
    console.error('Error fetching document for insights:', docError);
    throw new Error('Document not found');
  }

  // Fetch up to N chunks to build content
  const { data: chunks, error: chunksError } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('document_id', documentId)
    .limit(50);

  if (chunksError) {
    console.error('Error fetching document chunks for insights:', chunksError);
  }

  const fullContent =
    chunks && chunks.length > 0
      ? (chunks as any[]).map(c => c.content).join('\n\n')
      : '';

  const insights = await analyzeDocumentWithAI(
    (doc as any).file_name ?? 'Document',
    fullContent
  );

  // Cache the insights (ignore failure)
  const { error: upsertError } = await supabase.from('document_insights').upsert({
    document_id: documentId,
    user_id: userId,
    insights,
    created_at: new Date().toISOString(),
  });

  if (upsertError) {
    console.warn('Failed to upsert document_insights cache:', upsertError.message);
  }

  return {
    insights,
    generatedAt: new Date().toISOString(),
    documentCount: 1,
  };
}

export async function generateCrossDocumentInsights(
  documentIds: string[],
  userId: string
): Promise<InsightResponse> {
  if (!documentIds.length) {
    return {
      insights: [],
      generatedAt: new Date().toISOString(),
      documentCount: 0,
    };
  }

  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('id, file_name, metadata')
    .in('id', documentIds)
    .eq('user_id', userId);

  if (docsError || !docs || docs.length === 0) {
    console.error('Error fetching documents for cross insights:', docsError);
    throw new Error('Documents not found');
  }

  // Grab summaries where available
  const summaries: CrossDocSummary[] = [];

  for (const doc of docs as any[]) {
    const { data: summary, error: summaryError } = await supabase
      .from('document_summaries')
      .select('summary')
      .eq('document_id', doc.id)
      .single();

    if (summaryError) {
      console.warn(
        `No summary found for document ${doc.id} (ok, will still include with empty summary)`
      );
    }

    summaries.push({
      name: doc.file_name ?? 'Document',
      summary: summary?.summary || '',
      metadata: doc.metadata || {},
    });
  }

  const insights = await analyzeCrossDocumentWithAI(summaries);

  return {
    insights,
    generatedAt: new Date().toISOString(),
    documentCount: docs.length,
  };
}