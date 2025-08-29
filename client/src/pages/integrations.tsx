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
  ExternalLink, 
  Copy,
  Shield,
  CheckCircle,
  LinkIcon,
  Code,
  FileText,
  FolderOpen,
  Brain
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Integrations</h1>
          <p className="text-gray-300">Connect SmartAudit AI with your development workflow</p>
        </div>

        <Tabs defaultValue="github" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger value="github" className="data-[state=active]:bg-blue-600">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </TabsTrigger>
            <TabsTrigger value="cicd" className="data-[state=active]:bg-blue-600">
              <Settings className="h-4 w-4 mr-2" />
              CI/CD
            </TabsTrigger>
            <TabsTrigger value="browser" className="data-[state=active]:bg-blue-600">
              <ExternalLink className="h-4 w-4 mr-2" />
              Browser Extension
            </TabsTrigger>
          </TabsList>

          {/* GitHub Integration */}
          <TabsContent value="github">
            <div className="grid gap-6 md:grid-cols-2">
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
                          <>Scanning...</>
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
                              <>Analyzing...</>
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

          {/* CI/CD Integration */}
          <TabsContent value="cicd">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-blue-400" />
                    CI/CD Pipeline Setup
                    {cicdStatus?.configured && (
                      <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Setup automated contract audits in your CI/CD pipeline
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="repo-url" className="text-white">Repository URL</Label>
                    <Input
                      id="repo-url"
                      placeholder="https://github.com/username/repository"
                      value={cicdForm.repositoryUrl}
                      onChange={(e) => setCicdForm({...cicdForm, repositoryUrl: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                      data-testid="input-repository-url"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCicdSetup}
                    disabled={cicdSetupMutation.isPending || !cicdForm.repositoryUrl}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    data-testid="button-setup-cicd"
                  >
                    {cicdSetupMutation.isPending ? (
                      <>Setting up...</>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Setup CI/CD Pipeline
                      </>
                    )}
                  </Button>

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

              {/* CI/CD Instructions */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Setup Instructions</CardTitle>
                  <CardDescription className="text-gray-300">
                    How to configure automated security scanning
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">1</div>
                      <span className="text-gray-300">Click "Setup CI/CD Pipeline" to generate configuration</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">2</div>
                      <span className="text-gray-300">Create .github/workflows/smart-audit.yml in your repository</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">3</div>
                      <span className="text-gray-300">Paste the generated configuration and commit</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">4</div>
                      <span className="text-gray-300">Add SMART_AUDIT_API_KEY secret in repository settings</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Browser Extension */}
          <TabsContent value="browser">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <ExternalLink className="h-5 w-5 mr-2 text-blue-400" />
                    Browser Extension
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Analyze contracts directly from Etherscan and block explorers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-6">
                    <Code className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">SmartAudit Browser Extension</h3>
                    <p className="text-gray-400 mb-4">
                      Scan contracts directly from Etherscan with one click
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Download className="h-4 w-4 mr-2" />
                      Download Extension
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Extension Features</CardTitle>
                  <CardDescription className="text-gray-300">
                    What you can do with the browser extension
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">One-click Etherscan analysis</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Multi-chain support</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Real-time vulnerability detection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Instant security reports</span>
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