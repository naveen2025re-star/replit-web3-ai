import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileData {
  name: string;
  content: string;
  size: number;
}

interface FileUploaderProps {
  onFilesProcessed: (combinedContent: string, contractLanguage: string, fileInfo: {fileCount: number, totalSize: number}) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

export function FileUploader({ onFilesProcessed, maxFiles = 10, maxFileSize = 1024 * 1024 }: FileUploaderProps) {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const newFiles: FileData[] = [];

    for (const file of selectedFiles) {
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${Math.round(maxFileSize / 1024)}KB limit`,
          variant: "destructive"
        });
        continue;
      }

      try {
        const content = await readFileAsText(file);
        newFiles.push({
          name: file.name,
          content,
          size: file.size
        });
      } catch (error) {
        toast({
          title: "File read error",
          description: `Failed to read ${file.name}`,
          variant: "destructive"
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    setIsUploading(false);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to process",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        throw new Error('Failed to process files');
      }

      const result = await response.json();
      onFilesProcessed(result.combinedContent, result.contractLanguage, {
        fileCount: result.fileCount,
        totalSize: result.totalSize
      });

      toast({
        title: "Files processed successfully",
        description: `${result.fileCount} files combined for analysis`
      });

      setFiles([]);
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to process uploaded files",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  const getFileLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'sol': return 'Solidity';
      case 'rs': return 'Rust';
      case 'go': return 'Go';
      case 'js': case 'ts': return 'JavaScript/TypeScript';
      case 'py': return 'Python';
      case 'vy': return 'Vyper';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Upload Contract Files</h3>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".sol,.rs,.go,.js,.ts,.py,.vy,.txt"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || files.length >= maxFiles}
            data-testid="button-select-files"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Processing..." : "Select Files"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Supported: .sol, .rs, .go, .js, .ts, .py, .vy files
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} files, {Math.round(maxFileSize / 1024)}KB each
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Selected Files</span>
              <Badge variant="secondary" data-testid="text-file-count">
                {files.length} files
              </Badge>
            </div>
            
            <ScrollArea className="h-48 border rounded-lg p-2">
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    data-testid={`file-item-${index}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getFileLanguage(file.name)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleProcess}
                disabled={files.length === 0}
                data-testid="button-process-files"
              >
                Process Files for Analysis
              </Button>
              <span className="text-xs text-muted-foreground">
                Total: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
              </span>
            </div>
          </div>
        )}

        {files.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Upload multiple contract files to combine them for comprehensive analysis</span>
          </div>
        )}
      </div>
    </Card>
  );
}