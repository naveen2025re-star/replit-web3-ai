import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Gift
} from 'lucide-react';
import { Link } from 'wouter';
import CreditDisplay from '@/components/CreditDisplay';

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
  
  // Credit balance data
  const { data: creditData } = useQuery({
    queryKey: ['/api/credits/balance'],
    enabled: !!user?.id
  });

  // Mock credit history data (replace with real API)
  const creditHistory = [
    { date: '2025-08-23 08:30', amount: -102, type: 'Spend', description: 'Smart contract analysis - security' },
    { date: '2025-08-01 17:38', amount: -246, type: 'Spend', description: 'Smart contract analysis - security' },
    { date: '2025-08-01 17:27', amount: -287, type: 'Spend', description: 'Smart contract analysis - security' },
    { date: '2025-08-01 17:25', amount: -137, type: 'Spend', description: 'Smart contract analysis - security' },
    { date: '2025-08-01 17:15', amount: +500, type: 'Promo Code', description: 'Welcome bonus credits' },
  ];

  const sidebarItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'credits', label: 'Credits', icon: CreditCard },
    { id: 'referral', label: 'Referral', icon: Gift },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
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
            <Button>Log In</Button>
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
        <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
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
                      {user.displayName || user.ensName || user.githubUsername || 'Not set'}
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
        
        {/* Email addresses */}
        <div className="space-y-3">
          <Label className="text-white text-sm font-medium">Email addresses</Label>
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">N</span>
                </div>
                <span className="text-white">{user.email || 'noven2025re...'}  </span>
                <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Primary</span>
              </div>
              <Button size="sm" variant="link" className="text-teal-400 hover:text-teal-300">
                + Add email address
              </Button>
            </div>
          </div>
        </div>
        
        {/* Connected accounts */}
        <div className="space-y-3">
          <Label className="text-white text-sm font-medium">Connected accounts</Label>
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">🔍</span>
                </div>
                <span className="text-white">Google • noven2025re...</span>
              </div>
              <Button size="sm" variant="link" className="text-teal-400 hover:text-teal-300">
                + Connect account
              </Button>
            </div>
          </div>
        </div>
        
        {/* Web3 wallets */}
        <div className="space-y-3">
          <Label className="text-white text-sm font-medium">Web3 wallets</Label>
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <Button size="sm" variant="link" className="text-teal-400 hover:text-teal-300">
              + Connect wallet
            </Button>
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
      <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-400" />
            Current Credit
          </h3>
          <div className="flex gap-2">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
              Buy more credits
            </Button>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
              <Gift className="h-4 w-4 mr-1" />
              Redeem Credits
            </Button>
          </div>
        </div>
        
        <div className="text-4xl font-bold text-teal-400 mb-2">
          {(creditData as any)?.balance || 0}
        </div>
        <div className="text-sm text-slate-400">
          Total earned: {(creditData as any)?.totalEarned || 0} • Total used: {(creditData as any)?.totalUsed || 0}
        </div>
      </div>
      
      {/* Credit History */}
      <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Credit History</h3>
        
        <div className="space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-4 text-xs text-slate-400 uppercase tracking-wide font-medium pb-3 border-b border-slate-700">
            <div>Date</div>
            <div>Amount</div>
            <div>Type</div>
          </div>
          
          {/* Table Rows */}
          {creditHistory.map((entry, index) => (
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

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Security</h2>
        <p className="text-slate-400">Manage your security settings.</p>
      </div>
      
      <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h3>
        <p className="text-slate-400 mb-4">Add an extra layer of security to your account.</p>
        <Button className="bg-blue-600 hover:bg-blue-700">Enable 2FA</Button>
      </div>
    </div>
  );

  const renderSettingsSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-slate-400">Customize your experience.</p>
      </div>
      
      <div className="space-y-4">
        <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Email Notifications</div>
              <div className="text-sm text-slate-400">Receive notifications via email</div>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
        </div>
        
        <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Public Profile</div>
              <div className="text-sm text-slate-400">Allow others to view your profile</div>
            </div>
            <Switch
              checked={publicProfile}
              onCheckedChange={setPublicProfile}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col">
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
              <div className="text-xs text-slate-400">Secured by clerk</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-slate-900/30 border-b border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">Account</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <TrendingUp className="h-4 w-4" />
                <span>Scan Status</span>
                <span className="text-white font-medium">0/0</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CreditCard className="h-4 w-4" />
                <span>Current Credit:</span>
                <span className="text-white font-medium">{(creditData as any)?.balance || 0}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeSection === 'profile' && renderProfileSection()}
          {activeSection === 'credits' && renderCreditsSection()}
          {activeSection === 'security' && renderSecuritySection()}
          {activeSection === 'settings' && renderSettingsSection()}
          {activeSection === 'referral' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Referral Program</h2>
                <p className="text-slate-400">Invite friends and earn credits.</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700 text-center">
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
              <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-2">Pay-as-you-go</h3>
                <p className="text-slate-400 mb-4">You're currently on our flexible credit system.</p>
                <Button className="bg-blue-600 hover:bg-blue-700">Purchase Credits</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}