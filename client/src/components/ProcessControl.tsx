import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConsoleView from "@/components/ConsoleView";
import PreviewModal from "@/components/PreviewModal";
import { useProcessing } from "@/hooks/use-processing";
import { usePreview } from "@/hooks/use-processing";
import { CsvFile, ProcessingStatus, PromptConfigType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, Pause, Play, OctagonMinus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProcessControlProps {
  csvFile: CsvFile;
  promptConfigs: PromptConfigType[];
  status: ProcessingStatus;
  processedRows: number;
  totalRows: number;
}

export default function ProcessControl({
  csvFile,
  promptConfigs,
  status,
  processedRows,
  totalRows,
}: ProcessControlProps) {
  const { toast } = useToast();
  const { 
    startProcessing, 
    pauseProcessing, 
    resumeProcessing, 
    stopProcessing,
    downloadEnrichedCsv,
    isDownloading
  } = useProcessing(csvFile.id);
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  const { 
    previewPrompts, 
    previewData, 
    isPreviewLoading 
  } = usePreview(csvFile.id);

  // Handle preview button click
  const handlePreview = async () => {
    try {
      await previewPrompts(promptConfigs);
      setIsPreviewModalOpen(true);
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "An error occurred during preview",
        variant: "destructive",
      });
    }
  };

  // Calculate progress percentage
  const progressPercentage = totalRows > 0 
    ? Math.round((processedRows / totalRows) * 100) 
    : 0;

  // Determine which processing buttons to show based on current status
  const showStartButton = status === "idle" || status === "completed" || status === "error";
  const showProcessingControls = status === "processing" || status === "paused";
  const showDownloadButton = status === "completed" || 
    (status === "idle" && processedRows > 0);

  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Process Control</h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <Button
                variant="outline"
                className="bg-primary-100 hover:bg-primary-200 text-primary-800 flex items-center space-x-2"
                onClick={handlePreview}
                disabled={isPreviewLoading}
              >
                {isPreviewLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating Preview...</span>
                  </div>
                ) : (
                  <>
                    <Eye size={16} className="mr-2" />
                    <span>Preview (First 3 Rows)</span>
                  </>
                )}
              </Button>
              <p className="text-xs text-neutral-500 mt-1">
                Test your prompts on a small subset before processing the entire file.
              </p>
            </div>
            
            <div className="flex space-x-3">
              {/* Start Button */}
              {showStartButton && (
                <Button
                  className="flex items-center space-x-2"
                  onClick={() => startProcessing(promptConfigs.map(config => config.id || 0))}
                >
                  <Play size={16} className="mr-2" />
                  <span>Start Processing</span>
                </Button>
              )}
              
              {/* Processing Controls and Download Button */}
              <div className="flex space-x-3">
                {showProcessingControls && (
                  <>
                    {status === "processing" ? (
                      <Button
                        variant="outline"
                        className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center space-x-2"
                        onClick={pauseProcessing}
                      >
                        <Pause size={16} className="mr-2" />
                        <span>Pause</span>
                      </Button>
                    ) : (
                      <Button
                        className="flex items-center space-x-2"
                        onClick={resumeProcessing}
                      >
                        <Play size={16} className="mr-2" />
                        <span>Resume</span>
                      </Button>
                    )}
                    
                    <Button
                      variant="destructive"
                      className="flex items-center space-x-2"
                      onClick={stopProcessing}
                    >
                      <OctagonMinus size={16} className="mr-2" />
                      <span>Stop</span>
                    </Button>
                  </>
                )}
                
                {/* Download Button */}
                {showDownloadButton && (
                  <Button
                    variant="outline"
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                    onClick={downloadEnrichedCsv}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Downloading...</span>
                      </div>
                    ) : (
                      <>
                        <Download size={16} className="mr-2" />
                        <span>Download Enriched CSV</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {(status === "processing" || status === "paused" || status === "completed") && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Processing Progress</span>
                <span>
                  {processedRows}/{totalRows} rows
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2.5" />
            </div>
          )}
          
          {/* Console View */}
          <ConsoleView csvFileId={csvFile.id} />
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        previewData={previewData || []}
        isLoading={isPreviewLoading}
        originalHeaders={csvFile.headers}
        outputColumnNames={promptConfigs.map(config => config.outputColumnName)}
      />
    </>
  );
}
