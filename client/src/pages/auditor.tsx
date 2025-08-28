import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Code, 
  Shield, 
  Search, 
  AlertCircle, 
  Lightbulb, 
  Download, 
  Copy, 
  Share, 
  Trash, 
  Save,
  FileText,
  Lock,
  Globe,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { AuditVisibilitySelector } from "@/components/audit-visibility-selector";
import { FileUploader } from "@/components/ui/file-uploader";
import CodeEditor from "@/components/ui/code-editor";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { createAuditSession } from "@/lib/shipable-api";

type AnalysisState = "initial" | "loading" | "streaming" | "completed" | "error";

interface UploadedFiles {
  content: string;
  fileCount: number;
  totalSize: number;
}

interface AuditVisibilityOptions {
  isPublic: boolean;
  title?: string;
  description?: string;
  tags?: string[];
}

export default function AuditorPage() {
  const { user } = useWeb3Auth();
  const { toast } = useToast();
  
  const [contractCode, setContractCode] = useState("");
  const [contractLanguage, setContractLanguage] = useState("solidity");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("initial");
  const [analysisResult, setAnalysisResult] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [auditVisibility, setAuditVisibility] = useState<AuditVisibilityOptions>({
    isPublic: false
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFilesProcessed = useCallback((combinedContent: string, contractLanguage: string, fileInfo: {fileCount: number, totalSize: number}) => {
    const result = {
      content: combinedContent,
      fileCount: fileInfo.fileCount,
      totalSize: fileInfo.totalSize
    };
    setUploadedFiles(result);
    setContractCode(combinedContent);
    setContractLanguage(contractLanguage);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!contractCode.trim()) {
      toast({
        title: "No Contract Code",
        description: "Please paste your smart contract code or upload files before analyzing.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to start an audit.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAnalysisState("loading");
      setAnalysisResult("");
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();

      const sessionResponse = await createAuditSession({
        contractCode,
        contractLanguage,
        userId: user.id,
        isPublic: auditVisibility.isPublic,
        title: auditVisibility.title,
        description: auditVisibility.description,
        tags: auditVisibility.tags
      });

      setCurrentSessionId(sessionResponse.sessionId);
      setAnalysisState("streaming");

      // Start streaming analysis
      const eventSource = new EventSource(`/api/audit/analyze/${sessionResponse.sessionId}`);
      
      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          eventSource.close();
          setAnalysisState("completed");
          return;
        }
        
        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            setAnalysisResult(prev => prev + data.content);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        setAnalysisState("error");
        throw new Error("Analysis stream failed");
      };
      
      // Clean up on abort
      abortControllerRef.current.signal.addEventListener('abort', () => {
        eventSource.close();
      });

      setAnalysisState("completed");
      
      toast({
        title: "Analysis Complete",
        description: "Your smart contract audit has been completed successfully.",
      });

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error("Analysis failed:", error);
      setAnalysisState("error");
      setAnalysisResult(`Error: ${error.message || "Analysis failed. Please try again."}`);
      
      toast({
        title: "Analysis Failed",
        description: error.message || "An error occurred during analysis. Please try again.",
        variant: "destructive",
      });
    }
  }, [contractCode, contractLanguage, user, auditVisibility, toast]);

  const handleClear = useCallback(() => {
    setContractCode("");
    setAnalysisResult("");
    setAnalysisState("initial");
    setUploadedFiles(null);
    setCurrentSessionId(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleCopyReport = useCallback(() => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      toast({
        title: "Copied to Clipboard",
        description: "The audit report has been copied to your clipboard.",
      });
    }
  }, [analysisResult, toast]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-semibold text-foreground">Smart Contract Auditor</h1>
            </div>
            <div className="flex items-center gap-2">
              {analysisState === "streaming" && (
                <Badge variant="secondary" className="animate-pulse">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  Analyzing...
                </Badge>
              )}
              {analysisState === "completed" && (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Complete
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          
          {/* Contract Input Section */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-medium text-foreground">Contract Code</h2>
                </div>
                {contractCode.trim() && (
                  <Badge variant="outline" className="text-sm">
                    {contractCode.split('\n').length} lines • {Math.ceil(contractCode.length / 1000)}k chars
                  </Badge>
                )}
              </div>

              {/* File Upload */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Upload className="h-4 w-4 text-blue-500" />
                    <h3 className="font-medium text-foreground">Upload Files</h3>
                  </div>
                  <FileUploader onFilesProcessed={handleFilesProcessed} />
                  {uploadedFiles && (
                    <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {uploadedFiles.fileCount} files loaded
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <h3 className="font-medium text-foreground">Language</h3>
                  </div>
                  <Select value={contractLanguage} onValueChange={setContractLanguage}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solidity">Solidity</SelectItem>
                      <SelectItem value="vyper">Vyper</SelectItem>
                      <SelectItem value="rust">Rust</SelectItem>
                      <SelectItem value="move">Move</SelectItem>
                      <SelectItem value="cairo">Cairo</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="go">Go</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Code Editor */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Contract Source Code</h3>
                <div className="h-96 bg-muted/30 rounded-lg border border-border overflow-hidden">
                  <CodeEditor
                    value={contractCode}
                    onChange={setContractCode}
                    language={contractLanguage}
                    placeholder={`// Paste your smart contract code here or upload files above
// Supported languages: Solidity, Vyper, Rust, Move, Cairo, and more

pragma solidity ^0.8.19;

contract MyContract {
    // Your contract code will be analyzed for:
    // • Security vulnerabilities
    // • Gas optimization opportunities  
    // • Best practice recommendations
    // • Code quality improvements
}`}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Audit Configuration */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-medium text-foreground">Audit Configuration</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-muted-foreground"
                >
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showAdvanced ? 'Hide' : 'Show'} Settings
                </Button>
              </div>

              <AuditVisibilitySelector
                value={auditVisibility}
                onChange={setAuditVisibility}
                disabled={analysisState === "loading" || analysisState === "streaming"}
              />

              {showAdvanced && (
                <div className="border-t border-border pt-4 space-y-4">
                  {auditVisibility.isPublic && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Audit Title (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., DeFi Token Contract Audit"
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                          value={auditVisibility.title || ''}
                          onChange={(e) => setAuditVisibility(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Brief description of the contract..."
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                          value={auditVisibility.description || ''}
                          onChange={(e) => setAuditVisibility(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Action Panel */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleAnalyze}
              disabled={analysisState === "loading" || analysisState === "streaming" || !contractCode.trim()}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-medium"
              data-testid="button-analyze"
            >
              {analysisState === "loading" || analysisState === "streaming" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Analyzing Contract...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Start Security Analysis
                </>
              )}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClear}
                data-testid="button-clear"
                disabled={!contractCode.trim()}
              >
                <Trash className="h-4 w-4 mr-1" />
                Clear
              </Button>
              
              <Button 
                variant="outline"
                data-testid="button-save"
                disabled={!contractCode.trim()}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    analysisState === "streaming" ? "bg-yellow-500 animate-pulse" : 
                    analysisState === "completed" ? "bg-green-500" : 
                    analysisState === "error" ? "bg-red-500" : "bg-gray-400"
                  }`}></div>
                  <h2 className="text-lg font-medium text-foreground">Security Audit Report</h2>
                </div>
                
                {analysisState === "completed" && (
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Export Report" 
                      data-testid="button-export"
                      className="hover:bg-muted"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Copy to Clipboard"
                      onClick={handleCopyReport}
                      data-testid="button-copy"
                      className="hover:bg-muted"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Share Report" 
                      onClick={() => setShareDialogOpen(true)}
                      data-testid="button-share"
                      disabled={!currentSessionId}
                      className="hover:bg-muted"
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {analysisState === "initial" && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Ready for Analysis</h3>
                  <p className="text-muted-foreground mb-6">
                    Configure your contract above and click "Start Security Analysis" to begin.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
                    <Card className="p-4 text-left">
                      <AlertCircle className="h-5 w-5 text-destructive mb-2" />
                      <div className="font-medium text-foreground mb-1">Vulnerability Detection</div>
                      <div className="text-muted-foreground text-xs">Find critical security issues</div>
                    </Card>
                    <Card className="p-4 text-left">
                      <Lightbulb className="h-5 w-5 text-chart-1 mb-2" />
                      <div className="font-medium text-foreground mb-1">Best Practices</div>
                      <div className="text-muted-foreground text-xs">Code optimization tips</div>
                    </Card>
                  </div>
                </div>
              )}

              {(analysisState === "streaming" || analysisState === "completed" || analysisState === "error") && (
                <div className="bg-muted/30 rounded-lg p-6 min-h-96">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                    {analysisResult || "Starting analysis..."}
                    {analysisState === "streaming" && (
                      <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
                    )}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Audit Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Share this audit report with others or save it for later reference.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentSessionId ? `${window.location.origin}/audit/${currentSessionId}` : ''}
                className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (currentSessionId) {
                    navigator.clipboard.writeText(`${window.location.origin}/audit/${currentSessionId}`);
                    toast({
                      title: "Link Copied",
                      description: "The audit report link has been copied to your clipboard.",
                    });
                  }
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}