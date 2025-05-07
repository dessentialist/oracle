import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ConsoleMessage, ProcessingStatus, PromptConfigType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Hook for preview functionality
export function usePreview(csvFileId?: number) {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<Record<string, any>[] | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (promptConfigs: PromptConfigType[]) => {
      if (!csvFileId) throw new Error("CSV file ID is required");

      const response = await apiRequest("POST", "/api/preview", {
        csvFileId,
        promptConfigs,
        numRows: 3,
      });

      return response.json();
    },
    onSuccess: (data) => {
      setPreviewData(data.previewData);
    },
    onError: (error) => {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Failed to generate preview",
        variant: "destructive",
      });
    },
  });

  const previewPrompts = async (promptConfigs: PromptConfigType[]) => {
    await previewMutation.mutateAsync(promptConfigs);
  };

  return {
    previewPrompts,
    previewData,
    isPreviewLoading: previewMutation.isPending,
  };
}

// Hook for processing functionality
export function useProcessing(csvFileId?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);

  // Get current processing status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: csvFileId ? [`/api/process/${csvFileId}`] : null,
    enabled: !!csvFileId,
    refetchInterval: (data) => {
      // Polling interval depends on the current status
      if (!data) return false;
      if (data.status === "processing") return 2000;
      return false;
    },
  });

  // Mutation for starting/pausing/resuming/stopping processing
  const processingMutation = useMutation({
    mutationFn: async ({
      action,
      promptConfigIds,
    }: {
      action: "start" | "pause" | "resume" | "stop";
      promptConfigIds?: number[];
    }) => {
      if (!csvFileId) throw new Error("CSV file ID is required");

      const response = await apiRequest("POST", "/api/process", {
        csvFileId,
        promptConfigIds: promptConfigIds || [],
        action,
      });

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/process/${csvFileId}`] });
      
      let actionText = "";
      switch (variables.action) {
        case "start":
          actionText = "started";
          break;
        case "pause":
          actionText = "paused";
          break;
        case "resume":
          actionText = "resumed";
          break;
        case "stop":
          actionText = "stopped";
          break;
      }
      
      toast({
        title: `Processing ${actionText}`,
        description: `The processing has been ${actionText} successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Processing action failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Start processing
  const startProcessing = (promptConfigIds: number[]) => {
    processingMutation.mutate({ action: "start", promptConfigIds });
  };

  // Pause processing
  const pauseProcessing = () => {
    processingMutation.mutate({ action: "pause" });
  };

  // Resume processing
  const resumeProcessing = () => {
    processingMutation.mutate({ action: "resume" });
  };

  // Stop processing
  const stopProcessing = () => {
    processingMutation.mutate({ action: "stop" });
  };

  // Download enriched CSV
  const downloadEnrichedCsv = async () => {
    if (!csvFileId) {
      toast({
        title: "Download failed",
        description: "CSV file ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);
      const response = await fetch(`/api/download/${csvFileId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download enriched CSV");
      }

      // Get the file name from the Content-Disposition header if available
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `enriched_csv_${csvFileId}.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create a blob from the response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download successful",
        description: `The enriched CSV file has been downloaded as ${filename}.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download enriched CSV",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    status: statusData?.status || "idle",
    processedRows: statusData?.processedRows || 0,
    totalRows: statusData?.totalRows || 0,
    isStatusLoading: statusLoading,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    stopProcessing,
    downloadEnrichedCsv,
    isDownloading,
    isProcessing: processingMutation.isPending,
  };
}

// Hook for console messages
export function useConsoleMessages(csvFileId?: number) {
  const queryClient = useQueryClient();

  // Get console messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: csvFileId ? [`/api/console/${csvFileId}`] : null,
    enabled: !!csvFileId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Clear console messages
  const clearConsoleMutation = useMutation({
    mutationFn: async () => {
      if (!csvFileId) throw new Error("CSV file ID is required");

      const response = await apiRequest("POST", `/api/console/${csvFileId}/clear`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/console/${csvFileId}`] });
    },
  });

  return {
    messages: messagesData?.messages || [],
    isLoading,
    clearConsole: () => clearConsoleMutation.mutate(),
    isClearing: clearConsoleMutation.isPending,
  };
}
