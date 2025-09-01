import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// Removed problematic Select import that was causing infinite loops
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
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
  Plus,
  Coins,
  AlertCircle,
  Info,
  Lightbulb
} from "lucide-react";
import CreditDisplay from "@/components/CreditDisplay";
import CreditPurchase from "@/components/CreditPurchase";
import { AuditVisibilitySelector } from "@/components/audit-visibility-selector";
import { FileUploader } from "@/components/ui/file-uploader";
import { ContractFetcher } from "@/components/ContractFetcher";
import { ChatGPTSidebar } from "@/components/chatgpt-sidebar";
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

const AuditorPage = React.memo(() => {
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
  const [auditVisibility, setAuditVisibility] = useState<AuditVisibilityOptions>(() => ({
    isPublic: true // Default to public for Free users
  }));
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles | null>(null);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showContractFetcher, setShowContractFetcher] = useState(false);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processedSessionRef = useRef<string | null>(null);

  // Check authentication status once
  const authRedirectRef = useRef(false);
  useEffect(() => {
    if (!authRedirectRef.current && (!isConnected || !isAuthenticated)) {
      authRedirectRef.current = true;
      setLocation('/auth');
    }
  }, [isConnected, isAuthenticated]); // Remove setLocation from dependencies

  // Handle session URL parameter for direct links from GitHub integration - run only once
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    if (!sessionId || sessionId === processedSessionRef.current) return;
    
    processedSessionRef.current = sessionId;
    
    const loadSessionFromUrl = async () => {
      try {
        setMessages([]);
        setCurrentSessionId(sessionId);
        
        const response = await fetch(`/api/audit/session/${sessionId}`);
        if (!response.ok) throw new Error('Failed to load audit session');
        
        const sessionData = await response.json();
        
        if (sessionData.contractCode) {
          const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: "user",
            content: sessionData.contractCode,
            timestamp: new Date(sessionData.createdAt)
          };
          
          setMessages([userMessage]);
          setInputValue("");
          
          if (sessionData.result && (sessionData.result.rawResponse || sessionData.result.formattedReport)) {
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: "assistant",
              content: sessionData.result.rawResponse || sessionData.result.formattedReport,
              timestamp: new Date(sessionData.result.createdAt || sessionData.completedAt)
            };
            setMessages([userMessage, aiMessage]);
          }
        }
        
        window.history.replaceState({}, '', '/auditor');
      } catch (error) {
        console.error('Error loading session from URL:', error);
        window.history.replaceState({}, '', '/auditor');
      }
    };
    
    loadSessionFromUrl();
  }, []); // Empty dependency array - run only once

  // Fetch user's audit history
  const { data: auditHistory = [] } = useQuery({
    queryKey: ['/api/audit/user-sessions', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return fetch(`/api/audit/user-sessions/${user.id}?page=1&pageSize=50`).then(res => res.json()).then(data => data.sessions || []);
    },
    enabled: !!user?.id && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
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
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch user credits and plan tier
  const { data: credits } = useQuery({
    queryKey: ['/api/credits/balance', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/credits/balance?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Memoize plan tier check to prevent Select re-renders
  const isFreePlan = useMemo(() => {
    return !credits?.planTier || credits.planTier === 'Free';
  }, [credits?.planTier]);

  // Remove stableToast to prevent infinite loop
  // Use toast directly

  // Direct value calculation to prevent memoization loops
  const selectValue = auditVisibility.isPublic ? "public" : "private";

  // Stable onValueChange handler
  const handleVisibilityChange = useCallback((value: string) => {
    const isPublic = value === "public";
    
    // Prevent update if value hasn't changed
    if (isPublic === auditVisibility.isPublic) {
      return;
    }
    
    // Prevent Free users from selecting private
    if (!isPublic && isFreePlan) {
      toast({
        title: "Upgrade Required",
        description: "Private audits require Pro or Pro+ plan. Upgrade to unlock private audit features.",
        variant: "destructive",
      });
      setShowCreditPurchase(true);
      return;
    }
    setAuditVisibility(prev => ({...prev, isPublic}));
  }, [isFreePlan, auditVisibility.isPublic]);

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
  }, [textareaRef]);

  const handleContractFetch = useCallback(async (contractAddress: string, network: string = "ethereum") => {
    try {
      const response = await fetch("/api/fetch-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ contractAddress, network }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch contract");
      }

      // Count the number of files in the source code
      const fileCount = (result.contractData.sourceCode.match(/\/\/ File: /g) || []).length;
      const hasMultipleFiles = fileCount > 1;
      
      // Set the fetched content in the input with smart formatting
      setInputValue(`Analyze this verified smart contract${hasMultipleFiles ? ' project' : ''}: ${result.contractData.name}

Contract Address: ${result.contractData.address}
Network: ${result.contractData.network}
Compiler: ${result.contractData.compiler}${hasMultipleFiles ? `\nFiles: ${fileCount} source files` : ''}

\`\`\`solidity
${result.contractData.sourceCode}
\`\`\`

Please provide a comprehensive security audit focusing on vulnerabilities, gas optimization, and best practices.`);
      
      setShowContractFetcher(false);
      
      // Focus on the input area
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      
      toast({
        title: "Contract fetched successfully",
        description: `${result.contractData.name} loaded from ${result.contractData.network}${hasMultipleFiles ? ` (${fileCount} files)` : ''}. Ready for analysis.`,
      });
    } catch (error) {
      console.error("Contract fetch error:", error);
      toast({
        title: "Failed to fetch contract",
        description: error instanceof Error ? error.message : "Please check the address and try again.",
        variant: "destructive",
      });
    }
  }, [user?.id, toast]);

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
      
      // Handle insufficient credits error
      if (error.message?.includes('Insufficient credits') || error.error === 'insufficient_credits') {
        toast({
          title: "Insufficient Credits",
          description: `You need ${error.needed || error.cost || 'more'} credits to analyze this contract. You currently have ${error.current || 0} credits.`,
          variant: "destructive",
        });
        setShowCreditPurchase(true);
        setAnalysisState("initial");
        setMessages(prev => prev.slice(0, -2)); // Remove the last two messages (user + assistant)
        return;
      }
      
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

  const shareMessage = (content: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Smart Contract Audit Report',
        text: content,
      }).catch(console.error);
    } else {
      // Fallback to copy
      copyMessage(content);
      toast({
        title: "Shared via clipboard",
        description: "Report copied to clipboard for sharing",
      });
    }
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
    <div className="flex h-screen bg-gradient-to-br from-slate-950 to-slate-900 overflow-hidden">
      <ChatGPTSidebar
        auditHistory={auditHistory}
        user={user}
        onNewAudit={newAuditSession}
        onLoadSession={loadAuditSession}
        onEditAuditTitle={handleEditAuditTitle}
        onDeleteAudit={handleDeleteAudit}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-950 to-slate-900 min-w-0">
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
                onClick={() => setLocation('/integrations')}
                className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 flex items-center gap-2 hidden sm:flex"
                data-testid="button-view-integrations"
              >
                <Settings className="h-4 w-4" />
                Integrations
              </Button>
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
              <select 
                value={selectValue}
                onChange={(e) => handleVisibilityChange(e.target.value)}
                disabled={analysisState === "loading" || analysisState === "streaming"}
                className="w-32 h-9 px-3 py-1 bg-slate-800 border border-slate-600 text-white text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option 
                  value="private" 
                  disabled={isFreePlan}
                >
                  🔒 Private {isFreePlan ? "(Pro+)" : ""}
                </option>
                <option value="public">
                  🌐 Public
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">Smart Contract Security Analysis</h2>
              <p className="text-slate-400 mb-6 max-w-md">
                Upload your smart contract or paste the code to get comprehensive security analysis with vulnerability detection and optimization recommendations.
              </p>
              
              {/* Template Gallery */}
              <div className="bg-gradient-to-r from-slate-800/40 to-slate-700/30 rounded-xl p-6 mb-6 max-w-2xl border border-slate-600/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">⚡</span>
                  </div>
                  <h3 className="text-base font-medium text-white">Smart Contract Templates</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setInputValue(`Analyze this ERC-20 token contract:

\`\`\`solidity
pragma solidity ^0.8.19;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract MyToken is IERC20 {
    mapping(address => uint256) private _balances;
    uint256 private _totalSupply;
    string public name = "MyToken";
    string public symbol = "MTK";
    
    function transfer(address to, uint256 amount) external returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
}
\`\`\`

Please check for security vulnerabilities and suggest improvements.`)}
                    className="bg-slate-800/50 hover:bg-slate-700/60 transition-colors rounded-lg p-3 text-left border border-slate-600/50 hover:border-slate-500/50"
                  >
                    <div className="text-sm font-medium text-white mb-1">ERC-20 Token</div>
                    <div className="text-xs text-slate-400">Basic token contract template</div>
                  </button>
                  
                  <button
                    onClick={() => setInputValue(`Review this DeFi staking contract:

\`\`\`solidity
pragma solidity ^0.8.19;

contract StakingPool {
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewards;
    uint256 public totalStaked;
    
    function stake(uint256 amount) external payable {
        stakes[msg.sender] += amount;
        totalStaked += amount;
    }
    
    function withdraw(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "Insufficient stake");
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
        payable(msg.sender).transfer(amount);
    }
    
    function claimRewards() external {
        uint256 reward = calculateReward(msg.sender);
        rewards[msg.sender] = 0;
        payable(msg.sender).transfer(reward);
    }
    
    function calculateReward(address user) public view returns (uint256) {
        return stakes[user] * 10 / 100; // 10% APY
    }
}
\`\`\`

Please audit for reentrancy and other DeFi vulnerabilities.`)}
                    className="bg-slate-800/50 hover:bg-slate-700/60 transition-colors rounded-lg p-3 text-left border border-slate-600/50 hover:border-slate-500/50"
                  >
                    <div className="text-sm font-medium text-white mb-1">DeFi Staking</div>
                    <div className="text-xs text-slate-400">Staking pool contract</div>
                  </button>
                  
                  <button
                    onClick={() => setInputValue(`Audit this NFT marketplace:

\`\`\`solidity
pragma solidity ^0.8.19;

contract NFTMarketplace {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }
    
    mapping(uint256 => Listing) public listings;
    
    function listNFT(uint256 tokenId, uint256 price) external {
        listings[tokenId] = Listing(msg.sender, price, true);
    }
    
    function buyNFT(uint256 tokenId) external payable {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        
        listing.active = false;
        payable(listing.seller).transfer(listing.price);
        
        // Transfer NFT (simplified)
    }
}
\`\`\`

Focus on payment security and marketplace vulnerabilities.`)}
                    className="bg-slate-800/50 hover:bg-slate-700/60 transition-colors rounded-lg p-3 text-left border border-slate-600/50 hover:border-slate-500/50"
                  >
                    <div className="text-sm font-medium text-white mb-1">NFT Marketplace</div>
                    <div className="text-xs text-slate-400">NFT trading platform</div>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                <Card 
                  className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors bg-slate-800/20 border-slate-700"
                  onClick={() => setInputValue("Analyze this smart contract for security vulnerabilities:\n\n```solidity\npragma solidity ^0.8.19;\n\ncontract MyContract {\n    // Paste your contract code here\n    \n}\n```\n\nPlease check for:\n- Reentrancy attacks\n- Integer overflow/underflow\n- Access control issues\n- Gas limit problems\n- Front-running vulnerabilities")}
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
                  onClick={() => setInputValue("Optimize this smart contract for gas efficiency:\n\n```solidity\npragma solidity ^0.8.19;\n\ncontract MyContract {\n    // Paste your contract code here\n    \n}\n```\n\nPlease analyze:\n- Gas usage patterns\n- Storage optimization\n- Function efficiency\n- Loop optimizations\n- Data packing strategies")}
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
            <div className="space-y-6 max-w-6xl mx-auto">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-6">
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
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {message.type === "user" ? "You" : "SmartAudit AI"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="overflow-hidden">
                      {message.type === "user" ? (
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                          <pre className="whitespace-pre-wrap text-sm text-slate-100 overflow-x-auto break-words leading-relaxed">
                            {message.content}
                          </pre>
                        </div>
                      ) : (
                        <div className="bg-slate-900/30 rounded-lg border border-slate-700/30 p-5">
                          <MarkdownRenderer content={message.content} />
                          {message.isStreaming && (
                            <div className="flex items-center gap-2 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-sm font-medium">Analyzing...</span>
                            </div>
                          )}
                          
                          {!message.isStreaming && message.content && (
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/50">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => copyMessage(message.content)}
                                className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy Report
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                onClick={() => {
                                  // Export functionality
                                  const blob = new Blob([message.content], { type: 'text/markdown' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `audit-report-${new Date().toISOString().split('T')[0]}.md`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Export
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => shareMessage(message.content)}
                                className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              >
                                <Share className="h-3 w-3 mr-1" />
                                Share Audit
                              </Button>
                              
                              {/* Quick insights badges */}
                              {message.content.toLowerCase().includes('vulnerability') && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Security Issues</span>
                                </div>
                              )}
                              
                              {message.content.toLowerCase().includes('optimization') && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Optimizations</span>
                                </div>
                              )}
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
        <div className="border-t border-slate-700/50 p-4 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
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
                placeholder="💡 Try pasting: ERC-20 token contract, DeFi protocol, NFT collection, or any smart contract code. You can also ask questions like 'Check for reentrancy vulnerabilities' or 'Optimize gas usage'"
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
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContractFetcher(true)}
                  disabled={analysisState === "loading" || analysisState === "streaming"}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                  aria-label="Fetch verified contract"
                  data-testid="button-contract-fetch"
                >
                  <Globe className="h-4 w-4" />
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

      {/* Contract Fetcher Dialog */}
      <Dialog open={showContractFetcher} onOpenChange={setShowContractFetcher}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Fetch Verified Contract
            </DialogTitle>
            <DialogDescription>
              Enter a verified smart contract address to automatically fetch and analyze it
            </DialogDescription>
          </DialogHeader>
          <ContractFetcher onContractFetch={handleContractFetch} />
        </DialogContent>
      </Dialog>

      {/* Credit Purchase Dialog */}
      <CreditPurchase
        open={showCreditPurchase}
        onOpenChange={setShowCreditPurchase}
        userId={user?.id}
      />
    </div>
  );
});

AuditorPage.displayName = 'AuditorPage';

export default AuditorPage;