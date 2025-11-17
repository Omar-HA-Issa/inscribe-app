import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ContradictionResult {
  contradictions: Contradiction[];
  gaps: InformationGap[];
  agreements: Agreement[];
  keyClaims: KeyClaim[];
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment;
  analysisMetadata: {
    documentsAnalyzed: number;
    totalChunksReviewed: number;
    analysisTimestamp: string;
    cached: boolean;
  };
}

interface Contradiction {
  claim: string;
  evidence: string;
  severity: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  claimSource: DocumentReference;
  evidenceSource: DocumentReference;
  impact: string;
}

interface Agreement {
  statement: string;
  sources: DocumentReference[];
  confidence: 'high' | 'medium' | 'low';
  significance: string;
}

interface KeyClaim {
  claim: string;
  source: DocumentReference;
  importance: 'high' | 'medium' | 'low';
  type: 'fact' | 'opinion' | 'recommendation' | 'requirement';
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  relatedIssues: string[];
}

interface RiskAssessment {
  overallRisk: 'high' | 'medium' | 'low';
  summary: string;
  criticalItems: string[];
  nextSteps: string[];
}

interface DocumentReference {
  documentId: string;
  documentName: string;
  excerpt: string;
  chunkIndex: number;
}

interface InformationGap {
  area: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  expectedInformation: string;
}

// Simple in-memory cache (use Redis for production)
const analysisCache = new Map<string, { result: ContradictionResult; timestamp: number }>();
// Cache indefinitely - only cleared on manual regeneration or server restart
// IMPORTANT: Clear cache when documents are deleted/updated by calling clearAnalysisCache()
const CACHE_ENABLED = true;

function getCacheKey(documentIds: string[]): string {
  // Sort to ensure consistent cache keys regardless of order
  return documentIds.sort().join('-');
}

function getCachedResult(cacheKey: string): ContradictionResult | null {
  if (!CACHE_ENABLED) return null;

  const cached = analysisCache.get(cacheKey);
  if (!cached) return null;

  // No expiration - cache indefinitely
  return {
    ...cached.result,
    analysisMetadata: {
      ...cached.result.analysisMetadata,
      cached: true,
    },
  };
}

function setCachedResult(cacheKey: string, result: ContradictionResult): void {
  if (!CACHE_ENABLED) return;

  analysisCache.set(cacheKey, {
    result: {
      ...result,
      analysisMetadata: {
        ...result.analysisMetadata,
        cached: false,
      },
    },
    timestamp: Date.now(),
  });
}

/**
 * Detect contradictions within a single document
 */
export async function detectWithinDocument(
  documentId: string,
  userId: string
): Promise<ContradictionResult> {
  // Check cache
  const cacheKey = getCacheKey([documentId]);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    console.log('[Validator] Returning cached results');
    return cached;
  }

  // Fetch all chunks for the document
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index, documents!inner(id, file_name, user_id)')
    .eq('document_id', documentId)
    .eq('documents.user_id', userId)
    .order('chunk_index', { ascending: true });

  if (error || !chunks || chunks.length === 0) {
    throw new Error('Document not found or no content available');
  }

  const documentName = (chunks[0] as any).documents.file_name;
  const fullText = chunks.map((c: any) => c.content).join('\n\n');

  // Use GPT-4 to analyze
  const prompt = buildEnhancedSingleDocumentPrompt(fullText, documentName);
  const analysis = await callGPT4ForAnalysis(prompt);

  // Map results
  const result = mapEnhancedAnalysisResults(analysis, chunks, documentId, documentName);

  // Cache results
  setCachedResult(cacheKey, result);

  return result;
}

/**
 * Detect contradictions between documents
 */
