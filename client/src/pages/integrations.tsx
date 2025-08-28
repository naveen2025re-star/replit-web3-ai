import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Github, 
  GitBranch, 
  Settings, 
  Code, 
  Download, 
  ExternalLink, 
  Copy,
  Zap,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function IntegrationsPage() {
  const [githubForm, setGithubForm] = useState({
    owner: '',
    repo: '',
    branch: 'main',
    githubToken: ''
  });
  const [cicdConfig, setCicdConfig] = useState('');
  const [selectedCicdType, setSelectedCicdType] = useState<'github-actions' | 'jenkins'>('github-actions');
  const [selectedProjectType, setSelectedProjectType] = useState<'hardhat' | 'truffle' | 'foundry'>('hardhat');
  const { toast } = useToast();

  const githubScanMutation = useMutation({
    mutationFn: async (data: typeof githubForm) => {
      const response = await apiRequest('POST', '/api/integrations/github/scan', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "GitHub Scan Initiated",
        description: `Found ${data.scan.totalFiles} Solidity files in ${data.repository.fullName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "GitHub Scan Failed",
        description: error.message || "Failed to scan repository",
        variant: "destructive",
      });
    },
  });

  const cicdConfigMutation = useMutation({
    mutationFn: async ({ type, project }: { type: string; project?: string }) => {
      const params = project ? `?project=${project}` : '';
      const response = await apiRequest('GET', `/api/integrations/cicd/config/${type}${params}`);
      return response.json();
    },
    onSuccess: (data) => {
      setCicdConfig(data.config);
      toast({
        title: "Configuration Generated",
        description: `${data.type} configuration ready for download`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to generate configuration",
        variant: "destructive",
      });
    },
  });

  const handleGithubScan = () => {
    if (!githubForm.owner || !githubForm.repo || !githubForm.githubToken) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    githubScanMutation.mutate(githubForm);
  };

  const handleGenerateConfig = () => {
    const type = selectedCicdType;
    const project = selectedCicdType === 'github-actions' ? selectedProjectType : undefined;
    cicdConfigMutation.mutate({ type, project });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Configuration copied to clipboard",
    });
  };

  const downloadConfig = () => {
    const filename = selectedCicdType === 'github-actions' ? '.github/workflows/smartaudit.yml' : 'Jenkinsfile';
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
                    Repository Scanner
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Scan GitHub repositories for smart contract vulnerabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="owner" className="text-white">Repository Owner</Label>
                      <Input
                        id="owner"
                        placeholder="ethereum"
                        value={githubForm.owner}
                        onChange={(e) => setGithubForm(prev => ({ ...prev, owner: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        data-testid="input-github-owner"
                      />
                    </div>
                    <div>
                      <Label htmlFor="repo" className="text-white">Repository Name</Label>
                      <Input
                        id="repo"
                        placeholder="solidity"
                        value={githubForm.repo}
                        onChange={(e) => setGithubForm(prev => ({ ...prev, repo: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        data-testid="input-github-repo"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="branch" className="text-white">Branch</Label>
                    <Input
                      id="branch"
                      placeholder="main"
                      value={githubForm.branch}
                      onChange={(e) => setGithubForm(prev => ({ ...prev, branch: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      data-testid="input-github-branch"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="token" className="text-white">GitHub Personal Access Token</Label>
                    <Input
                      id="token"
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxx"
                      value={githubForm.githubToken}
                      onChange={(e) => setGithubForm(prev => ({ ...prev, githubToken: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      data-testid="input-github-token"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Need repo access permissions. <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token" target="_blank" className="text-blue-400 hover:underline">Learn how to create one</a>
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleGithubScan}
                    disabled={githubScanMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    data-testid="button-scan-github"
                  >
                    {githubScanMutation.isPending ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-spin" />
                        Scanning Repository...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Scan Repository
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <GitBranch className="h-5 w-5 mr-2 text-green-400" />
                    Webhook Setup
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Automatically scan pull requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Webhook URL</p>
                        <p className="text-gray-400 text-sm">Use this URL in your repository settings</p>
                      </div>
                      <Badge variant="outline" className="border-green-400 text-green-300">
                        Ready
                      </Badge>
                    </div>
                    
                    <div className="p-3 bg-slate-700 rounded border font-mono text-sm text-gray-300">
                      https://your-domain.com/api/integrations/github/webhook
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('https://your-domain.com/api/integrations/github/webhook')}
                        className="ml-2"
                        data-testid="button-copy-webhook"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <p className="text-white font-medium">Setup Instructions:</p>
                      <ol className="text-gray-300 space-y-1 list-decimal list-inside">
                        <li>Go to Repository Settings → Webhooks</li>
                        <li>Add webhook with the URL above</li>
                        <li>Select "Pull requests" and "Pushes" events</li>
                        <li>Set Content type to "application/json"</li>
                      </ol>
                    </div>
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
                    <Settings className="h-5 w-5 mr-2 text-purple-400" />
                    CI/CD Configuration
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Generate configuration files for your CI/CD pipeline
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cicd-type" className="text-white">CI/CD Platform</Label>
                    <Select value={selectedCicdType} onValueChange={(value: any) => setSelectedCicdType(value)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-cicd-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="github-actions">GitHub Actions</SelectItem>
                        <SelectItem value="jenkins">Jenkins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedCicdType === 'github-actions' && (
                    <div>
                      <Label htmlFor="project-type" className="text-white">Project Type</Label>
                      <Select value={selectedProjectType} onValueChange={(value: any) => setSelectedProjectType(value)}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-project-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hardhat">Hardhat</SelectItem>
                          <SelectItem value="truffle">Truffle</SelectItem>
                          <SelectItem value="foundry">Foundry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleGenerateConfig}
                    disabled={cicdConfigMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    data-testid="button-generate-config"
                  >
                    {cicdConfigMutation.isPending ? (
                      <>
                        <Code className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Code className="h-4 w-4 mr-2" />
                        Generate Configuration
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {cicdConfig && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      Configuration File
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(cicdConfig)}
                          data-testid="button-copy-config"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={downloadConfig}
                          data-testid="button-download-config"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-slate-900 p-4 rounded text-xs text-gray-300 overflow-x-auto max-h-96">
                      {cicdConfig}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Browser Extension */}
          <TabsContent value="browser">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <ExternalLink className="h-5 w-5 mr-2 text-orange-400" />
                  Browser Extension
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Scan smart contracts directly from Etherscan and other block explorers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Features</h3>
                    <ul className="space-y-2">
                      {[
                        'One-click scanning from Etherscan',
                        'Support for verified contracts',
                        'Inline security warnings',
                        'Quick vulnerability assessment',
                        'Multi-chain support'
                      ].map((feature, index) => (
                        <li key={index} className="flex items-center text-gray-300">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Coming Soon</h3>
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-orange-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-orange-200 font-medium">In Development</p>
                          <p className="text-orange-300/80 text-sm mt-1">
                            The browser extension is currently in development. Sign up to be notified when it's available.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      disabled
                      data-testid="button-extension-notify"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get Notified
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}