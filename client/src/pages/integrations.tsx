import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { 
  Github, 
  Settings, 
  Download, 
  Copy,
  Shield,
  CheckCircle,
  LinkIcon,
  Code,
  FileText,
  FolderOpen,
  Brain,
  Webhook,
  Key,
  Terminal,
  Zap,
  Server,
  Globe
} from 'lucide-react';

export default function IntegrationsPage() {
  const [selectedRepository, setSelectedRepository] = useState('');
  const [cicdForm, setCicdForm] = useState({
    repositoryUrl: '',
    platform: 'github-actions',
    triggerEvents: ['push', 'pull_request']
  });
  const [cicdConfig, setCicdConfig] = useState('');
  const [scanResults, setScanResults] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Preserve scan results and selections across authentication
  useEffect(() => {
    const savedScanResults = localStorage.getItem('github_scan_results');
    const savedSelectedFiles = localStorage.getItem('github_selected_files');
    
    if (savedScanResults) {
      try {
        setScanResults(JSON.parse(savedScanResults));
      } catch (error) {
        console.warn('Invalid saved scan results:', error);
        localStorage.removeItem('github_scan_results');
      }
    }
    
    if (savedSelectedFiles) {
      try {
        setSelectedFiles(JSON.parse(savedSelectedFiles));
      } catch (error) {
        console.warn('Invalid saved selected files:', error);
        localStorage.removeItem('github_selected_files');
      }
    }
  }, []);

  // Save scan results to localStorage when they change
  useEffect(() => {
    if (scanResults) {
      localStorage.setItem('github_scan_results', JSON.stringify(scanResults));
    }
  }, [scanResults]);

  // Save selected files to localStorage when they change
  useEffect(() => {
    if (selectedFiles.length > 0) {
      localStorage.setItem('github_selected_files', JSON.stringify(selectedFiles));
    }
  }, [selectedFiles]);
  const { toast } = useToast();
  const { user } = useWeb3Auth();

  // Check for GitHub connection status from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const githubStatus = urlParams.get('github');
    
    if (githubStatus === 'connected') {
      toast({
        title: "GitHub Connected",
        description: "GitHub App installed successfully! You can now scan repositories.",
      });
      window.history.replaceState({}, '', '/integrations');
    } else if (githubStatus === 'error') {
      toast({
        title: "GitHub Connection Failed",
        description: "Failed to install GitHub App. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/integrations');
    }
  }, [toast]);

  // Fetch GitHub connection status
  const { data: githubStatus } = useQuery({
    queryKey: ['/api/integrations/github/status'],
    queryFn: async () => {
      const response = await fetch('/api/integrations/github/status', {
        headers: { 'x-user-id': user?.id || '' }
      });
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch repositories if GitHub is connected
  const { data: repositories } = useQuery({
    queryKey: ['/api/integrations/github/repositories'],
    queryFn: async () => {
      const response = await fetch('/api/integrations/github/repositories', {
        headers: { 'x-user-id': user?.id || '' }
      });
      return response.json();
    },
    enabled: !!user?.id && githubStatus?.connected,
  });

  // Fetch CI/CD status
  const { data: cicdStatus } = useQuery({
    queryKey: ['/api/integrations/cicd/status'],
    queryFn: async () => {
      const response = await fetch('/api/integrations/cicd/status', {
        headers: { 'x-user-id': user?.id || '' }
      });
      return response.json();
    },
    enabled: !!user?.id,
  });

  // GitHub App installation mutation
  const githubInstallMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integrations/github/install', {
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    },
    onSuccess: (data) => {
      window.open(data.installUrl, '_blank');
    },
    onError: (error: any) => {
      // Check if this is a configuration error
      if (error.message?.includes('not configured')) {
        toast({
          title: "GitHub App Setup Required",
          description: "GitHub integration needs to be configured by the administrator. Please check the setup instructions.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "GitHub Installation Failed",
          description: error.message || "Failed to generate installation URL",
          variant: "destructive",
        });
      }
    },
  });

  // Repository scan mutation
  const githubScanMutation = useMutation({
    mutationFn: async (repositoryFullName: string) => {
      const response = await fetch('/api/integrations/github/scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ repositoryFullName })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setScanResults(data.scan);
      if (data.scan.totalFiles === 0) {
        toast({
          title: "No Smart Contract Files Found",
          description: data.message || "This repository doesn't contain any .sol files. Make sure your smart contracts are present and properly named.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Repository Scan Complete",
          description: data.message || `Found ${data.scan.totalFiles} smart contract file${data.scan.totalFiles === 1 ? '' : 's'} ready for analysis.`,
        });
      }
    },
    onError: (error: any) => {
      // Handle different HTTP status codes for better user feedback
      const response = error.response;
      let title = "Repository Scan Failed";
      let description = error.message || "Failed to scan repository";
      
      if (response?.status === 429) {
        title = "Rate Limit Exceeded";
        description = "Too many requests to GitHub. Please wait a few minutes before trying again.";
      } else if (response?.status === 404) {
        title = "Repository Not Found";
        description = "The repository doesn't exist or you don't have access to it.";
      } else if (response?.status === 403) {
        title = "Access Denied";
        description = "GitHub App doesn't have permission to access this repository.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // AI analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: async (analysisData: { repositoryFullName: string; selectedFiles: string[] }) => {
      const response = await fetch('/api/integrations/github/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify(analysisData)
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Started",
        description: `Starting AI analysis of ${selectedFiles.length} files. Redirecting to audit page...`,
      });
      // Redirect to the auditor page with the session ID
      setTimeout(() => {
        window.location.href = `/auditor?session=${data.sessionId}`;
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to start AI analysis",
        variant: "destructive",
      });
    },
  });

  // CI/CD setup mutation
  const cicdSetupMutation = useMutation({
    mutationFn: async (setupData: typeof cicdForm) => {
      const response = await fetch('/api/integrations/cicd/setup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify(setupData)
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCicdConfig(data.config);
      toast({
        title: "CI/CD Setup Complete",
        description: `${data.setup.platform} pipeline configured successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "CI/CD Setup Failed",
        description: error.message || "Failed to setup CI/CD pipeline",
        variant: "destructive",
      });
    },
  });

  const handleGithubConnect = () => {
    githubInstallMutation.mutate();
  };

  const handleRepositoryScan = () => {
    if (!selectedRepository) {
      toast({
        title: "No Repository Selected", 
        description: "Please select a repository to scan",
        variant: "destructive",
      });
      return;
    }
    setScanResults(null);
    setSelectedFiles([]);
    githubScanMutation.mutate(selectedRepository);
  };

  const handleFileSelection = (filePath: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, filePath]);
    } else {
      setSelectedFiles(prev => prev.filter(path => path !== filePath));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && scanResults?.contracts) {
      setSelectedFiles(scanResults.contracts.map((contract: any) => contract.path));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleAIAnalysis = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to analyze",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedRepository) {
      toast({
        title: "No Repository Selected",
        description: "Please select a repository first",
        variant: "destructive",
      });
      return;
    }
    
    aiAnalysisMutation.mutate({
      repositoryFullName: selectedRepository,
      selectedFiles
    });
  };

  const handleCicdSetup = () => {
    if (!cicdForm.repositoryUrl) {
      toast({
        title: "Missing Repository URL",
        description: "Please enter your repository URL",
        variant: "destructive",
      });
      return;
    }
    cicdSetupMutation.mutate(cicdForm);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Configuration copied to clipboard",
    });
  };

  const downloadConfig = () => {
    const filename = 'smart-audit.yml';
    const blob = new Blob([cicdConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Integrations</h1>
          <p className="text-gray-300 text-sm md:text-base">Connect SmartAudit AI with your development workflow</p>
        </div>

        <Tabs defaultValue="github" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger value="github" className="data-[state=active]:bg-blue-600">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </TabsTrigger>
            <TabsTrigger value="cicd" className="data-[state=active]:bg-blue-600">
              <Settings className="h-4 w-4 mr-2" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-blue-600">
              <Key className="h-4 w-4 mr-2" />
              API & Webhooks
            </TabsTrigger>
          </TabsList>

          {/* GitHub Integration */}
          <TabsContent value="github">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Github className="h-5 w-5 mr-2 text-blue-400" />
                    GitHub Integration
                    {githubStatus?.connected && (
                      <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Connect your GitHub account to scan repositories automatically
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!githubStatus?.connected ? (
                    <div className="text-center py-6">
                      <Github className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Connect GitHub</h3>
                      <p className="text-gray-400 mb-4">
                        Install the SmartAudit AI GitHub App to scan your repositories
                      </p>
                      <Button 
                        onClick={handleGithubConnect}
                        disabled={githubInstallMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-connect-github"
                      >
                        {githubInstallMutation.isPending ? (
                          <>Connecting...</>
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Install GitHub App
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                          <span className="text-green-400 font-medium">GitHub App Connected</span>
                        </div>
                        <Badge variant="outline" className="text-green-400 border-green-500/30">
                          {repositories?.repositories?.length || 0} repositories
                        </Badge>
                      </div>
                      
                      <div>
                        <Label htmlFor="repository-select" className="text-white">Select Repository</Label>
                        <Select value={selectedRepository} onValueChange={setSelectedRepository}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="Choose a repository to scan" />
                          </SelectTrigger>
                          <SelectContent>
                            {repositories?.repositories?.map((repo: any) => (
                              <SelectItem key={repo.full_name} value={repo.full_name}>
                                <div className="flex items-center">
                                  <Github className="h-4 w-4 mr-2" />
                                  {repo.full_name}
                                  {repo.private && <Badge className="ml-2 text-xs">Private</Badge>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        onClick={handleRepositoryScan}
                        disabled={githubScanMutation.isPending || !selectedRepository}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        data-testid="button-scan-repository"
                      >
                        {githubScanMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Scanning Repository...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Scan Repository
                          </>
                        )}
                      </Button>
                      
                      {/* File Browser - Show after scan is complete */}
                      {scanResults && (
                        <div className="space-y-4 mt-6 p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FolderOpen className="h-5 w-5 text-blue-400 mr-2" />
                              <span className="text-white font-medium">Blockchain Files ({scanResults.totalFiles})</span>
                            </div>
                            <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                              {selectedFiles.length} selected
                            </Badge>
                          </div>
                          
                          {/* Language Breakdown - Show if there are files */}
                          {scanResults.totalFiles > 0 && scanResults.languageBreakdown && (
                            <div className="bg-slate-800/50 p-3 rounded-lg">
                              <p className="text-gray-300 text-sm mb-2">Languages detected:</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(scanResults.languageBreakdown).map(([language, files]: [string, any]) => (
                                  <div
                                    key={language}
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      language === 'Solidity' ? 'bg-blue-500/20 text-blue-300' :
                                      language === 'Rust' ? 'bg-orange-500/20 text-orange-300' :
                                      language === 'Move' ? 'bg-purple-500/20 text-purple-300' :
                                      language === 'Cairo' ? 'bg-red-500/20 text-red-300' :
                                      language === 'Go' ? 'bg-cyan-500/20 text-cyan-300' :
                                      language === 'TypeScript' ? 'bg-blue-400/20 text-blue-200' :
                                      language === 'JavaScript' ? 'bg-yellow-500/20 text-yellow-300' :
                                      language === 'Python' ? 'bg-green-500/20 text-green-300' :
                                      'bg-gray-500/20 text-gray-300'
                                    }`}
                                  >
                                    {language} ({files.length})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Select All Checkbox - Only show if there are files */}
                          {scanResults.totalFiles > 0 && (
                            <div className="flex items-center space-x-2 pb-2 border-b border-slate-600">
                              <Checkbox
                                id="select-all"
                                checked={scanResults.contracts && selectedFiles.length === scanResults.contracts.length}
                                onCheckedChange={handleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                              <Label htmlFor="select-all" className="text-gray-300 cursor-pointer">
                                Select All Files
                              </Label>
                            </div>
                          )}
                          
                          {/* File List */}
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {scanResults.totalFiles === 0 ? (
                              <div className="text-center py-8">
                                <FolderOpen className="h-12 w-12 mx-auto text-gray-500 mb-3" />
                                <p className="text-gray-300 font-medium mb-1">No blockchain files found</p>
                                <p className="text-gray-500 text-sm">
                                  This repository doesn't contain any blockchain programming files.<br />
                                  Supported: .sol, .rs, .move, .cairo, .go, .ts, .py, and others.
                                </p>
                              </div>
                            ) : (
                              scanResults.contracts?.map((contract: any) => (
                                <div key={contract.path} className="flex items-center space-x-3 p-2 hover:bg-slate-600/30 rounded">
                                  <Checkbox
                                    id={contract.path}
                                    checked={selectedFiles.includes(contract.path)}
                                    onCheckedChange={(checked) => handleFileSelection(contract.path, !!checked)}
                                    data-testid={`checkbox-file-${contract.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                                  />
                                  <FileText className={`h-4 w-4 flex-shrink-0 ${
                                    contract.language === 'Solidity' ? 'text-blue-400' :
                                    contract.language === 'Rust' ? 'text-orange-400' :
                                    contract.language === 'Move' ? 'text-purple-400' :
                                    contract.language === 'Cairo' ? 'text-red-400' :
                                    contract.language === 'Go' ? 'text-cyan-400' :
                                    contract.language === 'TypeScript' ? 'text-blue-300' :
                                    contract.language === 'JavaScript' ? 'text-yellow-400' :
                                    contract.language === 'Python' ? 'text-green-400' :
                                    'text-gray-400'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white text-sm font-mono truncate">
                                      {contract.path}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-400">
                                        {(contract.size / 1024).toFixed(1)} KB
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        contract.language === 'Solidity' ? 'bg-blue-500/20 text-blue-300' :
                                        contract.language === 'Rust' ? 'bg-orange-500/20 text-orange-300' :
                                        contract.language === 'Move' ? 'bg-purple-500/20 text-purple-300' :
                                        contract.language === 'Cairo' ? 'bg-red-500/20 text-red-300' :
                                        contract.language === 'Go' ? 'bg-cyan-500/20 text-cyan-300' :
                                        contract.language === 'TypeScript' ? 'bg-blue-400/20 text-blue-200' :
                                        contract.language === 'JavaScript' ? 'bg-yellow-500/20 text-yellow-300' :
                                        contract.language === 'Python' ? 'bg-green-500/20 text-green-300' :
                                        'bg-gray-500/20 text-gray-300'
                                      }`}>
                                        {contract.language}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          
                          {/* AI Analyze Button */}
                          <Button
                            onClick={handleAIAnalysis}
                            disabled={aiAnalysisMutation.isPending || selectedFiles.length === 0}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            data-testid="button-ai-analyze"
                          >
                            {aiAnalysisMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Starting Analysis...
                              </>
                            ) : (
                              <>
                                <Brain className="h-4 w-4 mr-2" />
                                AI Analyze Selected Files ({selectedFiles.length})
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* GitHub Features */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Features</CardTitle>
                  <CardDescription className="text-gray-300">
                    What you get with GitHub integration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Automatic repository scanning</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Pull request analysis</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Private repository access</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Real-time vulnerability alerts</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Automation */}
          <TabsContent value="cicd">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-blue-400" />
                    Smart Automation
                    {cicdStatus?.configured && (
                      <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Automated security scanning with intelligent triggers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Server className="h-5 w-5 text-green-400 mr-2" />
                          <span className="text-white font-medium">GitHub Webhooks</span>
                        </div>
                        <Badge variant="outline" className="text-green-400 border-green-500/30">
                          Enabled
                        </Badge>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">
                        Automatic audits triggered on push, PR, and releases
                      </p>
                      <div className="flex gap-2">
                        <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                          Pull Requests
                        </Badge>
                        <Badge className="bg-orange-500/20 text-orange-300 text-xs">
                          Main Branch
                        </Badge>
                        <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                          Releases
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Terminal className="h-5 w-5 text-blue-400 mr-2" />
                          <span className="text-white font-medium">CI/CD Integration</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleCicdSetup}
                          disabled={cicdSetupMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {cicdSetupMutation.isPending ? "Setting up..." : "Configure"}
                        </Button>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Get workflow files for GitHub Actions, Jenkins, or GitLab CI
                      </p>
                    </div>
                  </div>

                  {cicdConfig && (
                    <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">GitHub Actions Configuration</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(cicdConfig)}
                            className="text-blue-400 border-blue-500/30"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadConfig}
                            className="text-blue-400 border-blue-500/30"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <pre className="text-xs text-gray-300 overflow-x-auto bg-black/30 p-2 rounded">
                        {cicdConfig}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Smart Features */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Intelligent Features</CardTitle>
                  <CardDescription className="text-gray-300">
                    Advanced automation capabilities for security teams
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
                      <div className="flex items-center mb-2">
                        <Brain className="h-5 w-5 text-blue-400 mr-2" />
                        <span className="text-white font-medium">Smart Risk Assessment</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        AI analyzes code changes to automatically determine audit priority and scope
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 rounded-lg border border-green-500/20">
                      <div className="flex items-center mb-2">
                        <Shield className="h-5 w-5 text-green-400 mr-2" />
                        <span className="text-white font-medium">Conditional Audits</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Only trigger audits when smart contracts or security-critical files are modified
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-lg border border-purple-500/20">
                      <div className="flex items-center mb-2">
                        <Zap className="h-5 w-5 text-purple-400 mr-2" />
                        <span className="text-white font-medium">Instant Feedback</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Real-time security feedback directly in PRs with actionable recommendations
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4 rounded-lg border border-orange-500/20">
                      <div className="flex items-center mb-2">
                        <Settings className="h-5 w-5 text-orange-400 mr-2" />
                        <span className="text-white font-medium">Custom Rules</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Set up custom security policies and compliance rules for your organization
                      </p>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" data-testid="button-setup-smart-automation">
                    <Brain className="h-4 w-4 mr-2" />
                    Enable Smart Automation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API & Webhooks */}
          <TabsContent value="api">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Key className="h-5 w-5 mr-2 text-blue-400" />
                    API Access
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Integrate SmartAudit AI directly into your applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="api-key" className="text-white">Your API Key</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="api-key"
                        type="password"
                        value="sa_1234567890abcdef..."
                        readOnly
                        className="bg-slate-700 border-slate-600 text-white font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard("sa_1234567890abcdef1234567890abcdef")}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Use this key to authenticate API requests. Keep it secure!
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">API Endpoints</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between bg-slate-700/30 p-2 rounded">
                        <span className="text-gray-300">POST /api/v1/audit</span>
                        <Badge variant="outline" className="text-green-400 border-green-500/30">Live</Badge>
                      </div>
                      <div className="flex items-center justify-between bg-slate-700/30 p-2 rounded">
                        <span className="text-gray-300">GET /api/v1/audit/{id}</span>
                        <Badge variant="outline" className="text-green-400 border-green-500/30">Live</Badge>
                      </div>
                      <div className="flex items-center justify-between bg-slate-700/30 p-2 rounded">
                        <span className="text-gray-300">POST /api/v1/batch-audit</span>
                        <Badge variant="outline" className="text-green-400 border-green-500/30">Live</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-view-api-docs">
                    <Globe className="h-4 w-4 mr-2" />
                    View API Documentation
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Webhook className="h-5 w-5 mr-2 text-purple-400" />
                    Webhooks
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Receive real-time notifications about audit completions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-url" className="text-white">Webhook URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="webhook-url"
                        placeholder="https://your-app.com/webhooks/smartaudit"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        Save
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Webhook Events</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="audit-complete" defaultChecked />
                        <Label htmlFor="audit-complete" className="text-gray-300 text-sm">
                          audit.completed
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="audit-failed" defaultChecked />
                        <Label htmlFor="audit-failed" className="text-gray-300 text-sm">
                          audit.failed
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="credits-low" />
                        <Label htmlFor="credits-low" className="text-gray-300 text-sm">
                          credits.low_balance
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700/30 p-3 rounded-lg">
                    <h5 className="text-white text-sm font-medium mb-2">Sample Payload</h5>
                    <pre className="text-xs text-gray-300 overflow-x-auto">
{`{
  "event": "audit.completed",
  "audit_id": "audit_123",
  "status": "completed",
  "timestamp": "2024-01-01T12:00:00Z"
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}