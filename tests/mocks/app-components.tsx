import React from 'react';

// Mock ConsoleView component
function ConsoleView({ csvFileId }: { csvFileId: number }) {
  return <div data-testid="mock-console-view">Console for CSV ID: {csvFileId}</div>;
}

// Mock PreviewModal component
function MockPreviewModal({
  isOpen,
  onClose,
  previewData,
  isLoading,
  originalHeaders,
  outputColumnNames
}: {
  isOpen: boolean;
  onClose: () => void;
  previewData: any[];
  isLoading: boolean;
  originalHeaders: string[];
  outputColumnNames: string[];
}) {
  if (!isOpen) return null;
  
  return (
    <div data-testid="mock-preview-modal">
      <div>Preview Modal: {isLoading ? 'Loading...' : `${previewData.length} rows`}</div>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

// Default exports
export default ConsoleView;
export { MockPreviewModal as PreviewModal };