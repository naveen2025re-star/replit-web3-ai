import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  ArrowLeft, 
  Check, 
  X,
  Edit3,
  Save,
  Settings as SettingsIcon
} from 'lucide-react';
import { Link } from 'wouter';

export default function SettingsPage() {
  const { user } = useWeb3Auth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  
  // Theme preferences
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');

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

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/auditor">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Auditor
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="text-slate-400">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="profile" className="data-[state=active]:bg-slate-700">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-700">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-slate-700">
              <Shield className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-slate-700">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Update your profile details and public information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                    {(user.displayName || user.ensName || user.githubUsername || user.walletAddress)?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Profile Avatar</h3>
                    <p className="text-sm text-slate-400">Your avatar is automatically generated from your display name or wallet address.</p>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white">Display Name</Label>
                  <div className="flex items-center gap-3">
                    {isEditingDisplayName ? (
                      <>
                        <Input
                          id="displayName"
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

                {/* Wallet Address */}
                <div className="space-y-2">
                  <Label className="text-white">Wallet Address</Label>
                  <div className="px-3 py-2 bg-slate-800/30 border border-slate-700 rounded-md text-slate-300 font-mono text-sm">
                    {user.walletAddress || 'Not connected'}
                  </div>
                </div>

                {/* Account Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                  <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                    <div className="text-xl font-bold text-blue-400">{user.credits || 0}</div>
                    <div className="text-sm text-slate-400">Credits Remaining</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                    <div className="text-xl font-bold text-green-400">{user.totalCreditsUsed || 0}</div>
                    <div className="text-sm text-slate-400">Credits Used</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                    <div className="text-xl font-bold text-purple-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                    <div className="text-sm text-slate-400">Member Since</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Choose how you want to be notified about audit updates and system events.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Email Notifications</div>
                      <div className="text-sm text-slate-400">Receive general notifications via email</div>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Audit Completion Alerts</div>
                      <div className="text-sm text-slate-400">Get notified when your audits are completed</div>
                    </div>
                    <Switch
                      checked={auditCompleteNotifications}
                      onCheckedChange={setAuditCompleteNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Marketing Emails</div>
                      <div className="text-sm text-slate-400">Receive updates about new features and promotions</div>
                    </div>
                    <Switch
                      checked={marketingEmails}
                      onCheckedChange={setMarketingEmails}
                    />
                  </div>
                </div>
                
                <Button onClick={handleSaveNotificationPreferences} className="w-full">
                  Save Notification Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Control your privacy and data sharing preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Public Profile</div>
                      <div className="text-sm text-slate-400">Allow others to view your profile information</div>
                    </div>
                    <Switch
                      checked={publicProfile}
                      onCheckedChange={setPublicProfile}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Show Audit History</div>
                      <div className="text-sm text-slate-400">Display your public audits in community section</div>
                    </div>
                    <Switch
                      checked={showAuditHistory}
                      onCheckedChange={setShowAuditHistory}
                    />
                  </div>
                </div>
                
                <Button onClick={handleSavePrivacyPreferences} className="w-full">
                  Save Privacy Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance Settings
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Customize the look and feel of your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Theme</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        onClick={() => setTheme('dark')}
                        className="justify-start"
                      >
                        🌙 Dark Mode
                      </Button>
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        onClick={() => setTheme('light')}
                        className="justify-start"
                        disabled
                      >
                        ☀️ Light Mode (Coming Soon)
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-white">Language</Label>
                    <div className="mt-2">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white"
                      >
                        <option value="en">English</option>
                        <option value="es" disabled>Spanish (Coming Soon)</option>
                        <option value="fr" disabled>French (Coming Soon)</option>
                        <option value="de" disabled>German (Coming Soon)</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleSaveThemePreferences} className="w-full">
                  Save Appearance Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}