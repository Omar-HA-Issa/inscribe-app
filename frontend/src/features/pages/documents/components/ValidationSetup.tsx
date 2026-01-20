import { FileText } from 'lucide-react';
import type { Document, AnalysisMode } from '../hooks/useValidation';

interface ValidationSetupProps {
  currentDocumentId: string | undefined;
  currentDocumentName: string;
  availableDocuments: Document[];
  analysisMode: AnalysisMode;
  selectedDocs: string[];
  loading: boolean;
  hasCachedAnalysis: boolean;
  onAnalysisModeChange: (mode: AnalysisMode) => void;
  onSelectedDocsChange: (docs: string[]) => void;
  onDeleteRequest: (docId: string) => void;
  onAnalyze: () => void;
}

export function ValidationSetup({
  currentDocumentId,
  currentDocumentName,
  availableDocuments,
  analysisMode,
  selectedDocs,
  loading,
  hasCachedAnalysis,
  onAnalysisModeChange,
  onSelectedDocsChange,
  onDeleteRequest,
  onAnalyze,
}: ValidationSetupProps) {
  return (
    <div className="space-y-8">
      {/* Current Document */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Analyzing</span>
        </div>
        <p className="text-lg font-medium text-foreground">{currentDocumentName || 'Current Document'}</p>
      </div>

      {/* Analysis Mode Selection */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Select Analysis Type</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Within Document */}
          <button
            onClick={() => onAnalysisModeChange('within')}
            className={`text-left p-6 rounded-lg transition-all ${
              analysisMode === 'within'
                ? 'bg-accent/10 border border-accent/30 text-foreground'
                : 'bg-muted/20 hover:bg-muted/30 text-foreground border border-border'
            }`}
          >
            <FileText className="w-6 h-6 mb-3" />
            <h3 className="font-semibold mb-2">Within Document</h3>
            <p className={`text-sm ${analysisMode === 'within' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Find internal contradictions and inconsistencies
            </p>
          </button>

          {/* Across Documents */}
          <button
            onClick={() => onAnalysisModeChange('across')}
            className={`text-left p-6 rounded-lg transition-all ${
              analysisMode === 'across'
                ? 'bg-accent/10 border border-accent/30 text-foreground'
                : 'bg-muted/20 hover:bg-muted/30 text-foreground border border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-6 h-6" />
              <FileText className="w-6 h-6 -ml-3" />
            </div>
            <h3 className="font-semibold mb-2">Compare Documents</h3>
            <p className={`text-sm ${analysisMode === 'across' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Compare with other documents to find differences
            </p>
          </button>
        </div>
      </div>

      {/* Document Selection (for across mode) */}
      {analysisMode === 'across' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Select Documents to Compare</h2>
          <div className="bg-card rounded-xl p-6 space-y-3 shadow-card">
            {availableDocuments
              .filter(doc => doc.id !== currentDocumentId)
              .map(doc => (
                <label
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-muted/20 rounded hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectedDocsChange([...selectedDocs, doc.id]);
                      } else {
                        onSelectedDocsChange(selectedDocs.filter(id => id !== doc.id));
                      }
                    }}
                    className="w-4 h-4 text-accent rounded focus:ring-accent bg-muted border-border"
                  />
                  <span className="text-foreground flex-1">{doc.file_name}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDeleteRequest(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </label>
              ))}
          </div>
        </div>
      )}

      {/* Analyze Button */}
      {analysisMode && (analysisMode === 'within' || selectedDocs.length > 0) && (
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {hasCachedAnalysis ? 'Loading...' : 'Analyzing...'}
            </span>
          ) : (
            hasCachedAnalysis ? 'Load Analysis' : 'Start Analysis'
          )}
        </button>
      )}
    </div>
  );
}
