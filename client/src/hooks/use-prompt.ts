import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PromptConfigType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function usePrompt(csvFileId?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch prompt configurations for a CSV file
  const { data: promptConfigs, isLoading: promptConfigsLoading } = useQuery({
    queryKey: csvFileId ? [`/api/prompts/${csvFileId}`] : null,
    enabled: !!csvFileId,
  });

  // Save prompt configurations
  const savePromptConfigsMutation = useMutation({
    mutationFn: async (configs: PromptConfigType[]) => {
      if (!csvFileId) throw new Error("CSV file ID is required");

      const response = await apiRequest("POST", "/api/prompts", {
        csvFileId,
        promptConfigs: configs,
      });

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/prompts/${csvFileId}`] });
      toast({
        title: "Prompts saved",
        description: "Your prompt configurations have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save prompts",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Get autocomplete suggestions for column names
  const getAutocompleteSuggestions = async (partial: string): Promise<string[]> => {
    if (!csvFileId) return [];

    try {
      const response = await fetch(`/api/autocomplete?csvFileId=${csvFileId}&partial=${encodeURIComponent(partial)}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get autocomplete suggestions");
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error("Autocomplete error:", error);
      return [];
    }
  };

  return {
    promptConfigs: promptConfigs?.promptConfigs,
    promptConfigsLoading,
    savePromptConfigs: (configs: PromptConfigType[]) => savePromptConfigsMutation.mutate(configs),
    isSaving: savePromptConfigsMutation.isPending,
    getAutocompleteSuggestions,
  };
}
