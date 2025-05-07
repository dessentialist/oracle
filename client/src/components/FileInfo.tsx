import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CsvFile } from "@/lib/types";

interface FileInfoProps {
  csvFile: CsvFile;
  onChangeFile: () => void;
}

export default function FileInfo({ csvFile, onChangeFile }: FileInfoProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">File Information</h2>
            <div className="mt-3 space-y-2">
              <p>
                <span className="text-neutral-500">Filename:</span>{" "}
                <span className="font-medium">{csvFile.filename}</span>{" "}
                {csvFile.size && (
                  <span className="text-xs bg-neutral-100 px-2 py-1 rounded text-neutral-500">
                    {formatFileSize(csvFile.size)}
                  </span>
                )}
              </p>
              <p>
                <span className="text-neutral-500">Columns:</span>{" "}
                <span className="font-medium">{csvFile.headers.length}</span>
              </p>
              <p>
                <span className="text-neutral-500">Rows:</span>{" "}
                <span className="font-medium">{csvFile.rowCount}</span>
              </p>
              <div>
                <span className="text-neutral-500">Headers:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {csvFile.headers.map((header) => (
                    <span
                      key={header}
                      className="bg-primary-100 text-primary-800 text-sm px-2 py-1 rounded-md"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <Button
              variant="outline"
              className="text-primary-600 border-primary-300 hover:bg-primary-50"
              onClick={onChangeFile}
            >
              Change File
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / 1048576).toFixed(1) + " MB";
}
