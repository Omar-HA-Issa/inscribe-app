import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../shared/utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ContradictionsResponse {
  contradictions: Contradiction[];
  groupedByType: Record<ContradictionType, Contradiction[]>;
}

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
  // Enhanced contradiction data (non-breaking addition)
  contradictionsGroupedByType?: Record<ContradictionType, Contradiction[]>;
}

type ContradictionType = 'version' | 'api' | 'config' | 'process' | 'architecture';
type ContradictionSeverity = 'high' | 'medium' | 'low';

interface ContradictionSource {
  docName: string;
  location: string;
  excerpt: string;
}

interface Contradiction {
  id: string;
  severity: ContradictionSeverity;
  confidence: number;
  type: ContradictionType;
  description: string;
  sources: ContradictionSource[];
  // Keep legacy fields for backwards compatibility
  claim?: string;
  evidence?: string;
  explanation?: string;
  claimSource?: DocumentReference;
  evidenceSource?: DocumentReference;
  impact?: string;
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
    logger.info('[Validator] Returning cached results');
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
    logger.info('[Validator] Returning cached results');
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
  return `You are analyzing "${documentName}" for comprehensive technical documentation quality review.

DOCUMENT CONTENT:
${documentText.slice(0, 20000)}

Provide thorough analysis including:
1. CONTRADICTIONS - internal conflicting statements (with tech-specific categorization)
2. INFORMATION GAPS - missing critical info
3. KEY CLAIMS - most important statements (max 5)
4. RECOMMENDATIONS - actionable advice (3-5 items)
5. RISK ASSESSMENT - overall quality

TECH-SPECIFIC CONTRADICTION TYPES to identify and categorize:
- "version": Version mismatches or outdated version references
- "api": API endpoint changes, parameter differences, response format inconsistencies
- "config": Configuration settings that conflict or contradict each other
- "process": Process or workflow steps that contradict or are inconsistent
- "architecture": Architecture decisions, design patterns, or system structure contradictions

For each contradiction, extract:
- Exact source locations (section name, line reference, or page number if available)
- Relevant excerpts showing both conflicting statements
- Confidence level (0-1 number, where 1.0 is highest confidence)
- Severity assessment

SEVERITY LEVELS for gaps:
- high = "Big Issue" - Critical problems that significantly impact document quality
- medium = "Medium Issue" - Moderate problems that should be addressed
- low = "Minor Issue" - Small gaps or nice-to-have improvements

Return ONLY valid JSON:
{
  "contradictions": [{
    "severity": "high|medium|low",
    "confidence": 0.95,
    "type": "version|api|config|process|architecture",
    "description": "Clear description of the contradiction",
    "sources": [
      {"docName": "${documentName}", "location": "Section name or reference", "excerpt": "First conflicting text"}
    ]
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
    "criticalItems": ["Specific, actionable issue that needs immediate attention with reasoning"],
    "nextSteps": ["..."]
  }
}

Note: overallRisk values mean: high = major issues found, medium = minor issues, low = good quality/consistency
Confidence should be a number between 0 and 1 (e.g., 0.85 for high confidence)
Location should be specific section name, page reference, or code reference
Each contradiction should have at least one source showing where it was found in the document`;
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

