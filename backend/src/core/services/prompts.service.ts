import { VALIDATION_CONFIG } from '../../shared/constants/config';

/**
 * PromptService
 * Generates structured prompts for AI analysis
 * Separates prompt engineering from business logic
 * Follows Single Responsibility Principle
 */
export class PromptService {
  /**
   * Build prompt for within-document contradiction analysis
   */
  static buildWithinDocumentPrompt(content: string, documentName: string): string {
    const truncatedContent = content.substring(0, VALIDATION_CONFIG.PROMPT_MAX_LENGTH);

    return `You are a document analysis expert. Analyze the following document for internal contradictions, gaps, and key claims.

Document: "${documentName}"
Content:
${truncatedContent}

Provide a detailed analysis in JSON format with these fields:
{
  "contradictions": [{"claim": string, "evidence": string, "severity": "high"|"medium"|"low", "confidence": "high"|"medium"|"low", "explanation": string, "impact": string}],
  "gaps": [{"area": string, "description": string, "severity": "high"|"medium"|"low", "expectedInformation": string}],
  "keyClaims": [{"claim": string, "importance": "high"|"medium"|"low", "type": "fact"|"opinion"|"recommendation"|"requirement"}],
  "recommendations": [{"title": string, "description": string, "priority": "high"|"medium"|"low", "actionItems": [string], "relatedIssues": [string]}],
  "riskAssessment": {"overallRisk": "high"|"medium"|"low", "summary": string, "criticalItems": [string], "nextSteps": [string]}
}`;
  }

  /**
   * Build prompt for cross-document analysis
   */
  static buildCrossDocumentPrompt(
    chunks: Array<{ content: string; documentName: string }>,
    queryType: 'agreement' | 'contradiction' | 'comprehensive'
  ): string {
    const contextParts = chunks
      .map((c, i) => `Document ${i + 1} (${c.documentName}):\n${c.content}`)
      .join('\n\n---\n\n');

    const truncatedContext = contextParts.substring(0, VALIDATION_CONFIG.PROMPT_MAX_LENGTH);

    const basePrompt = `You are a document comparison expert. Analyze the following documents.

${truncatedContext}

Provide a detailed analysis in JSON format with these fields:
{
  "agreements": [{"statement": string, "sources": [{"documentId": string, "documentName": string, "excerpt": string}], "confidence": "high"|"medium"|"low", "significance": string}],
  "contradictions": [{"claim": string, "evidence": string, "severity": "high"|"medium"|"low", "confidence": "high"|"medium"|"low", "explanation": string, "claimSource": {"documentId": string, "documentName": string, "excerpt": string, "chunkIndex": number}, "evidenceSource": {"documentId": string, "documentName": string, "excerpt": string, "chunkIndex": number}, "impact": string}],
  "recommendations": [{"title": string, "description": string, "priority": "high"|"medium"|"low", "actionItems": [string], "relatedIssues": [string]}],
  "riskAssessment": {"overallRisk": "high"|"medium"|"low", "summary": string, "criticalItems": [string], "nextSteps": [string]}
}`;

    // Adjust prompt based on query type
    if (queryType === 'agreement') {
      return `${basePrompt}\n\nFocus primarily on identifying agreements and alignments between the documents.`;
    }
    if (queryType === 'contradiction') {
      return `${basePrompt}\n\nFocus primarily on identifying contradictions and discrepancies between the documents.`;
    }

    return basePrompt;
  }

  /**
   * Parse AI response safely
   */
  static parseAnalysisResponse(response: string): any {
    try {
      // Extract JSON from response (handles markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse analysis response: ${(error as Error).message}`);
    }
  }
}
