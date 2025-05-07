import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: Record<string, any>[];
  isLoading: boolean;
  originalHeaders: string[];
  outputColumnNames: string[];
}

export default function PreviewModal({
  isOpen,
  onClose,
  previewData,
  isLoading,
  originalHeaders,
  outputColumnNames,
}: PreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Preview Results (First 3 Rows)
          </DialogTitle>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-10">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
            <p className="text-neutral-600">Processing preview data...</p>
          </div>
        )}

        {/* Results table */}
        {!isLoading && previewData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-neutral-200 text-sm">
              <thead>
                <tr className="bg-neutral-100">
                  {/* Original columns */}
                  {originalHeaders.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 border-b border-r border-neutral-200 text-left"
                    >
                      {header}
                    </th>
                  ))}

                  {/* Results columns */}
                  {outputColumnNames.map((header, index) => (
                    <th
                      key={`output-${index}`}
                      className={`px-4 py-2 border-b border-r border-neutral-200 text-left bg-primary-50 text-primary-800 ${
                        index === outputColumnNames.length - 1 ? "border-r-0" : ""
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIndex) => (
                  <tr
                    key={`row-${rowIndex}`}
                    className={`border-b border-neutral-200 hover:bg-neutral-50 ${
                      rowIndex === previewData.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    {/* Original column data */}
                    {originalHeaders.map((header) => (
                      <td
                        key={`${rowIndex}-${header}`}
                        className="px-4 py-3 border-r border-neutral-200 align-top"
                      >
                        {typeof row[header] === 'string' 
                          ? row[header] 
                          : JSON.stringify(row[header])}
                      </td>
                    ))}

                    {/* Results column data */}
                    {outputColumnNames.map((header, colIndex) => (
                      <td
                        key={`${rowIndex}-output-${colIndex}`}
                        className={`px-4 py-3 border-r border-neutral-200 align-top bg-primary-50 ${
                          colIndex === outputColumnNames.length - 1 ? "border-r-0" : ""
                        }`}
                      >
                        {typeof row[header] === 'string' 
                          ? row[header] 
                          : JSON.stringify(row[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No data state */}
        {!isLoading && previewData.length === 0 && (
          <div className="text-center py-10">
            <p className="text-neutral-600">No preview data available.</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close Preview</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
