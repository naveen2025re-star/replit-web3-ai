import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Paperclip, 
  Shield, 
  Bot, 
  User, 
  Settings, 
  History,
  Globe,
  Lock,
  Copy,
  Download,
  Share,
  ChevronDown,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { AuditVisibilitySelector } from "@/components/audit-visibility-selector";
import { FileUploader } from "@/components/ui/file-uploader";
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

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function AuditorPage() {
  const { user } = useWeb3Auth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("initial");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [auditVisibility, setAuditVisibility] = useState<AuditVisibilityOptions>({
    isPublic: false
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles | null>(null);
  const [showFileUploader, setShowFileUploader] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFilesProcessed = useCallback((combinedContent: string, contractLanguage: string, fileInfo: {fileCount: number, totalSize: number}) => {
    const result = {
      content: combinedContent,
      fileCount: fileInfo.fileCount,
      totalSize: fileInfo.totalSize
    };
    setUploadedFiles(result);
    setInputValue(combinedContent);
    setShowFileUploader(false);
    
    toast({
      title: "Files uploaded",
      description: `${fileInfo.fileCount} file(s) loaded successfully`,
    });
  }, [toast]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || analysisState === "loading" || analysisState === "streaming") {
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

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date()
    };

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputValue("");
    setAnalysisState("loading");

    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();

      const sessionResponse = await createAuditSession({
        contractCode: inputValue,
        contractLanguage: "solidity", // Auto-detect or default
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
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, isStreaming: false }
              : msg
          ));
          return;
        }
        
        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: msg.content + data.content }
                : msg
            ));
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        setAnalysisState("error");
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: "Sorry, there was an error analyzing your contract. Please try again.", isStreaming: false }
            : msg
        ));
      };
      
      // Clean up on abort
      abortControllerRef.current.signal.addEventListener('abort', () => {
        eventSource.close();
      });

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error("Analysis failed:", error);
      setAnalysisState("error");
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: `Error: ${error.message || "Analysis failed. Please try again."}`, isStreaming: false }
          : msg
      ));
      
      toast({
        title: "Analysis Failed",
        description: error.message || "An error occurred during analysis. Please try again.",
        variant: "destructive",
      });
    }
  }, [inputValue, user, auditVisibility, toast, analysisState]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-blue-500" />
            <h1 className="font-semibold text-foreground">SmartAudit AI</h1>
          </div>
          <Button 
            onClick={() => {
              setMessages([]);
              setAnalysisState("initial");
              setInputValue("");
              setUploadedFiles(null);
            }}
            className="w-full"
          >
            New Audit Session
          </Button>
        </div>

        <div className="flex-1 p-4">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Audit Settings
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            </Button>
            
            {showSettings && (
              <div className="pl-6 space-y-3">
                <AuditVisibilitySelector
                  value={auditVisibility}
                  onChange={setAuditVisibility}
                  disabled={analysisState === "loading" || analysisState === "streaming"}
                />
              </div>
            )}

            <Button variant="ghost" className="w-full justify-start">
              <History className="h-4 w-4 mr-2" />
              Recent Audits
            </Button>
          </div>
        </div>

        {user && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                {user.walletAddress?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {user.walletAddress?.slice(0, 6)}...{user.walletAddress?.slice(-4)}
                </div>
                <div className="text-xs text-muted-foreground">Connected</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-foreground">How can I help you today?</h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                I'm here to analyze your smart contracts for security vulnerabilities, gas optimization, and best practices.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                <Card 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setInputValue("pragma solidity ^0.8.19;\n\ncontract MyContract {\n    // Paste your contract code here\n}")}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground mb-1">Security Analysis</div>
                      <div className="text-sm text-muted-foreground">
                        Analyze smart contract for vulnerabilities and security issues
                      </div>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setInputValue("// Upload your contract files or paste code here for gas optimization analysis")}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground mb-1">Gas Optimization</div>
                      <div className="text-sm text-muted-foreground">
                        Find opportunities to reduce gas costs and improve efficiency
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    {message.type === "user" ? (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {message.type === "user" ? "You" : "SmartAudit AI"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="prose prose-sm max-w-none">
                      {message.type === "user" ? (
                        <div className="bg-muted/50 rounded-lg p-4">
                          <pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
                            {message.content}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-foreground">
                          <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                            {message.isStreaming && (
                              <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1"></span>
                            )}
                          </pre>
                          
                          {!message.isStreaming && message.content && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => copyMessage(message.content)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-3 w-3 mr-1" />
                                Export
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Share className="h-3 w-3 mr-1" />
                                Share
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-4xl mx-auto">
            {uploadedFiles && (
              <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {uploadedFiles.fileCount} file(s) loaded ({(uploadedFiles.totalSize / 1024).toFixed(1)}KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFiles(null)}
                    className="ml-auto h-6"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste your smart contract code here or describe what you'd like me to analyze..."
                className="w-full min-h-[80px] max-h-[200px] pr-20 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={analysisState === "loading" || analysisState === "streaming"}
              />
              
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFileUploader(true)}
                  disabled={analysisState === "loading" || analysisState === "streaming"}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || analysisState === "loading" || analysisState === "streaming"}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {analysisState === "loading" || analysisState === "streaming" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>
                {auditVisibility.isPublic ? (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Public audit - will appear in community
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Private audit - only visible to you
                  </span>
                )}
              </span>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Dialog */}
      <Dialog open={showFileUploader} onOpenChange={setShowFileUploader}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Contract Files</DialogTitle>
          </DialogHeader>
          <FileUploader onFilesProcessed={handleFilesProcessed} />
        </DialogContent>
      </Dialog>
    </div>
  );
}