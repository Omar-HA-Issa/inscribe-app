import { useParams } from 'react-router-dom';
import { useValidation } from './hooks/useValidation';
import { ValidationSetup } from './components/ValidationSetup';
import { ValidationResults } from './components/ValidationResults';

export const Validator = () => {
  const { id: currentDocumentId } = useParams<{ id: string }>();

  const {
    currentDocumentName,
    availableDocuments,
    analysisMode,
    selectedDocs,
    loading,
    loadingDocs,
    result,
    error,
    deleteConfirmId,
    hasCachedAnalysis,
    expandedContradictions,
    expandedAgreements,
    expandedIssues,
    setAnalysisMode,
    setSelectedDocs,
    setDeleteConfirmId,
    setExpandedContradictions,
    setExpandedAgreements,
    setExpandedIssues,
    handleAnalyze,
    handleDeleteDocument,
    resetAnalysis,
    toggleExpanded,
  } = useValidation(currentDocumentId);

  if (loadingDocs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Document Validation</h1>
        <p className="text-muted-foreground">Analyze documents for contradictions and inconsistencies</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-muted/30 text-muted-foreground rounded-lg border border-border">
          {error}
        </div>
      )}

      {!result ? (
        <ValidationSetup
          currentDocumentId={currentDocumentId}
          currentDocumentName={currentDocumentName}
          availableDocuments={availableDocuments}
          analysisMode={analysisMode}
          selectedDocs={selectedDocs}
          loading={loading}
          hasCachedAnalysis={hasCachedAnalysis}
          onAnalysisModeChange={setAnalysisMode}
          onSelectedDocsChange={setSelectedDocs}
          onDeleteRequest={setDeleteConfirmId}
          onAnalyze={() => void handleAnalyze()}
        />
      ) : (
        <ValidationResults
          result={result}
          analysisMode={analysisMode}
          currentDocumentName={currentDocumentName}
          expandedContradictions={expandedContradictions}
          expandedAgreements={expandedAgreements}
          expandedIssues={expandedIssues}
          onExpandContradiction={setExpandedContradictions}
          onExpandAgreement={setExpandedAgreements}
          onExpandIssue={setExpandedIssues}
          onReset={resetAnalysis}
          toggleExpanded={toggleExpanded}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-2">Delete Document</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete "{availableDocuments.find(d => d.id === deleteConfirmId)?.file_name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-muted/20 hover:bg-muted/30 text-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleDeleteDocument(deleteConfirmId);
                }}
                className="px-4 py-2 bg-accent text-background rounded-lg transition-colors hover:bg-accent/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
