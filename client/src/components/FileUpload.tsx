import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  
  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    validateAndUploadFile(file);
  };
  
  // Validate the file type and size
  const validateAndUploadFile = (file: File) => {
    // Check file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Pass the file to the parent component
    onFileUpload(file);
  };
  
  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUploadFile(e.dataTransfer.files[0]);
    }
  };
  
  return (
    <Card className="mb-6">
      <CardContent className="p-8">
        <h2 className="text-xl font-semibold mb-4">Upload Your CSV File</h2>
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? "border-primary bg-primary-50" 
              : "border-neutral-300"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="mx-auto mb-4 text-neutral-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M8 13h2"></path>
              <path d="M8 17h2"></path>
              <path d="M14 13h2"></path>
              <path d="M14 17h2"></path>
            </svg>
          </div>
          <p className="mb-4 text-neutral-600">
            Drag and drop your CSV file here, or click to browse
          </p>
          <input 
            type="file" 
            id="csv-file-input" 
            className="hidden" 
            accept=".csv" 
            onChange={handleFileChange}
          />
          <Button 
            className="px-6 py-2" 
            onClick={() => document.getElementById("csv-file-input")?.click()}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              "Browse Files"
            )}
          </Button>
        </div>
        <div className="mt-4 text-sm text-neutral-500">
          <p>Supported file: CSV format only. Max file size: 10MB</p>
        </div>
      </CardContent>
    </Card>
  );
}
