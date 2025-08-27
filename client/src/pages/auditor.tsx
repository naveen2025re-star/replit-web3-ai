import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Code, Upload, Search, Trash, Save, History, Settings, User, Download, Copy, Share, CheckCircle, AlertCircle, TriangleAlert, Info, Lightbulb, Wallet, Github } from "lucide-react";
import CodeEditor from "@/components/ui/code-editor";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import ResizablePanes from "@/components/ui/resizable-panes";
import { WalletConnect } from "@/components/ui/wallet-connect";
import { AuditHistory } from "@/components/ui/audit-history";
import { FileUploader } from "@/components/ui/file-uploader";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { useLocation } from "wouter";
import { useDisconnect } from "wagmi";
import { createAuditSession, analyzeContract } from "@/lib/shipable-api";

type AnalysisState = "initial" | "loading" | "streaming" | "completed" | "error";

interface VulnerabilityCount {
  high: number;
  medium: number;
  low: number;
  info: number;
}

export default function Auditor() {
  const [contractCode, setContractCode] = useState("");
  const [contractLanguage, setContractLanguage] = useState("solidity");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("initial");
  const [auditReport, setAuditReport] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [vulnerabilityStats, setVulnerabilityStats] = useState<VulnerabilityCount | null>(null);
  const [securityScore, setSecurityScore] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("audit");
  const [uploadedFiles, setUploadedFiles] = useState<{fileCount: number, totalSize: number} | null>(null);
  const { toast } = useToast();
  const { user, isConnected, isAuthenticated } = useWeb3Auth();
  const [, setLocation] = useLocation();
  const { disconnect } = useDisconnect();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleAnalyze = async () => {
    if (!contractCode.trim()) {
      toast({
        title: "No contract code",
        description: "Please enter smart contract code or upload files to analyze",
        variant: "destructive",
      });
      return;
    }

    try {
      setAnalysisState("loading");
      setAuditReport("");
      setVulnerabilityStats(null);
      setSecurityScore(null);

      // Create session
      const sessionResponse = await createAuditSession({
        contractCode,
        contractLanguage,
        userId: user?.id,
      });

      setCurrentSessionId(sessionResponse.sessionId);
      setAnalysisState("streaming");

      // Start analysis with SSE
      const eventSource = new EventSource(`/api/audit/analyze/${sessionResponse.sessionId}`);
      eventSourceRef.current = eventSource;

      let accumulatedContent = "";

      eventSource.addEventListener("content", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.body) {
            accumulatedContent += data.body;
            setAuditReport(accumulatedContent);
          }
        } catch (e) {
          console.error("Error parsing content event:", e);
        }
      });

      eventSource.addEventListener("complete", (event) => {
        setAnalysisState("completed");
        eventSource.close();
        
        // Extract vulnerability stats from the report (simple pattern matching)
        const highMatches = accumulatedContent.match(/high\s+risk|critical/gi);
        const mediumMatches = accumulatedContent.match(/medium\s+risk|moderate/gi);
        const lowMatches = accumulatedContent.match(/low\s+risk|minor/gi);
        const infoMatches = accumulatedContent.match(/informational|best\s+practice/gi);
        
        setVulnerabilityStats({
          high: highMatches ? Math.min(highMatches.length, 10) : 0,
          medium: mediumMatches ? Math.min(mediumMatches.length, 10) : 0,
          low: lowMatches ? Math.min(lowMatches.length, 10) : 0,
          info: infoMatches ? Math.min(infoMatches.length, 10) : 0,
        });
        
        // Calculate a simple security score
        const totalIssues = (highMatches?.length || 0) * 3 + (mediumMatches?.length || 0) * 2 + (lowMatches?.length || 0);
        const score = Math.max(1, Math.min(10, 10 - totalIssues * 0.5));
        setSecurityScore(Math.round(score * 10) / 10);
        
        toast({
          title: "Analysis completed",
          description: "Smart contract security audit finished successfully",
        });
      });

      eventSource.addEventListener("error", (event) => {
        try {
          const data = JSON.parse(event.data);
          setAnalysisState("error");
          eventSource.close();
          toast({
            title: "Analysis failed",
            description: data.message || "An error occurred during analysis",
            variant: "destructive",
          });
        } catch (e) {
          setAnalysisState("error");
          eventSource.close();
          toast({
            title: "Connection error",
            description: "Lost connection to the analysis service",
            variant: "destructive",
          });
        }
      });

      eventSource.onerror = () => {
        setAnalysisState("error");
        eventSource.close();
        toast({
          title: "Connection error",
          description: "Lost connection to the analysis service",
          variant: "destructive",
        });
      };

    } catch (error) {
      setAnalysisState("error");
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setContractCode("");
    setAuditReport("");
    setAnalysisState("initial");
    setVulnerabilityStats(null);
    setSecurityScore(null);
    setCurrentSessionId(null);
    setUploadedFiles(null);
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  };

  const handleFilesProcessed = (combinedContent: string, detectedLanguage: string, fileInfo: {fileCount: number, totalSize: number}) => {
    setContractCode(combinedContent);
    setContractLanguage(detectedLanguage);
    setUploadedFiles(fileInfo);
    toast({
      title: "Files loaded successfully",
      description: `${fileInfo.fileCount} contract files combined for analysis`
    });
  };

  const handleCopyReport = async () => {
    if (auditReport) {
      await navigator.clipboard.writeText(auditReport);
      toast({
        title: "Copied to clipboard",
        description: "Audit report has been copied to your clipboard",
      });
    }
  };

  const leftPanel = (
    <div className="flex flex-col h-full bg-card">
      {/* Clean Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">SmartAudit AI</h1>
              <p className="text-xs text-muted-foreground">Contract Security Analysis</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              disconnect();
              setLocation("/auth");
            }}
            className="text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="p-6 border-b border-border">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-4 w-4 text-blue-500" />
            <h2 className="font-medium text-foreground">Upload Files</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload multiple contract files for comprehensive analysis
          </p>
        </div>
        <FileUploader onFilesProcessed={handleFilesProcessed} />
        {uploadedFiles && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {uploadedFiles.fileCount} files ready for analysis
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Code Editor Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Code className="h-4 w-4 text-blue-500" />
            <h2 className="font-medium text-foreground">Smart Contract Code</h2>
          </div>
          <div className="flex items-center justify-between">
            <Select value={contractLanguage} onValueChange={setContractLanguage}>
              <SelectTrigger className="w-36 h-9">
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
            {contractCode.trim() && (
              <Badge variant="outline" className="text-xs">
                {contractCode.split('\n').length} lines
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-6 pt-4">
          <div className="h-full bg-muted/50 rounded-xl border-2 border-dashed border-border overflow-hidden">
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
      
      {/* Action Panel */}
      <div className="border-t border-border p-6 bg-muted/50">
        <Button 
          onClick={handleAnalyze}
          disabled={analysisState === "loading" || analysisState === "streaming" || !contractCode.trim()}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          data-testid="button-analyze"
        >
          {analysisState === "loading" || analysisState === "streaming" ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Start Security Analysis
            </>
          )}
        </Button>
        
        <div className="flex gap-3 mt-3">
          <Button 
            variant="outline" 
            onClick={handleClear}
            data-testid="button-clear"
            className="flex-1 h-10 text-muted-foreground border-border hover:bg-muted"
            disabled={!contractCode.trim()}
          >
            <Trash className="h-4 w-4 mr-1" />
            Clear
          </Button>
          
          <Button 
            variant="outline"
            data-testid="button-save"
            className="flex-1 h-10 text-muted-foreground border-border hover:bg-muted"
            disabled={!contractCode.trim()}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
        
        {contractCode.trim() && (
          <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contract ready</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{contractCode.split('\n').length} lines</span>
                <span>{Math.ceil(contractCode.length / 1000)}k chars</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const rightPanel = (
    <div className="flex flex-col h-full bg-card">
      {/* Results Header */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${analysisState === "streaming" ? "bg-yellow-500 animate-pulse" : analysisState === "completed" ? "bg-green-500" : analysisState === "error" ? "bg-red-500" : "bg-gray-400"}`}></div>
            <Shield className="h-5 w-5 text-chart-1" />
            <h2 className="text-lg font-semibold text-foreground">Security Audit Report</h2>
            {analysisState === "streaming" && (
              <Badge variant="secondary" className="animate-pulse">
                Analyzing...
              </Badge>
            )}
            {analysisState === "completed" && (
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              title="Export Report" 
              data-testid="button-export"
              disabled={analysisState !== "completed"}
              className="hover:bg-muted border border-border/50 hover:border-border"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              title="Copy to Clipboard"
              onClick={handleCopyReport}
              data-testid="button-copy"
              disabled={analysisState !== "completed"}
              className="hover:bg-muted border border-border/50 hover:border-border"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              title="Share Report" 
              data-testid="button-share"
              disabled={analysisState !== "completed"}
              className="hover:bg-muted border border-border/50 hover:border-border"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-y-auto">
        {analysisState === "initial" && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Ready for Analysis</h3>
              <p className="text-muted-foreground max-w-md">
                Paste your smart contract code on the left and click "Start Security Audit" to begin the analysis process.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                <Card className="p-4">
                  <AlertCircle className="h-5 w-5 text-destructive mb-2" />
                  <div className="font-medium text-foreground">Vulnerability Detection</div>
                  <div className="text-muted-foreground text-xs">Find security issues</div>
                </Card>
                <Card className="p-4">
                  <Lightbulb className="h-5 w-5 text-chart-1 mb-2" />
                  <div className="font-medium text-foreground">Best Practices</div>
                  <div className="text-muted-foreground text-xs">Code optimization</div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {analysisState === "loading" && (
          <div className="h-full p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
                <span className="text-foreground font-medium">Analyzing Smart Contract...</span>
              </div>
              <div className="text-sm text-muted-foreground">This may take a few moments</div>
            </div>
            
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-chart-1" />
                  <span className="text-sm text-foreground">Session initialized</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-foreground">Parsing contract code...</span>
                </div>
              </Card>
              <Card className="p-4 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-muted-foreground rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Running security analysis...</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {(analysisState === "streaming" || analysisState === "completed") && (
          <div className="p-6">
            {/* Summary Cards */}
            {vulnerabilityStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="p-4">
                  <div className="text-2xl font-bold text-destructive" data-testid="text-high-risk">
                    {vulnerabilityStats.high}
                  </div>
                  <div className="text-sm text-muted-foreground">High Risk</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-yellow-500" data-testid="text-medium-risk">
                    {vulnerabilityStats.medium}
                  </div>
                  <div className="text-sm text-muted-foreground">Medium Risk</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-blue-500" data-testid="text-low-risk">
                    {vulnerabilityStats.low}
                  </div>
                  <div className="text-sm text-muted-foreground">Low Risk</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-chart-1" data-testid="text-security-score">
                    {securityScore || "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">Security Score</div>
                </Card>
              </div>
            )}

            {/* Audit Report */}
            <div className="space-y-6">
              <MarkdownRenderer content={auditReport} />
              {analysisState === "streaming" && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Analyzing...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {analysisState === "error" && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Analysis Failed</h3>
              <p className="text-muted-foreground max-w-md">
                There was an error processing your contract. Please check your code and try again.
              </p>
              <Button onClick={handleAnalyze} className="mt-4" data-testid="button-retry">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="bg-card border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SmartAudit AI</h1>
              <p className="text-xs text-muted-foreground">Web3 Smart Contract Security Auditor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <WalletConnect />
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="border-t border-border/50">
          <div className="px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-transparent border-none h-auto p-0 grid w-auto grid-cols-3 gap-0">
                <TabsTrigger 
                  value="audit" 
                  data-testid="tab-audit"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent hover:border-muted-foreground/50 transition-colors px-4 py-3"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Audit
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  data-testid="tab-history"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent hover:border-muted-foreground/50 transition-colors px-4 py-3"
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger 
                  value="github" 
                  data-testid="tab-github"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent hover:border-muted-foreground/50 transition-colors px-4 py-3"
                >
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "audit" && (
          <ResizablePanes
            leftPanel={leftPanel}
            rightPanel={rightPanel}
            initialLeftWidth={50}
          />
        )}
        
        {activeTab === "history" && (
          <div className="p-6 h-full overflow-auto">
            <AuditHistory userId={user?.id} />
          </div>
        )}
        
        {activeTab === "github" && (
          <div className="p-6 h-full flex items-center justify-center">
            <Card className="p-8 max-w-md text-center">
              <Github className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-3">GitHub Integration</h3>
              <p className="text-muted-foreground mb-6">
                Connect your GitHub account to scan repositories for smart contracts and audit them automatically.
              </p>
              <Button disabled size="lg" data-testid="button-connect-github">
                <Github className="h-5 w-5 mr-2" />
                Connect GitHub
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Coming Soon</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
