/**
 * Insight entity representing AI-generated insights about documents
 */
export class Insight {
  constructor(
    public id: string,
    public documentId: string | null,
    public userId: string,
    public title: string,
    public description: string,
    public category: InsightCategory,
    public confidence: number,
    public evidence: string[],
    public impact: string | null,
    public createdAt: Date,
    public isCompare: boolean = false,
    public relatedDocuments: string[] = []
  ) {}

  /**
   * Check if insight is high confidence
   */
  isHighConfidence(): boolean {
    return this.confidence >= 0.8;
  }

  /**
   * Convert to DTO for API responses
   */
  toDTO() {
    return {
      id: this.id,
      documentId: this.documentId,
      userId: this.userId,
      title: this.title,
      description: this.description,
      category: this.category,
      confidence: this.confidence,
      evidence: this.evidence,
      impact: this.impact,
      createdAt: this.createdAt.toISOString(),
      isCompare: this.isCompare,
      relatedDocuments: this.relatedDocuments,
    };
  }
}

export type InsightCategory = 'Pattern' | 'Anomaly' | 'Opportunity' | 'Risk';

/**
 * DTO for creating an insight
 */
export interface CreateInsightDTO {
  documentId?: string | null;
  userId: string;
  title: string;
  description: string;
  category: InsightCategory;
  confidence: number;
  evidence: string[];
  impact?: string;
  isCompare?: boolean;
  relatedDocuments?: string[];
}
