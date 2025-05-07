import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PromptConfigModal } from "@/components/PromptConfigModal";
import { CsvFile, PromptConfigType } from "@/lib/types";
import { Loader2, Pencil, Trash2 } from "lucide-react";

interface PromptConfigProps {
  csvFile: CsvFile;
  promptConfigs: PromptConfigType[];
  isLoading: boolean;
  onSavePromptConfigs: (configs: PromptConfigType[]) => void;
}

export default function PromptConfig({
  csvFile,
  promptConfigs,
  isLoading,
  onSavePromptConfigs,
}: PromptConfigProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editablePromptConfigs, setEditablePromptConfigs] = useState<PromptConfigType[]>([]);

  // Open the modal for configuring prompts
  const handleOpenModal = () => {
    setEditablePromptConfigs(promptConfigs.length > 0 ? [...promptConfigs] : [{ 
      promptTemplate: "", 
      outputColumnName: "" 
    }]);
    setIsModalOpen(true);
  };

  // Handle modal close without saving
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handle saving prompt configurations
  const handleSavePromptConfigs = (configs: PromptConfigType[]) => {
    onSavePromptConfigs(configs);
    setIsModalOpen(false);
  };

  // Handle editing a specific prompt
  const handleEditPrompt = (index: number) => {
    setEditablePromptConfigs([...promptConfigs]);
    setIsModalOpen(true);
  };

  // Handle removing a specific prompt
  const handleRemovePrompt = (index: number) => {
    const newConfigs = [...promptConfigs];
    newConfigs.splice(index, 1);
    onSavePromptConfigs(newConfigs);
  };

  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Configure Prompts</h2>
            <Button 
              onClick={handleOpenModal}
              className="flex items-center space-x-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <span>Configure Prompts</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"></path>
                  </svg>
                </>
              )}
            </Button>
          </div>

          {/* Display when no prompts are configured */}
          {promptConfigs.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-lg">
              <p className="text-neutral-500">
                No prompts configured yet. Click "Configure Prompts" to get started.
              </p>
            </div>
          )}

          {/* Display configured prompts */}
          {promptConfigs.length > 0 && (
            <div>
              <div className="mb-4">
                <p className="text-neutral-600 mb-2">
                  The following prompts will be used to enrich your CSV data:
                </p>
              </div>
              <div className="space-y-4">
                {promptConfigs.map((prompt, index) => (
                  <div key={index} className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium">
                          Output Column: <span className="text-primary-700">{prompt.outputColumnName}</span>
                        </h3>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-neutral-500 hover:text-neutral-700"
                          onClick={() => handleEditPrompt(index)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-neutral-500 hover:text-destructive"
                          onClick={() => handleRemovePrompt(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-neutral-600 bg-white p-3 rounded border border-neutral-200">
                        {prompt.promptTemplate}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt configuration modal */}
      <PromptConfigModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePromptConfigs}
        initialPromptConfigs={editablePromptConfigs}
        availableHeaders={csvFile.headers}
      />
    </>
  );
}