export async function detectAcrossDocuments(
  primaryDocumentId: string,
  compareDocumentIds: string[],
  userId: string
): Promise<ContradictionResult> {
  const allDocIds = [primaryDocumentId, ...compareDocumentIds];

  // Check cache
  const cacheKey = getCacheKey(allDocIds);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    console.log('[Validator] Returning cached results');
    return cached;
  }

  // Fetch primary document chunks
  const { data: primaryChunks, error: primaryError } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index, documents!inner(id, file_name, user_id)')
    .eq('document_id', primaryDocumentId)
    .eq('documents.user_id', userId)
    .order('chunk_index', { ascending: true });

  if (primaryError || !primaryChunks || primaryChunks.length === 0) {
    throw new Error('Primary document not found');
  }

  // Fetch comparison documents
  const { data: compareChunks, error: compareError } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index, document_id, documents!inner(id, file_name, user_id)')
    .in('document_id', compareDocumentIds)
    .eq('documents.user_id', userId)
    .order('document_id', { ascending: true })
    .order('chunk_index', { ascending: true });

  if (compareError || !compareChunks || compareChunks.length === 0) {
    throw new Error('Comparison documents not found');
  }

  // Group comparison docs
  const comparisonDocs = groupChunksByDocument(compareChunks);
  const primaryText = primaryChunks.map((c: any) => c.content).join('\n\n');
  const primaryDocName = (primaryChunks[0] as any).documents.file_name;

  const prompt = buildEnhancedCrossDocumentPrompt(primaryText, primaryDocName, comparisonDocs);
  const analysis = await callGPT4ForAnalysis(prompt);

  // Map results
  const result = mapEnhancedCrossDocAnalysisResults(
    analysis,
    primaryChunks,
    compareChunks,
    primaryDocumentId,
    primaryDocName
  );

  // Cache results
  setCachedResult(cacheKey, result);

  return result;
}

function buildEnhancedSingleDocumentPrompt(documentText: string, documentName: string): string {
  return `You are analyzing "${documentName}" for comprehensive quality review.

DOCUMENT CONTENT:
${documentText.slice(0, 20000)}

Provide thorough analysis including:
1. CONTRADICTIONS - conflicting statements
2. INFORMATION GAPS - missing critical info
3. KEY CLAIMS - most important statements (max 5)
4. RECOMMENDATIONS - actionable advice (3-5 items)
5. RISK ASSESSMENT - overall quality

Return ONLY valid JSON:
{
  "contradictions": [{
    "claim": "...", "evidence": "...", "severity": "high|medium|low",
    "confidence": "high|medium|low", "explanation": "...", "impact": "...",
    "claimExcerpt": "...", "evidenceExcerpt": "..."
  }],
  "gaps": [{
    "area": "...", "description": "...", "severity": "high|medium|low",
    "expectedInformation": "..."
  }],
  "keyClaims": [{
    "claim": "...", "importance": "high|medium|low",
    "type": "fact|opinion|recommendation|requirement", "excerpt": "..."
  }],
  "recommendations": [{
    "title": "...", "description": "...", "priority": "high|medium|low",
    "actionItems": ["..."], "relatedIssues": ["..."]
  }],
  "riskAssessment": {
    "overallRisk": "high|medium|low", "summary": "...",
    "criticalItems": ["..."], "nextSteps": ["..."]
  }
}

Note: overallRisk values mean: high = major issues found, medium = minor issues, low = good quality/consistency`;
}

