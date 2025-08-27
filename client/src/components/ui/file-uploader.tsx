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
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Upload Contract Files</h3>
            <p className="text-xs text-muted-foreground">Drag & drop or select multiple files</p>
          </div>
        </div>

        <div className="border-2 border-dashed border-primary/30 bg-card/50 hover:bg-card/80 transition-colors rounded-lg p-8 text-center group cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".sol,.rs,.go,.js,.ts,.py,.vy,.txt"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading || files.length >= maxFiles}
                data-testid="button-select-files"
                className="pointer-events-none"
              >
                {isUploading ? "Processing..." : "Select Files"}
              </Button>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                .sol .rs .go .js .ts .py .vy • Max {maxFiles} files • {Math.round(maxFileSize / 1024)}KB each
              </p>
            </div>
          </div>
        </div>

      </div>

      {files.length > 0 && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Selected Files</span>
              </div>
              <Badge variant="secondary" data-testid="text-file-count">
                {files.length} files
              </Badge>
            </div>
            
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                    data-testid={`file-item-${index}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-1.5 bg-primary/10 rounded">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
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
                      className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="text-xs text-muted-foreground">
                Total: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
              </div>
              <Button
                onClick={handleProcess}
                disabled={files.length === 0}
                data-testid="button-process-files"
                className="bg-primary hover:bg-primary/90"
              >
                <Upload className="h-4 w-4 mr-2" />
                Process Files for Analysis
              </Button>
            </div>
          </div>
        </Card>
      )}

      {files.length === 0 && (
        <div className="bg-card/50 border border-border/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Pro Tip</p>
              <p className="text-sm text-muted-foreground">
                Upload multiple contract files to combine them for comprehensive analysis across your entire project
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}