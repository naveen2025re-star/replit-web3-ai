import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Code, 
  Copy, 
  ExternalLink, 
  Shield, 
  Zap, 
  Cpu, 
  Globe, 
  ArrowLeft,
  CheckCircle,
  Terminal,
  Wrench,
  Bot,
  Download,
  Link as LinkIcon,
  BookOpen
} from 'lucide-react';
import { Link } from 'wouter';

export default function MCPInfoPage() {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState<string>('');

  // Get the current domain for the MCP URLs
  const currentDomain = window.location.origin;
  const mcpStreamUrl = `${currentDomain}/api/mcp`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedText(''), 2000);
  };

  const claudeConfig = `{
  "mcpServers": {
    "smartaudit-ai": {
      "command": "npx",
      "args": ["mcp-remote", "${mcpStreamUrl}"]
    }
  }
}`;

  const cursorConfig = `{
  "mcpServers": {
    "smartaudit-ai": {
      "url": "${mcpStreamUrl}"
    }
  }
}`;

  const windsurfConfig = `{
  "mcpServers": {
    "smartauditai": {
      "serverUrl": "${mcpStreamUrl}"
    }
  }
}`;

  const vscodeConfig = `{
  "mcpServers": {
    "smartauditai": {
      "url": "${mcpStreamUrl}"
    }
  }
}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Bot className="h-12 w-12 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            SmartAudit AI <span className="text-blue-400">MCP</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Connect your AI assistants to our smart contract auditing platform using the Model Context Protocol
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Live & Ready
            </Badge>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              Remote MCP Server
            </Badge>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="text-center">
              <Shield className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <CardTitle className="text-white">Secure Authentication</CardTitle>
              <CardDescription>Web3 wallet-based authentication</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="text-center">
              <Zap className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <CardTitle className="text-white">Real-time Auditing</CardTitle>
              <CardDescription>AI-powered contract analysis</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="text-center">
              <Cpu className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <CardTitle className="text-white">Multiple IDEs</CardTitle>
              <CardDescription>Claude, Cursor, Windsurf, VS Code support</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Connection Info */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              MCP Server Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">MCP Stream URL:</span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => copyToClipboard(mcpStreamUrl, 'MCP URL')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {copiedText === 'MCP URL' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <code className="text-blue-300 font-mono text-sm break-all">{mcpStreamUrl}</code>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-900 rounded-lg border border-slate-700">
                <Terminal className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <div className="text-sm text-slate-300">Protocol</div>
                <div className="font-mono text-white">MCP v2024-11-05</div>
              </div>
              <div className="text-center p-4 bg-slate-900 rounded-lg border border-slate-700">
                <Wrench className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <div className="text-sm text-slate-300">Available Tools</div>
                <div className="font-mono text-white">4 Smart Contract Tools</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Tabs */}
        <Tabs defaultValue="windsurf" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border border-slate-700">
            <TabsTrigger value="windsurf" className="data-[state=active]:bg-slate-700">Windsurf ✅</TabsTrigger>
            <TabsTrigger value="claude" className="data-[state=active]:bg-slate-700">Claude Desktop</TabsTrigger>
            <TabsTrigger value="cursor" className="data-[state=active]:bg-slate-700">Cursor</TabsTrigger>
            <TabsTrigger value="vscode" className="data-[state=active]:bg-slate-700">VS Code</TabsTrigger>
          </TabsList>

          <TabsContent value="claude" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Setup for Claude Desktop</CardTitle>
                <CardDescription>Add SmartAudit AI to your Claude Desktop configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-white">1. Prerequisites</h4>
                  <div className="text-sm text-slate-300 space-y-1">
                    <p>• Install Node.js from <a href="https://nodejs.org" target="_blank" className="text-blue-400 hover:text-blue-300">nodejs.org</a></p>
                    <p>• Run: <code className="bg-slate-700 px-2 py-1 rounded text-blue-300">npm install -g npx</code></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-white">2. Configuration File Location</h4>
                  <div className="text-sm text-slate-300 space-y-1">
                    <p>• <strong>macOS:</strong> <code className="bg-slate-700 px-2 py-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code></p>
                    <p>• <strong>Windows:</strong> <code className="bg-slate-700 px-2 py-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">3. Add Configuration</h4>
                    <Button 
                      size="sm" 
                      onClick={() => copyToClipboard(claudeConfig, 'Claude config')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {copiedText === 'Claude config' ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      Copy Config
                    </Button>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <pre className="text-blue-300 font-mono text-sm overflow-x-auto">{claudeConfig}</pre>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <strong>💡 Tip:</strong> After adding the configuration, restart Claude Desktop to load the MCP server.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cursor" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Setup for Cursor</CardTitle>
                <CardDescription>Integrate SmartAudit AI with Cursor IDE</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-white">1. Open Cursor Settings</h4>
                  <p className="text-sm text-slate-300">Go to Settings → Tools & Integrations → Add Custom MCP</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">2. Add MCP Configuration</h4>
                    <Button 
                      size="sm" 
                      onClick={() => copyToClipboard(cursorConfig, 'Cursor config')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {copiedText === 'Cursor config' ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      Copy Config
                    </Button>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <pre className="text-blue-300 font-mono text-sm overflow-x-auto">{cursorConfig}</pre>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <p className="text-green-300 text-sm">
                    <strong>✅ Ready:</strong> Save the configuration and restart Cursor to start using SmartAudit AI tools.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="windsurf" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Setup for Windsurf (TESTED & WORKING)
                </CardTitle>
                <CardDescription>Connect SmartAudit AI with Windsurf IDE - fully compatible!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <p className="text-green-300 text-sm font-medium">
                    ✅ **CONFIRMED WORKING** - This configuration has been tested and works perfectly with Windsurf!
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-white">1. Access MCP Settings</h4>
                  <p className="text-sm text-slate-300">Open Windsurf → Preferences → Extensions → Model Context Protocol</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">2. Add SmartAudit AI Server</h4>
                    <Button 
                      size="sm" 
                      onClick={() => copyToClipboard(windsurfConfig, 'Windsurf config')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {copiedText === 'Windsurf config' ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      Copy Working Config
                    </Button>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <pre className="text-green-300 font-mono text-sm overflow-x-auto">{windsurfConfig}</pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-white">3. Test Connection</h4>
                  <p className="text-sm text-slate-300">After saving the config, restart Windsurf and try:</p>
                  <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <code className="text-blue-300 text-sm">Authenticate my wallet: 0x2F0a57cDA71582B8f875F60745C771d1Ac09DeC0</code>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <p className="text-green-300 text-sm">
                    <strong>🎉 Success!</strong> You'll see 4 SmartAudit AI tools: authenticate_wallet, audit_contract, check_credits, and get_audit_results.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="vscode" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Setup for VS Code</CardTitle>
                <CardDescription>Connect SmartAudit AI with VS Code extensions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-white">1. Install MCP Extension</h4>
                  <p className="text-sm text-slate-300">Install a compatible MCP extension from the VS Code marketplace</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">2. Add MCP Configuration</h4>
                    <Button 
                      size="sm" 
                      onClick={() => copyToClipboard(vscodeConfig, 'VS Code config')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {copiedText === 'VS Code config' ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      Copy Config
                    </Button>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <pre className="text-blue-300 font-mono text-sm overflow-x-auto">{vscodeConfig}</pre>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <strong>📝 Note:</strong> VS Code MCP support varies by extension. Check your specific MCP extension documentation for setup details.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Available Tools */}
        <Card className="bg-slate-800/50 border-slate-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Available MCP Tools</CardTitle>
            <CardDescription>Smart contract auditing tools available through your AI assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="border border-slate-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">🔐 authenticate_wallet</h4>
                  <p className="text-sm text-slate-300 mb-3">Connect your Web3 wallet for secure access</p>
                  <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <code className="text-blue-300 text-xs">Authenticate my wallet: 0x123...</code>
                  </div>
                </div>

                <div className="border border-slate-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">💰 check_credits</h4>
                  <p className="text-sm text-slate-300 mb-3">View your credit balance and audit history</p>
                  <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <code className="text-blue-300 text-xs">How many credits do I have?</code>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">🔍 audit_contract</h4>
                  <p className="text-sm text-slate-300 mb-3">Comprehensive security audit (10 credits)</p>
                  <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <code className="text-blue-300 text-xs">Audit this smart contract: [paste code]</code>
                  </div>
                </div>

                <div className="border border-slate-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">📊 get_audit_results</h4>
                  <p className="text-sm text-slate-300 mb-3">Retrieve previous audit session results</p>
                  <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <code className="text-blue-300 text-xs">Show results for session: audit-123</code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Examples */}
        <Card className="bg-slate-800/50 border-slate-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Example Conversation</CardTitle>
            <CardDescription>See how to use SmartAudit AI through your AI assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="text-sm text-slate-400 mb-2">👤 User:</div>
                <p className="text-white">"Authenticate my wallet: 0x2F0a57cDA71582B8f875F60745C771d1Ac09DeC0"</p>
              </div>
              
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                <div className="text-sm text-blue-400 mb-2">🤖 AI Assistant:</div>
                <p className="text-blue-100">🎉 <strong>Authentication Successful!</strong><br/><br/>
                <strong>Welcome back!</strong> Your wallet is now connected.<br/>
                💰 <strong>Credits Available</strong>: 50<br/><br/>
                ✅ You can now audit smart contracts, check your history, and manage your credits through this AI interface.</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="text-sm text-slate-400 mb-2">👤 User:</div>
                <p className="text-white">"Audit this ERC-20 token contract: [paste Solidity code]"</p>
              </div>

              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <div className="text-sm text-green-400 mb-2">🤖 AI Assistant:</div>
                <p className="text-green-100">🔍 <strong>Smart Contract Audit Complete!</strong><br/><br/>
                <strong>Found 3 Issues:</strong><br/>
                • HIGH: Reentrancy vulnerability in transfer function<br/>
                • MEDIUM: Missing overflow protection<br/>
                • LOW: Lack of event emissions<br/><br/>
                <strong>Cost:</strong> 10 credits used, 40 remaining<br/>
                <strong>Session ID:</strong> audit-abc123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Link href="/auditor">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Try Web Interface
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/community">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:text-white">
                <BookOpen className="h-4 w-4 mr-2" />
                View Community Audits
              </Button>
            </Link>
          </div>
          <p className="text-slate-400 text-sm">
            SmartAudit AI MCP • Secure • Reliable • Production Ready
          </p>
        </div>
      </div>
    </div>
  );
}