function buildEnhancedCrossDocumentPrompt(
  primaryText: string,
  primaryDocName: string,
  comparisonDocs: Map<string, { name: string; text: string }>
): string {
  const comparisonTexts = Array.from(comparisonDocs.entries())
    .map(([_, doc]) => `DOCUMENT: "${doc.name}"\n${doc.text.slice(0, 10000)}`)
    .join('\n\n---\n\n');

  const comparisonDocNames = Array.from(comparisonDocs.values()).map(d => d.name);

  return `Compare primary document "${primaryDocName}" against other documents.

PRIMARY: "${primaryDocName}"
${primaryText.slice(0, 15000)}

COMPARISON DOCUMENTS:
${comparisonTexts}

CRITICAL FIRST STEP: Determine if these documents are related enough to meaningfully compare.
- If documents are about completely different topics/domains (e.g., astrophysics vs machine learning, legal contract vs recipe), they are NOT comparable.
- If documents share NO common subject matter, concepts, or purposes, they are NOT comparable.

Analyze for contradictions, agreements, gaps, key claims, recommendations, and risk.

Return ONLY valid JSON:
{
  "documentsComparable": true|false,
  "comparabilityReason": "Brief explanation of why documents are/aren't comparable",
  "contradictions": [{
    "claim": "Statement from primary",
    "evidence": "Conflicting statement from comparison",
    "severity": "high|medium|low",
    "confidence": "high|medium|low",
    "explanation": "Why this is a contradiction",
    "impact": "What this means",
    "claimExcerpt": "20-30 word excerpt from primary",
    "evidenceExcerpt": "20-30 word excerpt from comparison",
    "evidenceDocumentName": "Name of comparison document"
  }],
  "agreements": [{
    "statement": "What the documents agree on",
    "sources": ["${primaryDocName}", "${comparisonDocNames[0] || 'ComparisonDoc'}"],
    "confidence": "high|medium|low",
    "significance": "Why this agreement matters",
    "excerpts": ["excerpt from primary (20-30 words)", "excerpt from comparison (20-30 words)"]
  }],
  "gaps": [{
    "area": "Topic or section",
    "description": "What's missing from primary",
    "severity": "high|medium|low",
    "expectedInformation": "What should be included"
  }],
  "keyClaims": [{
    "claim": "Important statement from primary",
    "importance": "high|medium|low",
    "type": "fact|opinion|recommendation|requirement",
    "excerpt": "20-30 word excerpt"
  }],
  "recommendations": [{
    "title": "Recommendation title",
    "description": "What to do about findings",
    "priority": "high|medium|low",
    "actionItems": ["Specific action 1", "Specific action 2"],
    "relatedIssues": ["Related contradiction or gap"]
  }],
  "riskAssessment": {
    "overallRisk": "high|medium|low",
    "summary": "Overall consistency and quality assessment",
    "criticalItems": ["Most critical conflicts or issues found"],
    "nextSteps": ["Recommended next actions"]
  }
}

Note: overallRisk values mean: high = major issues/conflicts, medium = minor issues, low = good consistency/quality

IMPORTANT RULES:
- If documentsComparable is false, return EMPTY arrays for contradictions, gaps, agreements, keyClaims, recommendations, and riskAssessment should note documents are unrelated.
- If documents are unrelated, DO NOT fabricate connections or suggest changes to make them related.
- Only compare documents that actually discuss similar topics, concepts, or domains.`;
}

async function callGPT4ForAnalysis(prompt: string): Promise<any> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert document validator. Provide comprehensive analysis with evidence. Always return complete JSON with all required fields.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error('No response from GPT-4');
  return JSON.parse(content);
}