  return `Compare primary document "${primaryDocName}" against other documents for technical consistency.

PRIMARY: "${primaryDocName}"
${primaryText.slice(0, 15000)}

COMPARISON DOCUMENTS:
${comparisonTexts}

CRITICAL FIRST STEP: Determine if these documents are related enough to meaningfully compare.
- If documents are about completely different topics/domains (e.g., astrophysics vs machine learning, legal contract vs recipe), they are NOT comparable.
- If documents share NO common subject matter, concepts, or purposes, they are NOT comparable.

Analyze for contradictions, agreements, gaps, key claims, recommendations, and risk.

TECH-SPECIFIC CONTRADICTION TYPES to identify and categorize:
- "version": Version mismatches or outdated version references between documents
- "api": API endpoint changes, parameter differences, response format inconsistencies
- "config": Configuration settings that conflict or contradict each other
- "process": Process or workflow steps that contradict or are inconsistent between documents
- "architecture": Architecture decisions, design patterns, or system structure contradictions

For each contradiction:
- Clearly identify which documents are in conflict
- Extract exact source locations (section name, line reference, or page number)
- Provide relevant excerpts showing both conflicting statements
- Assign confidence level (0-1 number, where 1.0 is highest confidence)
- Categorize by tech-specific type

CRITICAL ITEMS should identify specific, actionable problems:
- Direct contradictions between document claims
- Missing information that one document has but the other lacks
- Inconsistent methodology or definitions
- Claims that lack proper substantiation in one document
- Major discrepancies in scope, timeline, or conclusions

SEVERITY LEVELS for gaps:
- high = "Big Issue" - Critical missing information that significantly impacts completeness
- medium = "Medium Issue" - Moderate gaps that should be addressed for better consistency
- low = "Minor Issue" - Small omissions or nice-to-have enhancements

Return ONLY valid JSON:
{
  "documentsComparable": true|false,
  "comparabilityReason": "Brief explanation of why documents are/aren't comparable",
  "contradictions": [{
    "severity": "high|medium|low",
    "confidence": 0.85,
    "type": "version|api|config|process|architecture",
    "description": "Clear description of the contradiction and which documents conflict",
    "sources": [
      {"docName": "${primaryDocName}", "location": "Section name or reference in primary", "excerpt": "Conflicting text from primary"},
      {"docName": "Comparison doc name", "location": "Section name or reference in comparison", "excerpt": "Conflicting text from comparison"}
    ]
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
    "description": "What's missing from primary compared to comparison",
    "severity": "high|medium|low",
    "expectedInformation": "Specific information that should be included with examples from comparison documents"
  }],
  "keyClaims": [{
    "claim": "Important statement from primary",
    "importance": "high|medium|low",
    "type": "fact|opinion|recommendation|requirement",
    "excerpt": "20-30 word excerpt"
  }],
  "recommendations": [{
    "title": "Recommendation title",
    "description": "What to do about findings - be specific",
    "priority": "high|medium|low",
    "actionItems": ["Specific action 1", "Specific action 2"],
    "relatedIssues": ["Related contradiction or gap"]
  }],
  "riskAssessment": {
    "overallRisk": "high|medium|low",
    "summary": "Overall consistency and quality assessment",
    "criticalItems": ["Specific, actionable issue with context"],
    "nextSteps": ["Recommended next actions"]
  }
}

Note: overallRisk values mean: high = major issues/conflicts, medium = minor issues, low = good consistency/quality
Confidence should be a number between 0 and 1 (e.g., 0.85 for high confidence)
Location should be specific section name, page reference, or code reference
Each contradiction should have sources array with docName, location, and excerpt for each conflicting document

IMPORTANT RULES:
- If documentsComparable is false, return EMPTY arrays for contradictions, gaps, agreements, keyClaims, recommendations, and riskAssessment should note documents are unrelated.
- If documents are unrelated, DO NOT fabricate connections or suggest changes to make them related.
- Only compare documents that actually discuss similar topics, concepts, or domains.
- Critical items must be specific with actionable context, NOT generic statements.`;
}

async function callGPT4ForAnalysis(prompt: string): Promise<any> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert document validator. Provide comprehensive analysis with evidence. Always return complete JSON with all required fields. For contradictions, use the structured format with type, severity, confidence, description, and sources.',
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

/**
 * Map LLM contradictions to new structured format
 */
function mapLLMContradictionsToStructured(llmContradictions: any[]): Contradiction[] {
  return llmContradictions.map((c: any, index: number) => {
    const sources: ContradictionSource[] = c.sources || [];

    // If sources is empty but we have legacy fields, construct from those
    if (sources.length === 0 && (c.claim || c.evidence)) {
      if (c.claimExcerpt || c.claim) {
        sources.push({
          docName: 'Document',
          location: 'Internal conflict',
          excerpt: c.claimExcerpt || c.claim,
        });
      }
      if (c.evidenceExcerpt || c.evidence) {
        sources.push({
          docName: 'Document',
          location: 'Internal conflict',
          excerpt: c.evidenceExcerpt || c.evidence,
        });
      }
    }

    // Parse confidence: can be string ("high", "medium", "low") or number (0-1)
    let confidenceNum = 0.5;
    if (typeof c.confidence === 'number') {
      confidenceNum = Math.max(0, Math.min(1, c.confidence));
    } else if (typeof c.confidence === 'string') {
      const confidenceMap = { high: 0.85, medium: 0.65, low: 0.45 };
      confidenceNum = confidenceMap[c.confidence as keyof typeof confidenceMap] || 0.5;
    }

    // Determine type from the contradiction content or use default
    let type: ContradictionType = 'process';
    if (c.type && ['version', 'api', 'config', 'process', 'architecture'].includes(c.type)) {
      type = c.type as ContradictionType;
    }

    return {
      id: `contradiction-${index}-${Date.now()}`,
      severity: c.severity || 'medium',
      confidence: confidenceNum,
      type,
      description: c.description || c.explanation || c.claim || 'Contradiction detected',
      sources: sources.length > 0 ? sources : [{ docName: 'Document', location: 'Unknown', excerpt: 'N/A' }],
      // Keep legacy fields for backwards compatibility
      claim: c.claim,
      evidence: c.evidence,
      explanation: c.explanation,
      impact: c.impact,
    };
  });
}

/**
 * Group contradictions by type
 */
function groupContradictionsByType(contradictions: Contradiction[]): Record<ContradictionType, Contradiction[]> {
  const grouped: Record<ContradictionType, Contradiction[]> = {
    version: [],
    api: [],
    config: [],
    process: [],
    architecture: [],
  };

  for (const contradiction of contradictions) {
    const type = contradiction.type || 'process';
    if (grouped[type]) {
      grouped[type].push(contradiction);
    }
  }

  return grouped;
}

