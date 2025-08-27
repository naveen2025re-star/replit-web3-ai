import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Shield, Code, Upload, Search, Trash, Save, History, Settings, User, Download, Copy, Share, CheckCircle, AlertCircle, TriangleAlert, Info, Lightbulb } from "lucide-react";
import CodeEditor from "@/components/ui/code-editor";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import ResizablePanes from "@/components/ui/resizable-panes";
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
  const { toast } = useToast();
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
        description: "Please enter smart contract code to analyze",
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
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
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
    <div className="flex flex-col h-full bg-background">
      {/* Code Editor Header */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Smart Contract Code</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={contractLanguage} onValueChange={setContractLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solidity">Solidity</SelectItem>
                <SelectItem value="vyper">Vyper</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
                <SelectItem value="move">Move</SelectItem>
                <SelectItem value="cairo">Cairo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" data-testid="button-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 p-6 overflow-hidden">
        <CodeEditor
          value={contractCode}
          onChange={setContractCode}
          language={contractLanguage}
          placeholder={`// Paste your smart contract code here...
// Supported languages: Solidity, Vyper, Rust, Move, Cairo

pragma solidity ^0.8.19;

contract Example {
    // Your contract code...
}`}
        />
        
        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          <Button 
            onClick={handleAnalyze}
            disabled={analysisState === "loading" || analysisState === "streaming"}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-analyze"
          >
            <Search className="h-4 w-4 mr-2" />
            {analysisState === "loading" || analysisState === "streaming" ? "Analyzing..." : "Start Security Audit"}
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={handleClear}
            data-testid="button-clear"
          >
            <Trash className="h-4 w-4 mr-2" />
            Clear
          </Button>
          
          <Button 
            variant="outline"
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="flex flex-col h-full bg-card">
      {/* Results Header */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-chart-1" />
            <h2 className="text-lg font-semibold text-foreground">Security Audit Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Export Report" data-testid="button-export">
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              title="Copy to Clipboard"
              onClick={handleCopyReport}
              data-testid="button-copy"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Share Report" data-testid="button-share">
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
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SmartAudit AI</h1>
              <p className="text-xs text-muted-foreground">Blockchain Smart Contract Security Auditor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" title="Audit History" data-testid="button-history">
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Settings" data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanes
          leftPanel={leftPanel}
          rightPanel={rightPanel}
          initialLeftWidth={50}
        />
      </div>
    </div>
  );
}
