import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  CreditCard, 
  FileText, 
  Settings as SettingsIcon,
  ArrowLeft, 
  Check, 
  X,
  Edit3,
  Save,
  Eye,
  Lock,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Gift,
  Globe,
  Key
} from 'lucide-react';
import { Link } from 'wouter';
import CreditDisplay from '@/components/CreditDisplay';
import CreditPurchase from '@/components/CreditPurchase';

export default function SettingsPage() {
  const { user } = useWeb3Auth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeSection, setActiveSection] = useState('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [auditCompleteNotifications, setAuditCompleteNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  
  // Privacy preferences
  const [publicProfile, setPublicProfile] = useState(false);
  const [showAuditHistory, setShowAuditHistory] = useState(true);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  
  // Credit balance data
  const { data: creditData } = useQuery({
    queryKey: ['/api/credits/balance'],
    enabled: !!user?.id
  });

  // Credit history data from transactions
  const { data: creditTransactions = [] } = useQuery({
    queryKey: ['/api/credits/transactions', user?.id],
    enabled: !!user?.id
  });

  // Live scans data
  const { data: liveScans } = useQuery({
    queryKey: ["/api/live-scans"],
    queryFn: () => fetch('/api/live-scans?limit=5').then(res => res.json()),
    refetchInterval: 30000,
  });

  // Format credit history from transactions
  const creditHistory = (creditTransactions as any[]).map((transaction: any) => ({
    date: new Date(transaction.createdAt).toLocaleString(),
    amount: transaction.type === 'usage' ? -transaction.credits : transaction.credits,
    type: transaction.type === 'usage' ? 'Spend' : transaction.type === 'purchase' ? 'Purchase' : 'Bonus',
    description: transaction.reason || 'Credit transaction'
  }));

  const sidebarItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'credits', label: 'Credits', icon: CreditCard },
    { id: 'blockchain', label: 'Live Scanning', icon: Globe },
    { id: 'referral', label: 'Referral', icon: Gift },
    { id: 'billing', label: 'Billing', icon: FileText },
  ];

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      toast({
        title: 'Error',
        description: 'Display name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/display-name', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ displayName: displayName.trim() })
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        setIsEditingDisplayName(false);
        // Update the local state to reflect the change immediately
        setDisplayName(displayName.trim());
        toast({
          title: 'Success',
          description: 'Display name updated successfully.',
        });
      } else {
        throw new Error('Failed to update display name');
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      toast({
        title: 'Error',
        description: 'Failed to update display name.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    toast({
      title: 'Saved',
      description: 'Notification preferences updated.',
    });
  };

  const handleSavePrivacyPreferences = async () => {
    toast({
      title: 'Saved',
      description: 'Privacy preferences updated.',
    });
  };

  const handleSaveThemePreferences = async () => {
    toast({
      title: 'Saved',
      description: 'Theme preferences updated.',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-slate-400 mb-6">Please log in to access settings.</p>
          <Link href="/auth">
            <Button className="bg-blue-600 hover:bg-blue-700">Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Profile details</h2>
        <p className="text-slate-400">Manage your account info.</p>
      </div>
      
      <div className="space-y-6">
        {/* Profile Info */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
              {(user.displayName || user.ensName || user.githubUsername || user.walletAddress)?.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-white">
                {user.displayName || user.ensName || user.githubUsername || 'Anonymous'}
              </div>
              <Button size="sm" variant="outline" className="text-xs border-slate-600 text-slate-300">
                Update profile
              </Button>
            </div>
          </div>
          
          {/* Display Name */}
          <div className="space-y-3">
            <Label className="text-white text-sm font-medium">Profile</Label>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {isEditingDisplayName ? (
                  <>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="flex-1 bg-slate-800 border-slate-600 text-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveDisplayName()}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveDisplayName}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? <Save className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingDisplayName(false);
                        setDisplayName(user?.displayName || '');
                      }}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-md text-white">
                      {displayName || user.displayName || user.ensName || user.githubUsername || 'Not set'}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingDisplayName(true)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Web3 wallets */}
        <div className="space-y-3">
          <Label className="text-white text-sm font-medium">Web3 wallets</Label>
          <div className="bg-slate-800/20 rounded-lg p-4 border border-slate-700/50">
            {user.walletAddress ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-white font-mono text-sm">
                    {`${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                  </span>
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Connected</span>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="link" className="text-blue-400 hover:text-blue-300">
                + Connect wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreditsSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Credits</h2>
        <p className="text-slate-400">Manage your account info.</p>
      </div>
      
      {/* Current Credit */}
      <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-400" />
            Current Credit
          </h3>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setShowCreditPurchase(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Buy more credits
            </Button>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
              <Gift className="h-4 w-4 mr-1" />
              Redeem Credits
            </Button>
          </div>
        </div>
        
        <div className="text-4xl font-bold text-teal-400 mb-2">
          {(creditData as any)?.balance || 1812}
        </div>
        <div className="text-sm text-slate-400">
          Total earned: {(creditData as any)?.totalEarned || 2000} • Total used: {(creditData as any)?.totalUsed || 188}
        </div>
      </div>
      
      {/* Credit History */}
      <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Credit History</h3>
        
        <div className="space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-4 text-xs text-slate-400 uppercase tracking-wide font-medium pb-3 border-b border-slate-700">
            <div>Date</div>
            <div>Amount</div>
            <div>Type</div>
          </div>
          
          {/* Table Rows */}
          {creditHistory.map((entry: any, index: number) => (
            <div key={index} className="grid grid-cols-3 gap-4 py-3 text-sm border-b border-slate-800/50 last:border-b-0">
              <div className="text-slate-300">{entry.date}</div>
              <div className={`font-medium ${
                entry.amount > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {entry.amount > 0 ? '+' : ''}{entry.amount}
              </div>
              <div className="text-slate-400">{entry.type}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-slate-950 flex" style={{ backgroundColor: '#020617' }}>
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/40 border-r border-slate-800/60 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <Link href="/auditor">
            <Button variant="ghost" size="sm" className="w-full justify-start text-slate-300 hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Auditor
            </Button>
          </Link>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 p-4">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === item.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* User Info */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {(user.displayName || user.ensName || user.githubUsername || user.walletAddress)?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">
                {user.displayName || user.ensName || user.githubUsername || 'Anonymous'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-slate-900/20 border-b border-slate-800/60 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">Account</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CreditCard className="h-4 w-4" />
                <span>Current Credit:</span>
                <span className="text-white font-medium">{(creditData as any)?.balance || 1812}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeSection === 'profile' && renderProfileSection()}
          {activeSection === 'credits' && renderCreditsSection()}
          {activeSection === 'blockchain' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Live Contract Scanning</h2>
                <p className="text-slate-400">Configure blockchain explorer APIs for automatic contract scanning.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Scanning Status */}
                <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Scanning Status</h3>
                    <Badge className="bg-green-500/20 text-green-300 border-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                      Active
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Daily Scans</span>
                      <span className="text-white font-medium">2 contracts/day</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Networks</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs border-blue-400 text-blue-300">Ethereum</Badge>
                        <Badge variant="outline" className="text-xs border-purple-400 text-purple-300">Polygon</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Next Scan</span>
                      <span className="text-white font-medium">In 6 hours</span>
                    </div>
                  </div>
                </div>

                {/* API Key Configuration */}
                <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">API Configuration</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-slate-300">Etherscan API Key</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          type="password"
                          placeholder="Configure in environment variables"
                          disabled
                          className="bg-slate-700/50 border-slate-600 text-slate-400"
                        />
                        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-300">Polygonscan API Key</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          type="password"
                          placeholder="Configure in environment variables"
                          disabled
                          className="bg-slate-700/50 border-slate-600 text-slate-400"
                        />
                        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-xs text-slate-500">
                        API keys enable automatic scanning of verified smart contracts from blockchain explorers. 
                        Configure ETHERSCAN_API_KEY and POLYGONSCAN_API_KEY in your environment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Live Scans */}
              <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Live Scans</h3>
                <div className="space-y-3">
                  {liveScans && liveScans.length > 0 ? (
                    liveScans.slice(0, 5).map((scan: any) => (
                      <div key={scan.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            scan.scanStatus === 'completed' ? 'bg-green-400' :
                            scan.scanStatus === 'scanning' ? 'bg-blue-400 animate-pulse' :
                            'bg-yellow-400'
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium text-white">{scan.contractName || 'Unknown Contract'}</p>
                            <p className="text-xs text-slate-400 font-mono">{scan.contractAddress?.slice(0, 10)}...{scan.contractAddress?.slice(-6)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-xs ${scan.network === 'ethereum' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                            {scan.network}
                          </Badge>
                          {scan.securityScore && (
                            <p className="text-xs text-slate-400 mt-1">Score: {scan.securityScore}/100</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Globe className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No live scans yet. Configure API keys to enable automatic scanning.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeSection === 'referral' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Referral Program</h2>
                <p className="text-slate-400">Invite friends and earn credits.</p>
              </div>
              <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
                <p className="text-slate-400">Refer friends and get bonus credits!</p>
              </div>
            </div>
          )}
          {activeSection === 'billing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Billing</h2>
                <p className="text-slate-400">Manage your billing and subscription.</p>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-2">Pay-as-you-go</h3>
                  <p className="text-slate-400 mb-4">You're currently on our flexible credit system.</p>
                  <Button 
                    onClick={() => setShowCreditPurchase(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Purchase Credits
                  </Button>
                </div>
                
                <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-2">Payment Method</h3>
                  <p className="text-slate-400 mb-4">Secure payments via PayPal</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-slate-400" />
                      <span className="text-slate-300">PayPal Payment</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Credit Purchase Modal */}
      {showCreditPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-1 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CreditPurchase 
              userId={user?.id || ''} 
              onClose={() => setShowCreditPurchase(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}