function mapEnhancedAnalysisResults(
  analysis: any,
  chunks: any[],
  documentId: string,
  documentName: string
): ContradictionResult {
  const contradictions: Contradiction[] = (analysis.contradictions || []).map((c: any) => ({
    claim: c.claim,
    evidence: c.evidence,
    severity: c.severity,
    confidence: c.confidence,
    explanation: c.explanation,
    impact: c.impact || 'Impact not specified',
    claimSource: {
      documentId,
      documentName,
      excerpt: c.claimExcerpt,
      chunkIndex: findChunkForExcerpt(c.claimExcerpt, chunks),
    },
    evidenceSource: {
      documentId,
      documentName,
      excerpt: c.evidenceExcerpt,
      chunkIndex: findChunkForExcerpt(c.evidenceExcerpt, chunks),
    },
  }));

  const gaps: InformationGap[] = (analysis.gaps || []).map((g: any) => ({
    area: g.area,
    description: g.description,
    severity: g.severity,
    expectedInformation: g.expectedInformation,
  }));

  const keyClaims: KeyClaim[] = (analysis.keyClaims || []).map((k: any) => ({
    claim: k.claim,
    source: {
      documentId,
      documentName,
      excerpt: k.excerpt,
      chunkIndex: findChunkForExcerpt(k.excerpt, chunks),
    },
    importance: k.importance,
    type: k.type,
  }));

  const recommendations: Recommendation[] = (analysis.recommendations || []).map((r: any) => ({
    title: r.title,
    description: r.description,
    priority: r.priority,
    actionItems: r.actionItems || [],
    relatedIssues: r.relatedIssues || [],
  }));

  const riskAssessment: RiskAssessment = {
    overallRisk: analysis.riskAssessment?.overallRisk || 'medium',
    summary: analysis.riskAssessment?.summary || 'Analysis complete',
    criticalItems: analysis.riskAssessment?.criticalItems || [],
    nextSteps: analysis.riskAssessment?.nextSteps || [],
  };

  return {
    contradictions,
    gaps,
    agreements: [],
    keyClaims,
    recommendations,
    riskAssessment,
    analysisMetadata: {
      documentsAnalyzed: 1,
      totalChunksReviewed: chunks.length,
      analysisTimestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

function mapEnhancedCrossDocAnalysisResults(
  analysis: any,
  primaryChunks: any[],
  compareChunks: any[],
  primaryDocumentId: string,
  primaryDocName: string
): ContradictionResult {
  // Check if documents are comparable
  const documentsComparable = analysis.documentsComparable !== false; // Default to true if not specified
  const comparabilityReason = analysis.comparabilityReason || '';

  // If documents are not comparable, return minimal result
  if (!documentsComparable) {
    const uniqueDocIds = new Set([primaryDocumentId, ...compareChunks.map((c: any) => c.document_id)]);
    return {
      contradictions: [],
      gaps: [],
      agreements: [],
      keyClaims: [],
      recommendations: [],
      riskAssessment: {
        overallRisk: 'low',
        summary: `Documents are not meaningfully comparable. ${comparabilityReason}`,
        criticalItems: [],
        nextSteps: ['Select documents from the same topic or domain for meaningful comparison'],
      },
      analysisMetadata: {
        documentsAnalyzed: uniqueDocIds.size,
        totalChunksReviewed: primaryChunks.length + compareChunks.length,
        analysisTimestamp: new Date().toISOString(),
        cached: false,
      },
    };
  }

  const contradictions: Contradiction[] = (analysis.contradictions || []).map((c: any) => {
    const evidenceDoc = compareChunks.find(
      (chunk: any) => c.evidenceDocumentName && chunk.documents.file_name.includes(c.evidenceDocumentName)
    ) || compareChunks[0];

    return {
      claim: c.claim,
      evidence: c.evidence,
      severity: c.severity,
      confidence: c.confidence,
      explanation: c.explanation,
      impact: c.impact || 'Impact not specified',
      claimSource: {
        documentId: primaryDocumentId,
        documentName: primaryDocName,
        excerpt: c.claimExcerpt,
        chunkIndex: findChunkForExcerpt(c.claimExcerpt, primaryChunks),
      },
      evidenceSource: {
        documentId: (evidenceDoc as any).document_id,
        documentName: (evidenceDoc as any).documents.file_name,
        excerpt: c.evidenceExcerpt,
        chunkIndex: findChunkForExcerpt(c.evidenceExcerpt, compareChunks),
      },
    };
  });

  const agreements: Agreement[] = (analysis.agreements || []).map((a: any) => {
    const sources: DocumentReference[] = [];
    if (a.excerpts && Array.isArray(a.excerpts)) {
      a.excerpts.forEach((excerpt: string, idx: number) => {
        const allChunks = idx === 0 ? primaryChunks : compareChunks;
        const docName = a.sources && a.sources[idx] ? a.sources[idx] : 'Unknown';
        sources.push({
          documentId: idx === 0 ? primaryDocumentId : (compareChunks[0] as any).document_id,
          documentName: docName,
          excerpt: excerpt,
          chunkIndex: findChunkForExcerpt(excerpt, allChunks),
        });
      });
    }
    return {
      statement: a.statement,
      sources: sources,
      confidence: a.confidence,
      significance: a.significance,
    };
  });

  const gaps: InformationGap[] = (analysis.gaps || []).map((g: any) => ({
    area: g.area,
    description: g.description,
    severity: g.severity,
    expectedInformation: g.expectedInformation,
  }));

  const keyClaims: KeyClaim[] = (analysis.keyClaims || []).map((k: any) => ({
    claim: k.claim,
    source: {
      documentId: primaryDocumentId,
      documentName: primaryDocName,
      excerpt: k.excerpt,
      chunkIndex: findChunkForExcerpt(k.excerpt, primaryChunks),
    },
    importance: k.importance,
    type: k.type,
  }));

  const recommendations: Recommendation[] = (analysis.recommendations || []).map((r: any) => ({
    title: r.title,
    description: r.description,
    priority: r.priority,
    actionItems: r.actionItems || [],
    relatedIssues: r.relatedIssues || [],
  }));

  const riskAssessment: RiskAssessment = {
    overallRisk: analysis.riskAssessment?.overallRisk || 'medium',
    summary: analysis.riskAssessment?.summary || 'Analysis complete',
    criticalItems: analysis.riskAssessment?.criticalItems || [],
    nextSteps: analysis.riskAssessment?.nextSteps || [],
  };

  const uniqueDocIds = new Set([primaryDocumentId, ...compareChunks.map((c: any) => c.document_id)]);

  return {
    contradictions,
    gaps,
    agreements,
    keyClaims,
    recommendations,
    riskAssessment,
    analysisMetadata: {
      documentsAnalyzed: uniqueDocIds.size,
      totalChunksReviewed: primaryChunks.length + compareChunks.length,
      analysisTimestamp: new Date().toISOString(),
      cached: false,
    },
  };
}

function groupChunksByDocument(chunks: any[]): Map<string, { name: string; text: string }> {
  const grouped = new Map<string, { name: string; text: string }>();
  for (const chunk of chunks) {
    const docId = chunk.document_id;
    const docName = chunk.documents.file_name;
    if (!grouped.has(docId)) {
      grouped.set(docId, { name: docName, text: chunk.content });
    } else {
      const existing = grouped.get(docId)!;
      existing.text += '\n\n' + chunk.content;
    }
  }
  return grouped;
}

function findChunkForExcerpt(excerpt: string, chunks: any[]): number {
  const excerptWords = excerpt.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
  let bestMatch = 0;
  let maxScore = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i].content.toLowerCase();
    const score = excerptWords.filter((word: string) => chunkContent.includes(word)).length;
    if (score > maxScore) {
      maxScore = score;
      bestMatch = i;
    }
  }
  return bestMatch;
}

/**
 * Clear cache for specific document(s) or all cache
 */
export function clearAnalysisCache(documentIds?: string[]): void {
  if (documentIds && documentIds.length > 0) {
    // Clear all cache entries that include any of these document IDs
    const keysToDelete: string[] = [];
    for (const [key, _] of analysisCache.entries()) {
      const keyDocIds = key.split('-');
      if (documentIds.some(docId => keyDocIds.includes(docId))) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => analysisCache.delete(key));
    console.log(`[Validator] Cleared ${keysToDelete.length} cache entries for documents: ${documentIds.join(', ')}`);
  } else {
    analysisCache.clear();
    console.log('[Validator] Cleared all cache');
  }
}