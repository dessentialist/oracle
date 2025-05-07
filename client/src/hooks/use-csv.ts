import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CsvFile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function useCsv() {
  const { toast } = useToast();
  const [csvFile, setCsvFile] = useState<CsvFile | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<CsvFile> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload CSV file");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setCsvFile(data);
      toast({
        title: "CSV file uploaded",
        description: `Successfully loaded ${data.filename} with ${data.rowCount} rows and ${data.headers.length} columns.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload CSV file",
        variant: "destructive",
      });
    },
  });

  const uploadCsv = (file: File) => {
    uploadMutation.mutate(file);
  };

  const clearCsvFile = () => {
    setCsvFile(null);
  };

  return {
    csvFile,
    csvFileLoading: uploadMutation.isPending,
    uploadCsv,
    clearCsvFile,
  };
}
