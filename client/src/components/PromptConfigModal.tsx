import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PromptConfigType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface PromptConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (promptConfigs: PromptConfigType[]) => void;
  initialPromptConfigs: PromptConfigType[];
  availableHeaders: string[];
}

export function PromptConfigModal({
  isOpen,
  onClose,
  onSave,
  initialPromptConfigs,
  availableHeaders,
}: PromptConfigModalProps) {
  const { toast } = useToast();
  const [promptConfigs, setPromptConfigs] = useState<PromptConfigType[]>([]);
  const [autocompleteState, setAutocompleteState] = useState<{
    show: boolean;
    index: number | null;
    suggestions: string[];
    cursor: number;
    search: string;
  }>({
    show: false,
    index: null,
    suggestions: [],
    cursor: 0,
    search: "",
  });

  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Initialize prompt configs when modal opens
  useEffect(() => {
    if (isOpen) {
      setPromptConfigs(
        initialPromptConfigs.length > 0
          ? initialPromptConfigs
          : [{ promptTemplate: "", outputColumnName: "" }]
      );
      // Reset autocomplete state
      setAutocompleteState({
        show: false,
        index: null,
        suggestions: [],
        cursor: 0,
        search: "",
      });
    }
  }, [isOpen, initialPromptConfigs]);

  // Handle changes to prompt template
  const handlePromptTemplateChange = (index: number, value: string) => {
    const newConfigs = [...promptConfigs];
    newConfigs[index].promptTemplate = value;
    setPromptConfigs(newConfigs);

    // Check for autocomplete trigger
    const cursorPosition = textareaRefs.current[index]?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/\{\{([^}]*)$/);

    if (match) {
      const search = match[1].trim();
      const suggestions = availableHeaders.filter((header) =>
        header.toLowerCase().includes(search.toLowerCase())
      );

      setAutocompleteState({
        show: true,
        index,
        suggestions: search === "" ? availableHeaders : suggestions,
        cursor: 0,
        search,
      });
    } else {
      setAutocompleteState({
        show: false,
        index: null,
        suggestions: [],
        cursor: 0,
        search: "",
      });
    }
  };

  // Handle changes to output column name
  const handleOutputColumnNameChange = (index: number, value: string) => {
    const newConfigs = [...promptConfigs];
    newConfigs[index].outputColumnName = value;
    setPromptConfigs(newConfigs);
  };

  // Add a new prompt configuration
  const handleAddPromptConfig = () => {
    setPromptConfigs([
      ...promptConfigs,
      { promptTemplate: "", outputColumnName: "" },
    ]);
  };

  // Remove a prompt configuration
  const handleRemovePromptConfig = (index: number) => {
    const newConfigs = [...promptConfigs];
    newConfigs.splice(index, 1);
    setPromptConfigs(newConfigs);
  };

  // Select an autocomplete suggestion
  const handleSelectSuggestion = (suggestion: string) => {
    if (autocompleteState.index === null) return;

    const index = autocompleteState.index;
    const textarea = textareaRefs.current[index];
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart || 0;
    const value = textarea.value;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);

    // Find the last "{{" before cursor
    const lastOpenBrace = textBeforeCursor.lastIndexOf("{{");
    if (lastOpenBrace === -1) return;

    // Replace the partial input with the selected suggestion
    const newText =
      textBeforeCursor.substring(0, lastOpenBrace) +
      "{{" +
      suggestion +
      "}}" +
      textAfterCursor;

    const newConfigs = [...promptConfigs];
    newConfigs[index].promptTemplate = newText;
    setPromptConfigs(newConfigs);

    // Hide autocomplete
    setAutocompleteState({
      show: false,
      index: null,
      suggestions: [],
      cursor: 0,
      search: "",
    });

    // Set focus back to textarea and position cursor after the inserted suggestion
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newPosition = lastOpenBrace + suggestion.length + 4; // 4 = "{{" + "}}"
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Validate prompt configurations
  const validatePromptConfigs = () => {
    // Check for empty templates or output column names
    for (let i = 0; i < promptConfigs.length; i++) {
      const config = promptConfigs[i];
      if (!config.promptTemplate.trim()) {
        toast({
          title: "Empty prompt template",
          description: `Prompt template #${i + 1} cannot be empty.`,
          variant: "destructive",
        });
        return false;
      }
      if (!config.outputColumnName.trim()) {
        toast({
          title: "Empty output column name",
          description: `Output column name for prompt #${i + 1} cannot be empty.`,
          variant: "destructive",
        });
        return false;
      }
    }

    // Check for duplicate output column names
    const outputColumnNames = promptConfigs.map(
      (config) => config.outputColumnName
    );
    const duplicates = outputColumnNames.filter(
      (name, index) => outputColumnNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      toast({
        title: "Duplicate output column names",
        description: `Output column names must be unique. Duplicate: ${duplicates[0]}`,
        variant: "destructive",
      });
      return false;
    }

    // Check for conflicts with existing CSV headers
    for (const config of promptConfigs) {
      if (availableHeaders.includes(config.outputColumnName)) {
        toast({
          title: "Column name conflict",
          description: `Output column name '${config.outputColumnName}' conflicts with an existing column in the CSV.`,
          variant: "destructive",
        });
        return false;
      }
    }

    // Check for invalid column placeholders
    for (const config of promptConfigs) {
      const placeholderRegex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = placeholderRegex.exec(config.promptTemplate)) !== null) {
        const columnName = match[1].trim();
        if (!availableHeaders.includes(columnName)) {
          toast({
            title: "Invalid column placeholder",
            description: `Column '${columnName}' does not exist in the CSV file.`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    return true;
  };

  // Save prompt configurations
  const handleSave = () => {
    if (validatePromptConfigs()) {
      onSave(promptConfigs);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Configure Prompts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {promptConfigs.map((config, index) => (
            <div
              key={index}
              className="prompt-config border border-neutral-200 rounded-lg p-4"
            >
              <div className="flex justify-between mb-3">
                <h3 className="font-medium">Prompt Configuration #{index + 1}</h3>
                {promptConfigs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-neutral-500 hover:text-destructive"
                    onClick={() => handleRemovePromptConfig(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>

              <div className="mb-4">
                <Label
                  htmlFor={`output-column-${index}`}
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Output Column Name:
                </Label>
                <Input
                  id={`output-column-${index}`}
                  value={config.outputColumnName}
                  onChange={(e) => handleOutputColumnNameChange(index, e.target.value)}
                  placeholder="E.g., sentiment_analysis"
                  className="w-full p-2 border border-neutral-300 rounded-md"
                />
              </div>

              <div>
                <Label
                  htmlFor={`prompt-template-${index}`}
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Prompt Template:
                </Label>
                <div className="relative">
                  <Textarea
                    id={`prompt-template-${index}`}
                    ref={(el) => (textareaRefs.current[index] = el)}
                    value={config.promptTemplate}
                    onChange={(e) => handlePromptTemplateChange(index, e.target.value)}
                    placeholder="Enter your prompt using {{column_name}} syntax for dynamic data..."
                    className="w-full p-3 border border-neutral-300 rounded-md h-28"
                  />

                  {/* Autocomplete Dropdown */}
                  {autocompleteState.show && autocompleteState.index === index && (
                    <div className="absolute z-10 bg-white border border-neutral-200 rounded-md shadow-md w-full max-w-xs">
                      <div className="p-2 text-sm text-neutral-500 border-b">
                        Available Columns:
                      </div>
                      <div className="py-1 max-h-[150px] overflow-y-auto">
                        {autocompleteState.suggestions.length > 0 ? (
                          autocompleteState.suggestions.map((suggestion, i) => (
                            <div
                              key={i}
                              className={`px-3 py-1 hover:bg-primary-50 cursor-pointer ${
                                i === autocompleteState.cursor
                                  ? "bg-primary-100"
                                  : ""
                              }`}
                              onClick={() => handleSelectSuggestion(suggestion)}
                            >
                              {suggestion}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-1 text-neutral-500">
                            No matching columns
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleAddPromptConfig}
            className="border border-neutral-300 hover:bg-neutral-50 text-neutral-800"
          >
            <Plus size={16} className="mr-2" /> Add Another Prompt
          </Button>
          <div className="space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Prompts</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
