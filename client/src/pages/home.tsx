import { useEffect, useState } from "react";
import FileUpload from "@/components/FileUpload";
import FileInfo from "@/components/FileInfo";
import PromptConfig from "@/components/PromptConfig";
import ProcessControl from "@/components/ProcessControl";
import { useCsv } from "@/hooks/use-csv";
import { usePrompt } from "@/hooks/use-prompt";
import { useProcessing } from "@/hooks/use-processing";

export default function Home() {
  const { csvFile, csvFileLoading, uploadCsv, clearCsvFile } = useCsv();
  const { promptConfigs, promptConfigsLoading, savePromptConfigs } = usePrompt(csvFile?.id);
  const { status, processedRows, totalRows } = useProcessing(csvFile?.id);
  
  // State to control which sections are visible
  const [showFileInfo, setShowFileInfo] = useState(false);
  const [showPromptConfig, setShowPromptConfig] = useState(false);
  const [showProcessControl, setShowProcessControl] = useState(false);

  // Update visibility when data changes
  useEffect(() => {
    if (csvFile) {
      setShowFileInfo(true);
      setShowPromptConfig(true);
    } else {
      setShowFileInfo(false);
      setShowPromptConfig(false);
      setShowProcessControl(false);
    }
  }, [csvFile]);

  useEffect(() => {
    if (promptConfigs && promptConfigs.length > 0) {
      setShowProcessControl(true);
    }
  }, [promptConfigs]);

  // Handle changing the file
  const handleChangeFile = () => {
    clearCsvFile();
    setShowFileInfo(false);
    setShowPromptConfig(false);
    setShowProcessControl(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Section */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 flex items-center">
          <span className="text-primary mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
          </span>
          Oracle
          <span className="ml-2 text-sm bg-primary-100 text-primary-800 px-2 py-1 rounded-md">
            CSV Enrichment with LLM
          </span>
        </h1>
        <p className="text-neutral-600 mt-2">
          Upload a CSV file, configure prompts using column data, and enrich your dataset with LLM-generated insights.
        </p>
      </header>

      {/* Main Content Area */}
      <main>
        {/* File Upload Section */}
        {!showFileInfo && (
          <FileUpload 
            onFileUpload={uploadCsv} 
            isLoading={csvFileLoading} 
          />
        )}

        {/* File Info Section */}
        {showFileInfo && csvFile && (
          <FileInfo 
            csvFile={csvFile} 
            onChangeFile={handleChangeFile} 
          />
        )}

        {/* Prompts Config Section */}
        {showPromptConfig && csvFile && (
          <PromptConfig 
            csvFile={csvFile}
            promptConfigs={promptConfigs || []} 
            isLoading={promptConfigsLoading}
            onSavePromptConfigs={savePromptConfigs}
          />
        )}

        {/* Process Control Section */}
        {showProcessControl && csvFile && promptConfigs && promptConfigs.length > 0 && (
          <ProcessControl 
            csvFile={csvFile}
            promptConfigs={promptConfigs}
            status={status}
            processedRows={processedRows}
            totalRows={totalRows}
          />
        )}
      </main>
    </div>
  );
}
