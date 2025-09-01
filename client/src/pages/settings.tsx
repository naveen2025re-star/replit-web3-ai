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
  Key,
  Coins
} from 'lucide-react';
import { Link } from 'wouter';
import CreditDisplay from '@/components/CreditDisplay';
import CreditPurchase from '@/components/CreditPurchase';
import { CreditTracker } from '@/components/CreditTracker';
import { ReferralCard } from '@/components/ReferralCard';

export default function SettingsPage() {
  const { user } = useWeb3Auth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Handle PayPal payment results from URL parameters
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const amount = urlParams.get('amount');
    const currency = urlParams.get('currency');
    const paymentId = urlParams.get('paymentId');
    const message = urlParams.get('message');
    
    if (paymentStatus) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (paymentStatus === 'success') {
        toast({
          title: "Payment Successful!",
          description: `Successfully processed payment of ${amount} ${currency}. Your credits have been added.`,
        });
        // Refresh credit balance
        queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
        // Set active section to credits
        setActiveSection('credits');
      } else if (paymentStatus === 'cancelled') {
        toast({
          title: "Payment Cancelled",
          description: "Payment was cancelled. No charges were made.",
          variant: "destructive",
        });
      } else if (paymentStatus === 'error') {
        toast({
          title: "Payment Error",
          description: message ? decodeURIComponent(message) : "Payment failed. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [toast, queryClient]);
  
  const [activeSection, setActiveSection] = useState('profile');
  const [displayName, setDisplayName] = useState('');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize display name when user data loads
  React.useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    } else if (user?.ensName) {
      setDisplayName(user.ensName);
    } else if (user?.githubUsername) {
      setDisplayName(user.githubUsername);
    }
  }, [user?.displayName, user?.ensName, user?.githubUsername]);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [auditCompleteNotifications, setAuditCompleteNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  
  // Privacy preferences
  const [publicProfile, setPublicProfile] = useState(false);
  const [showAuditHistory, setShowAuditHistory] = useState(true);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  
  // Credit balance data
  const { data: creditData, isLoading: creditsLoading, error: creditsError } = useQuery({
    queryKey: ['/api/credits/balance', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await fetch(`/api/credits/balance?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    retry: 3
  });

  // Credit history data from transactions
  const { data: creditTransactions = [] } = useQuery({
    queryKey: ['/api/credits/transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/credits/transactions/${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 60000
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
    { id: 'analytics', label: 'Credit Analytics', icon: TrendingUp },
    { id: 'security', label: 'Security', icon: Shield },
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
        queryClient.invalidateQueries({ queryKey: [`/api/auth/user/${user?.walletAddress}`] });
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
              {(displayName || user.displayName || user.ensName || user.githubUsername || user.walletAddress)?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-white">
                {displayName || user.displayName || user.ensName || user.githubUsername || user.walletAddress?.slice(0, 12) || 'User'}
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
                      {displayName || user?.displayName || user?.ensName || user?.githubUsername || user?.walletAddress?.slice(0, 12) || 'Not set'}
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

  const renderAnalyticsSection = () => (
    <CreditTracker 
      userId={user?.id}
      showPurchaseModal={showCreditPurchase}
      onPurchaseModalChange={setShowCreditPurchase}
    />
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
        
        {creditsLoading ? (
          <div className="text-2xl font-bold text-slate-400 mb-2">Loading...</div>
        ) : creditsError ? (
          <div className="text-2xl font-bold text-red-400 mb-2">Error loading credits</div>
        ) : (
          <div className="text-4xl font-bold text-teal-400 mb-2">
            {(creditData as any)?.balance || 0}
          </div>
        )}
        <div className="text-sm text-slate-400">
          {creditsLoading ? (
            'Loading credit statistics...'
          ) : creditsError ? (
            'Failed to load credit information'
          ) : (
            <>Total earned: {(creditData as any)?.totalEarned || 0} • Total used: {(creditData as any)?.totalUsed || 0}</>
          )}
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
          {creditHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              {creditsLoading ? 'Loading transactions...' : 'No credit transactions yet'}
            </div>
          ) : (
            creditHistory.map((entry: any, index: number) => (
              <div key={index} className="grid grid-cols-3 gap-4 py-3 text-sm border-b border-slate-800/50 last:border-b-0">
                <div className="text-slate-300">{new Date(entry.date).toLocaleDateString()}</div>
                <div className={`font-medium ${
                  entry.amount > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount}
                </div>
                <div className="text-slate-400">{entry.type}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Security Settings</h2>
        <p className="text-slate-400">Manage your account security and privacy settings.</p>
      </div>
      
      <div className="space-y-6">
        {/* Security Overview */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Security Status</h3>
            <Badge className="bg-green-500/20 text-green-300 border-green-400">Secure</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-slate-300">Wallet Connected</span>
              </div>
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-slate-300">Two-Factor Auth</span>
              </div>
              <Check className="h-4 w-4 text-green-400" />
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Privacy & Visibility</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Public Profile</Label>
                <p className="text-sm text-slate-400">Allow others to see your profile and audit history</p>
              </div>
              <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Show Audit History</Label>
                <p className="text-sm text-slate-400">Display your audit history on your public profile</p>
              </div>
              <Switch checked={showAuditHistory} onCheckedChange={setShowAuditHistory} />
            </div>
          </div>
        </div>

        {/* Session Management */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Session Management</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
              <div>
                <div className="text-sm text-white">Current Session</div>
                <div className="text-xs text-slate-400">
                  Started {new Date(Date.now() - Math.random() * 7200000).toLocaleString()} • 
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'} on 
                  {navigator.platform.includes('Mac') ? 'macOS' : 
                   navigator.platform.includes('Win') ? 'Windows' : 
                   navigator.platform.includes('Linux') ? 'Linux' : 'Unknown'}
                </div>
              </div>
              <Badge variant="outline" className="border-green-400 text-green-300">Active</Badge>
            </div>
            {user?.walletAddress && (
              <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                <div>
                  <div className="text-sm text-white">Wallet Session</div>
                  <div className="text-xs text-slate-400 font-mono">
                    {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                  </div>
                </div>
                <Badge variant="outline" className="border-blue-400 text-blue-300">Connected</Badge>
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full border-red-400 text-red-300 hover:bg-red-500/10"
              onClick={() => {
                toast({
                  title: 'Sessions Revoked',
                  description: 'All active sessions have been terminated. You will need to reconnect.',
                  variant: 'destructive'
                });
                // In a real app, this would call an API to revoke sessions
                setTimeout(() => window.location.reload(), 2000);
              }}
            >
              <Lock className="h-4 w-4 mr-2" />
              Revoke All Sessions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Notification Preferences</h2>
        <p className="text-slate-400">Choose what notifications you want to receive.</p>
      </div>
      
      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Email Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Audit Completion</Label>
                <p className="text-sm text-slate-400">Get notified when your audit analysis is complete</p>
              </div>
              <Switch checked={auditCompleteNotifications} onCheckedChange={setAuditCompleteNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Security Alerts</Label>
                <p className="text-sm text-slate-400">Important security notifications and alerts</p>
              </div>
              <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Weekly Reports</Label>
                <p className="text-sm text-slate-400">Weekly summary of your audit activity</p>
              </div>
              <Switch checked={weeklyReports} onCheckedChange={setWeeklyReports} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Marketing Emails</Label>
                <p className="text-sm text-slate-400">Product updates and promotional emails</p>
              </div>
              <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Browser Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Real-time Alerts</Label>
                <p className="text-sm text-slate-400">Get instant notifications in your browser</p>
              </div>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                Enable
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Sound Notifications</Label>
                <p className="text-sm text-slate-400">Play sound when receiving notifications</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAPISection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">API Access</h2>
        <p className="text-slate-400">Manage your API keys and integration settings.</p>
      </div>
      
      <div className="space-y-6">
        {/* API Keys */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">API Keys</h3>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Key className="h-4 w-4 mr-2" />
              Generate New Key
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
              <div>
                <div className="text-sm text-white font-mono">sk_live_****************************************</div>
                <div className="text-xs text-slate-400">Created on Dec 25, 2024 • Last used 2 hours ago</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="border-red-400 text-red-300">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* API Usage */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Usage Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-900/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">1,247</div>
              <div className="text-sm text-slate-400">API Calls Today</div>
            </div>
            <div className="text-center p-4 bg-slate-900/30 rounded-lg">
              <div className="text-2xl font-bold text-green-400">99.9%</div>
              <div className="text-sm text-slate-400">Uptime</div>
            </div>
            <div className="text-center p-4 bg-slate-900/30 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">145ms</div>
              <div className="text-sm text-slate-400">Avg Response</div>
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Developer Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start border-slate-600 text-slate-300 h-auto p-4">
              <FileText className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">API Documentation</div>
                <div className="text-xs text-slate-400">Complete integration guide</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start border-slate-600 text-slate-300 h-auto p-4">
              <Shield className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Security Guide</div>
                <div className="text-xs text-slate-400">Best practices for API security</div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex" style={{ backgroundColor: '#020617', minHeight: '100vh' }}>
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
                {user.displayName || user.ensName || user.githubUsername || user.walletAddress?.slice(0, 12) || 'User'}
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
        <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-slate-950/50 via-slate-900/30 to-slate-950/50">
          {activeSection === 'profile' && renderProfileSection()}
          {activeSection === 'credits' && renderCreditsSection()}
          {activeSection === 'analytics' && renderAnalyticsSection()}
          {activeSection === 'security' && renderSecuritySection()}
          {activeSection === 'referral' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Referral Program</h2>
                <p className="text-slate-400">Invite friends and earn credits together.</p>
              </div>
              {/* <ReferralCard userId={user?.walletAddress || "demo-user"} /> */}
              <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/50">
                <div className="text-center">
                  <Gift className="h-12 w-12 text-teal-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
                  <p className="text-slate-400">Referral program will be available soon.</p>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'billing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Billing & Payment History</h2>
                <p className="text-slate-400">Track your credit purchases and transaction history.</p>
              </div>
              
              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/20 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-slate-400">Total Spent</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    ${creditTransactions ? 
                      creditTransactions
                        .filter((t: any) => t.type === 'purchase')
                        .reduce((sum: number, t: any) => sum + (t.metadata?.amount || 0), 0) / 100
                        .toFixed(2) 
                      : '0.00'}
                  </div>
                  <div className="text-xs text-slate-400">Lifetime</div>
                </div>
                
                <div className="bg-slate-800/20 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-slate-400">Credits Purchased</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {creditTransactions ? 
                      creditTransactions
                        .filter((t: any) => t.type === 'purchase')
                        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
                        .toLocaleString() 
                      : '0'}
                  </div>
                  <div className="text-xs text-slate-400">Total</div>
                </div>
                
                <div className="bg-slate-800/20 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-slate-400">Transactions</span>
                  </div>
                  <div className="text-xl font-bold text-white">{creditTransactions?.length || 0}</div>
                  <div className="text-xs text-slate-400">This month</div>
                </div>
              </div>

              {/* Payment Model Info */}
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-6 border border-slate-700/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">💳 Pay-per-use Model</h3>
                    <p className="text-slate-300 mb-4">
                      Simple and transparent credit-based billing. Only pay for what you use.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span>No monthly subscriptions or hidden fees</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span>Credits never expire</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        <span>Secure payments via PayPal</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-6">
                    <Button 
                      onClick={() => setShowCreditPurchase(true)}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-emerald-500/30"
                      data-testid="button-purchase-credits"
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      Purchase Credits
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              {creditTransactions && creditTransactions.length > 0 && (
                <div className="bg-slate-800/20 rounded-lg border border-slate-700/50">
                  <div className="p-4 border-b border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {creditTransactions.slice(0, 5).map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            transaction.type === 'purchase' ? 'bg-green-500/20' : 
                            transaction.type === 'deduction' ? 'bg-red-500/20' : 
                            'bg-blue-500/20'
                          }`}>
                            {transaction.type === 'purchase' ? (
                              <CreditCard className="h-4 w-4 text-green-400" />
                            ) : transaction.type === 'deduction' ? (
                              <Coins className="h-4 w-4 text-red-400" />
                            ) : (
                              <Gift className="h-4 w-4 text-blue-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {transaction.reason}
                            </div>
                            <div className="text-xs text-slate-400">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                          </div>
                          <div className="text-xs text-slate-400">
                            Balance: {transaction.balanceAfter}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {false && (
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
            </div>
          )}
        </div>
      </div>
      
      {/* Credit Purchase Modal */}
      <CreditPurchase 
        open={showCreditPurchase}
        onOpenChange={setShowCreditPurchase}
        userId={user?.id || ''} 
        onClose={() => setShowCreditPurchase(false)}
      />
    </div>
  );
}