function mapEnhancedAnalysisResults(
  analysis: any,
  chunks: any[],
  documentId: string,
  documentName: string
): ContradictionResult {
  // Map contradictions to new structured format
  const structuredContradictions = mapLLMContradictionsToStructured(analysis.contradictions || []);

  // Keep legacy fields for backwards compatibility
  const contradictions: Contradiction[] = structuredContradictions.map((c) => ({
    ...c,
    claimSource: c.claim ? {
      documentId,
      documentName,
      excerpt: c.claim,
      chunkIndex: findChunkForExcerpt(c.claim, chunks),
    } : undefined,
    evidenceSource: c.evidence ? {
      documentId,
      documentName,
      excerpt: c.evidence,
      chunkIndex: findChunkForExcerpt(c.evidence, chunks),
    } : undefined,
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

  const contradictionsGroupedByType = groupContradictionsByType(contradictions);

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
    contradictionsGroupedByType,
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

  // Map contradictions to new structured format
  const structuredContradictions = mapLLMContradictionsToStructured(analysis.contradictions || []);

  const contradictions: Contradiction[] = structuredContradictions.map((c: any) => {
    // Enrich sources with document references
    const enrichedSources: ContradictionSource[] = (c.sources || []).map((source: ContradictionSource) => {
      // If source docName doesn't match primary, try to find the comparison doc
      if (source.docName !== primaryDocName && source.docName !== 'Document') {
        const matchingDoc = compareChunks.find((chunk: any) =>
          chunk.documents.file_name.includes(source.docName)
        );
        if (matchingDoc) {
          return {
            ...source,
            docName: matchingDoc.documents.file_name,
          };
        }
      }
      return source;
    });

    return {
      ...c,
      sources: enrichedSources.length > 0 ? enrichedSources : c.sources,
      claimSource: c.claim ? {
        documentId: primaryDocumentId,
        documentName: primaryDocName,
        excerpt: c.claim,
        chunkIndex: findChunkForExcerpt(c.claim, primaryChunks),
      } : undefined,
      evidenceSource: c.evidence ? {
        documentId: compareChunks[0]?.document_id || primaryDocumentId,
        documentName: compareChunks[0]?.documents.file_name || primaryDocName,
        excerpt: c.evidence,
        chunkIndex: findChunkForExcerpt(c.evidence, compareChunks),
      } : undefined,
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
  const contradictionsGroupedByType = groupContradictionsByType(contradictions);

  return {
    contradictions,
    gaps,
    agreements,
    keyClaims,
    recommendations,
    riskAssessment,
    contradictionsGroupedByType,
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
 * Validates if a document is technical (software development, DevOps, etc.)
 * Returns: { isTechnical: boolean, reason: string, confidence: number }
 */
export async function validateDocumentIsTechnical(
  documentText: string,
  fileName: string
): Promise<{
  isTechnical: boolean;
  reason: string;
  confidence: number;
}> {
  // Use first 10,000 chars for classification (enough to determine topic)
  const sampleText = documentText.substring(0, 10000);

  const prompt = `You are a document classifier. Determine if this document is technical (related to software development, DevOps, programming, technical documentation, system architecture, APIs, databases, cloud infrastructure, etc.).

Document: "${fileName}"
Content sample:
${sampleText}

Analyze the document and determine:
1. Is this document technical? (true/false)
2. Brief reason for your classification
3. Confidence level (0.0 to 1.0)

TECHNICAL documents include:
- Software development documentation (code, APIs, SDKs)
- DevOps guides (deployment, CI/CD, infrastructure)
- System architecture documents
- Technical specifications and requirements
- Database schemas and queries
- Cloud infrastructure documentation
- Programming tutorials and guides
- Technical troubleshooting guides

NON-TECHNICAL documents include:
- Marketing materials
- Business proposals and reports
- Legal documents
- Creative writing (novels, stories, poetry)
- Personal documents (resumes, letters)
- News articles (unless about tech)
- Academic papers (unless CS/engineering related)
- General knowledge documents

Return ONLY valid JSON:
{
  "isTechnical": true|false,
  "reason": "Brief explanation of why this is or isn't technical",
  "confidence": 0.95
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a document classifier. Analyze documents and determine if they are technical.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    logger.info(`[Validator] Document classification result for ${fileName}:`, {
      isTechnical: result.isTechnical,
      confidence: result.confidence,
      reason: result.reason,
    });

    return {
      isTechnical: result.isTechnical || false,
      reason: result.reason || 'Unable to classify document',
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    logger.error('[Validator] Error validating document type:', { error, fileName });
    // On error, allow the document (fail open)
    return {
      isTechnical: true,
      reason: 'Classification service unavailable',
      confidence: 0.0,
    };
  }
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
    logger.info(`[Validator] Cleared ${keysToDelete.length} cache entries for documents: ${documentIds.join(', ')}`);
  } else {
    analysisCache.clear();
    logger.info('[Validator] Cleared all cache');
  }
}