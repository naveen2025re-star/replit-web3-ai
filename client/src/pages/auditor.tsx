import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from "wouter";
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
  Clock,
  AlertTriangle,
  CheckCircle,
  Trash2,
  MoreVertical,
  Plus
} from "lucide-react";
import { AuditVisibilitySelector } from "@/components/audit-visibility-selector";
import { FileUploader } from "@/components/ui/file-uploader";
import { SophisticatedSidebar } from "@/components/sophisticated-sidebar";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { createAuditSession } from "@/lib/shipable-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

interface AuditSession {
  id: string;
  publicTitle?: string;
  contractLanguage: string;
  status: string;
  isPublic: boolean;
  createdAt: string;
  completedAt?: string;
}

export default function AuditorPage() {
  const { user, isConnected, isAuthenticated, authenticate, disconnect, isAuthenticating } = useWeb3Auth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("initial");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'audits' | 'community'>('audits');
  const [auditVisibility, setAuditVisibility] = useState<AuditVisibilityOptions>({
    isPublic: false
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles | null>(null);
  const [showFileUploader, setShowFileUploader] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!isConnected || !isAuthenticated) {
      setLocation('/auth');
    }
  }, [isConnected, isAuthenticated, setLocation]);

  // Fetch user's audit history
  const { data: auditHistory = [] } = useQuery({
    queryKey: ['/api/audit/user-sessions', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return fetch(`/api/audit/user-sessions/${user.id}?page=1&pageSize=50`).then(res => res.json()).then(data => data.sessions || []);
    },
    enabled: !!user?.id && isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds to get latest audits
  });

  // Fetch community audits
  const { data: communityAudits = { audits: [], total: 0 } } = useQuery({
    queryKey: ['/api/community/audits'],
    queryFn: async () => {
      const response = await fetch('/api/community/audits?page=1&limit=10');
      if (!response.ok) {
        console.error('Failed to fetch community audits:', response.status);
        return { audits: [], total: 0 };
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFilesProcessed = useCallback((combinedContent: string, contractLanguage: string, fileInfo: {fileCount: number, totalSize: number}) => {
    // Validate file content
    if (!combinedContent || combinedContent.trim().length === 0) {
      toast({
        title: "Empty files",
        description: "The uploaded files appear to be empty. Please check your files.",
        variant: "destructive",
      });
      return;
    }
    
    if (combinedContent.length > 100000) { // 100KB limit
      toast({
        title: "Files too large",
        description: "Combined file size is too large. Please reduce the content or upload fewer files.",
        variant: "destructive",
      });
      return;
    }
    
    const result = {
      content: combinedContent,
      fileCount: fileInfo.fileCount,
      totalSize: fileInfo.totalSize
    };
    setUploadedFiles(result);
    setInputValue(combinedContent);
    setShowFileUploader(false);
    
    // Focus on the input area after upload
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    
    toast({
      title: "Files uploaded successfully",
      description: `${fileInfo.fileCount} file(s) loaded (${(fileInfo.totalSize / 1024).toFixed(1)}KB). Ready for analysis.`,
    });
  }, [toast]);

  const handleSendMessage = useCallback(async () => {
    // Better input validation
    const trimmedInput = inputValue.trim();
    
    if (!trimmedInput) {
      toast({
        title: "Empty input",
        description: "Please paste your smart contract code or describe what you'd like analyzed.",
        variant: "destructive",
      });
      return;
    }
    
    if (trimmedInput.length < 10) {
      toast({
        title: "Input too short",
        description: "Please provide more details for a comprehensive analysis.",
        variant: "destructive",
      });
      return;
    }

    if (analysisState === "loading" || analysisState === "streaming") {
      toast({
        title: "Analysis in progress",
        description: "Please wait for the current analysis to complete.",
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
        contractLanguage: "solidity",
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
        try {
          const data = JSON.parse(event.data);
          
          if (data.status === "completed") {
            eventSource.close();
            setAnalysisState("completed");
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, isStreaming: false }
                : msg
            ));
            // Invalidate audit history to refresh
            queryClient.invalidateQueries({ queryKey: ['/api/audit/sessions'] });
            return;
          }
          
          if (data.body) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: msg.content + data.body }
                : msg
            ));
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.addEventListener('content', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.body) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: msg.content + data.body }
                : msg
            ));
          }
        } catch (error) {
          console.error('Error parsing content event:', error);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        eventSource.close();
        setAnalysisState("completed");
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, isStreaming: false }
            : msg
        ));
        // Invalidate both query keys to refresh sidebar and audit history
        queryClient.invalidateQueries({ queryKey: ['/api/audit/user-sessions', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/audit/sessions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/community/audits'] });
      });
      
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
  }, [inputValue, user, auditVisibility, toast, analysisState, queryClient]);

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

  const loadAuditSession = async (sessionId: string) => {
    try {
      // Show loading state
      toast({
        title: "Loading audit",
        description: "Retrieving previous audit session...",
      });

      setMessages([]);
      setCurrentSessionId(sessionId);
      
      // Fetch the audit session details
      const response = await fetch(`/api/audit/session/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to load audit session');
      }
      
      const sessionData = await response.json();
      
      // Create user message with the original contract code
      if (sessionData.contractCode) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          type: "user",
          content: sessionData.contractCode,
          timestamp: new Date(sessionData.createdAt)
        };
        
        // Create AI response if available
        const messages: ChatMessage[] = [userMessage];
        if (sessionData.result && (sessionData.result.rawResponse || sessionData.result.formattedReport)) {
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: "assistant",
            content: sessionData.result.rawResponse || sessionData.result.formattedReport,
            timestamp: new Date(sessionData.result.createdAt || sessionData.completedAt)
          };
          messages.push(aiMessage);
        }
        
        setMessages(messages);
        setInputValue(""); // Clear input
        
        toast({
          title: "Audit loaded",
          description: "Previous audit session restored successfully.",
        });
      }
    } catch (error) {
      console.error('Error loading audit session:', error);
      toast({
        title: "Error",
        description: "Failed to load audit session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const newAuditSession = () => {
    // Confirm if there are unsaved changes
    if (messages.length > 0 && analysisState !== "completed") {
      if (!confirm("You have an analysis in progress. Are you sure you want to start a new audit?")) {
        return;
      }
    }
    
    setMessages([]);
    setAnalysisState("initial");
    setInputValue("");
    setUploadedFiles(null);
    setCurrentSessionId(null);
    
    // Focus on the input textarea for better UX
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    
    toast({
      title: "New audit session",
      description: "Ready for your next smart contract analysis.",
    });
  };

  const handleEditAuditTitle = useCallback(async (sessionId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/audit/session/${sessionId}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        // Refetch audit history to show updated title
        queryClient.invalidateQueries({ queryKey: ['/api/audit/user-sessions', user?.id] });
        toast({
          title: "Title updated",
          description: "Audit title has been successfully updated.",
        });
      } else {
        throw new Error('Failed to update title');
      }
    } catch (error) {
      console.error('Error updating audit title:', error);
      toast({
        title: "Error",
        description: "Failed to update audit title.",
        variant: "destructive",
      });
    }
  }, [user?.id, queryClient, toast]);

  const handleDeleteAudit = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/audit/session/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refetch audit history to remove deleted item
        queryClient.invalidateQueries({ queryKey: ['/api/audit/user-sessions', user?.id] });
        // Also refresh community audits in case it was public
        queryClient.invalidateQueries({ queryKey: ['/api/community/audits'] });
        toast({
          title: "Audit deleted",
          description: "Audit has been permanently deleted.",
        });
        
        // If we're currently viewing the deleted session, reset to initial state
        if (currentSessionId === sessionId) {
          newAuditSession();
        }
      } else {
        throw new Error('Failed to delete audit');
      }
    } catch (error) {
      console.error('Error deleting audit:', error);
      toast({
        title: "Error",
        description: "Failed to delete audit.",
        variant: "destructive",
      });
    }
  }, [user?.id, queryClient, toast, currentSessionId]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <SophisticatedSidebar
        auditHistory={auditHistory}
        communityAudits={communityAudits}
        user={user}
        onNewAudit={newAuditSession}
        onLoadSession={loadAuditSession}
        onShowSettings={() => setShowSettings(!showSettings)}
        onEditAuditTitle={handleEditAuditTitle}
        onDeleteAudit={handleDeleteAudit}
        onViewCommunityAudit={(auditId: string) => {
          // Navigate to community page or open audit details
          setLocation(`/community?audit=${auditId}`);
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-950 to-slate-900">
        {/* Header */}
        <div className="border-b border-slate-700/50 p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Smart Contract Analysis</h2>
              {currentSessionId && (
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  Session Active
                </Badge>
              )}
            </div>
            
            {/* Community and Visibility Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/community')}
                className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 flex items-center gap-2"
                data-testid="button-view-community"
              >
                <Globe className="h-4 w-4" />
                Community
              </Button>
              <div className="h-6 w-px bg-slate-600"></div>
              <Select 
                value={auditVisibility.isPublic ? "public" : "private"}
                onValueChange={(value) => setAuditVisibility({...auditVisibility, isPublic: value === "public"})}
                disabled={analysisState === "loading" || analysisState === "streaming"}
              >
                <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">Smart Contract Security Analysis</h2>
              <p className="text-slate-400 mb-8 max-w-md">
                Upload your smart contract or paste the code to get comprehensive security analysis with vulnerability detection and optimization recommendations.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                <Card 
                  className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors bg-slate-800/20 border-slate-700"
                  onClick={() => setInputValue("pragma solidity ^0.8.19;\n\ncontract MyContract {\n    // Paste your contract code here\n}")}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-white mb-1">Security Audit</div>
                      <div className="text-sm text-slate-400">
                        Comprehensive vulnerability analysis and security recommendations
                      </div>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors bg-slate-800/20 border-slate-700"
                  onClick={() => setInputValue("// Upload your contract files or paste code here for gas optimization analysis")}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-white mb-1">Gas Optimization</div>
                      <div className="text-sm text-slate-400">
                        Identify opportunities to reduce gas costs and improve efficiency
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
                      <span className="font-medium text-white">
                        {message.type === "user" ? "You" : "SmartAudit AI"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="max-w-none">
                      {message.type === "user" ? (
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                          <pre className="whitespace-pre-wrap text-sm font-mono text-slate-100 overflow-x-auto">
                            {message.content}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-slate-100">
                          <div className="prose prose-invert prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                // Custom styling for markdown elements
                                h1: ({children}) => <h1 className="text-xl font-bold text-white mb-3">{children}</h1>,
                                h2: ({children}) => <h2 className="text-lg font-semibold text-white mb-2">{children}</h2>,
                                h3: ({children}) => <h3 className="text-base font-medium text-white mb-2">{children}</h3>,
                                p: ({children}) => <p className="text-slate-100 mb-3 leading-relaxed">{children}</p>,
                                ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1 text-slate-100">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-slate-100">{children}</ol>,
                                li: ({children}) => <li className="text-slate-100">{children}</li>,
                                code: ({children}) => <code className="bg-slate-800 px-2 py-1 rounded text-sm font-mono text-blue-300">{children}</code>,
                                pre: ({children}) => <pre className="bg-slate-800 border border-slate-700 rounded-lg p-3 overflow-x-auto mb-3">{children}</pre>,
                                blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-300 mb-3">{children}</blockquote>,
                                strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                                em: ({children}) => <em className="italic text-slate-200">{children}</em>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                              {message.isStreaming && (
                                <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1"></span>
                              )}
                            </div>
                          </div>
                          
                          {!message.isStreaming && message.content && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => copyMessage(message.content)}
                                className="text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Export
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-slate-400 hover:text-white hover:bg-slate-800"
                              >
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
        <div className="border-t border-slate-700/50 p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            {uploadedFiles && (
              <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-400 font-medium">
                    {uploadedFiles.fileCount} file(s) loaded ({(uploadedFiles.totalSize / 1024).toFixed(1)}KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFiles(null)}
                    className="ml-auto h-6 text-blue-400 hover:text-white"
                  >
                    <Trash2 className="h-3 w-3" />
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
                placeholder="Paste your smart contract code here (Solidity, Rust, Go, etc.) or describe specific security concerns you'd like me to analyze..."
                className="w-full min-h-[120px] max-h-[300px] pr-20 resize-none rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                disabled={analysisState === "loading" || analysisState === "streaming"}
                aria-label="Smart contract code input"
                aria-describedby="input-help-text"
                data-testid="textarea-contract-input"
              />
              
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFileUploader(true)}
                  disabled={analysisState === "loading" || analysisState === "streaming"}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                  aria-label="Upload contract files"
                  data-testid="button-file-upload"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || analysisState === "loading" || analysisState === "streaming"}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  aria-label={analysisState === "loading" || analysisState === "streaming" ? "Analysis in progress" : "Start security analysis"}
                  data-testid="button-send-message"
                >
                  {analysisState === "loading" || analysisState === "streaming" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
              <span>
                {auditVisibility.isPublic ? (
                  <span className="flex items-center gap-1 text-blue-400">
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