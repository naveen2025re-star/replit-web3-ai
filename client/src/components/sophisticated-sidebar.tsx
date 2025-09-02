import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Shield, 
  History, 
  Globe, 
  Lock, 
  Clock, 
  MoreVertical,
  Settings,
  Users,
  TrendingUp,
  Archive,
  Edit3,
  Trash2,
  Eye,
  Coins,
  LogOut,
  Search,
  Pin,
  Share,
  Download,
  ChevronDown,
  ChevronRight,
  Tag
} from "lucide-react";
import { Link } from "wouter";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import CreditDisplay from "@/components/CreditDisplay";

interface AuditSession {
  id: string;
  publicTitle?: string;
  contractLanguage: string;
  status: string;
  isPublic: boolean;
  createdAt: string;
  completedAt?: string;
}

interface SidebarProps {
  auditHistory: AuditSession[];
  communityAudits: { audits: any[], total: number };
  user: any;
  onNewAudit: () => void;
  onLoadSession: (sessionId: string) => void;
  onShowSettings: () => void;
  onEditAuditTitle?: (sessionId: string, newTitle: string) => void;
  onDeleteAudit?: (sessionId: string) => void;
  onViewCommunityAudit?: (auditId: string) => void;
  onPurchaseCredits?: () => void;
}

export function SophisticatedSidebar({ 
  auditHistory, 
  communityAudits, 
  user, 
  onNewAudit, 
  onLoadSession, 
  onShowSettings,
  onEditAuditTitle,
  onDeleteAudit,
  onViewCommunityAudit,
  onPurchaseCredits
}: SidebarProps) {
  const [editingAudit, setEditingAudit] = useState<{id: string, title: string} | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [localDisplayName, setLocalDisplayName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    recent: true,
    previous7: true,
    previous30: true
  });
  const [contextMenu, setContextMenu] = useState<{sessionId: string, x: number, y: number} | null>(null);
  const queryClient = useQueryClient();
  const { disconnect } = useWeb3Auth();

  // Initialize local display name from user data
  const currentDisplayName = user?.displayName || '';
  
  // Update local display name when modal opens
  useEffect(() => {
    if (showProfileSettings) {
      console.log('Opening profile modal, current user displayName:', user?.displayName);
      setLocalDisplayName(user?.displayName || '');
    }
  }, [showProfileSettings, user?.displayName]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Filter and group audit sessions
  const filteredSessions = auditHistory.filter(session => 
    session.publicTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.contractLanguage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groupedSessions = {
    recent: filteredSessions.filter(s => new Date(s.createdAt) > sevenDaysAgo),
    previous7: filteredSessions.filter(s => {
      const date = new Date(s.createdAt);
      return date <= sevenDaysAgo && date > thirtyDaysAgo;
    }),
    previous30: filteredSessions.filter(s => new Date(s.createdAt) <= thirtyDaysAgo)
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ sessionId, x: e.clientX, y: e.clientY });
  };

  const handleRename = (sessionId: string) => {
    setContextMenu(null);
    const session = auditHistory.find(s => s.id === sessionId);
    if (session && onEditAuditTitle) {
      onEditAuditTitle(sessionId, session.publicTitle || '');
    }
  };

  const handleDelete = (sessionId: string) => {
    setContextMenu(null);
    setDeleteSessionId(sessionId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteSessionId && onDeleteAudit) {
      onDeleteAudit(deleteSessionId);
    }
    setShowDeleteConfirm(false);
    setDeleteSessionId(null);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          variant="outline"
          size="sm"
          className="bg-slate-800/90 backdrop-blur border-slate-600 text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-80 bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-900/95 
        border-r border-slate-700/30 flex flex-col backdrop-blur-lg shadow-2xl
        transition-transform duration-300 ease-in-out overflow-hidden
      `}>
        {/* Header */}
      <div className="p-5 border-b border-slate-700/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight">SmartAudit AI</h1>
            <p className="text-xs text-slate-400">Professional Contract Analysis</p>
          </div>
        </div>
        <div className="space-y-2">
          <Button 
            onClick={onNewAudit}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] h-12 font-medium text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          <Link href="/history">
            <Button 
              variant="outline"
              className="w-full bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 h-10 text-sm"
            >
              <Archive className="h-4 w-4 mr-2" />
              Audit History
            </Button>
          </Link>
          
          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 h-9 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-slate-400 hover:text-white"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Credit Display */}
      <div className="px-5 pb-4 border-b border-slate-700/30">
        <CreditDisplay 
          userId={user?.id}
          compact={true}
          onPurchaseClick={onPurchaseCredits}
        />
      </div>

      {/* Content Area - My Audits */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <History className="h-4 w-4" />
                <span className="font-medium">Your Audits</span>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-full">
                {auditHistory.length}
              </span>
            </div>
            
            {auditHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <History className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm text-slate-300 mb-2 font-medium">No audits yet</p>
                <p className="text-xs text-slate-500 leading-relaxed">Start your first security analysis<br />to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditHistory.slice(0, 10).map((session: AuditSession, index: number) => (
                  <Card 
                    key={session.id}
                    className="group p-4 cursor-pointer hover:bg-slate-800/70 transition-all duration-300 ease-out bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 hover:shadow-xl transform hover:scale-[1.02] rounded-xl"
                    onClick={() => onLoadSession(session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate group-hover:text-blue-300 transition-colors mb-2 break-words">
                          {session.publicTitle && session.publicTitle.trim() 
                            ? session.publicTitle 
                            : `${session.contractLanguage || 'Solidity'} Analysis #${index + 1}`}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Recent'}
                          </div>
                          <div className="flex items-center gap-2">
                            {session.isPublic ? (
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3 text-blue-400" />
                                <span className="text-blue-400">Public</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Lock className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-400">Private</span>
                              </div>
                            )}
                            <Badge 
                              variant={session.status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs transition-colors group-hover:bg-blue-500"
                            >
                              {session.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-slate-400 hover:text-blue-400 h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAudit({id: session.id, title: session.publicTitle || `${session.contractLanguage || 'Solidity'} Analysis #${index + 1}`});
                                setNewTitle(session.publicTitle || `${session.contractLanguage || 'Solidity'} Analysis #${index + 1}`);
                              }}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-slate-700 text-white">
                            <DialogHeader>
                              <DialogTitle>Edit Audit Title</DialogTitle>
                              <DialogDescription>
                                Update the title for this audit session to better identify it in your history.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label htmlFor="title" className="text-sm font-medium text-slate-300">
                                  Audit Title
                                </Label>
                                <Input
                                  id="title"
                                  value={newTitle}
                                  onChange={(e) => setNewTitle(e.target.value)}
                                  className="bg-slate-800 border-slate-600 text-white mt-2"
                                  placeholder="Enter new audit title..."
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setEditingAudit(null)}
                                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => {
                                    if (editingAudit && onEditAuditTitle) {
                                      onEditAuditTitle(editingAudit.id, newTitle.trim());
                                      setEditingAudit(null);
                                    }
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700"
                                  disabled={!newTitle.trim()}
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-400 hover:text-red-400 h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSessionId(session.id);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* User Profile */}
      {user && (
        <div className="p-5 border-t border-slate-700/30 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {(user.displayName || user.ensName || user.githubUsername || user.walletAddress)?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-sm font-medium truncate">
                {user.displayName || user.ensName || user.githubUsername || 
                 (user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Anonymous')}
              </div>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Connected
              </div>
            </div>
            <div className="flex gap-1">
              <Dialog open={showProfileSettings} onOpenChange={setShowProfileSettings}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      console.log('Opening profile settings, user:', user);
                      setLocalDisplayName(user?.displayName || '');
                      setShowProfileSettings(true);
                    }}
                    className="text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg"
                    title="Profile Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Profile Settings</DialogTitle>
                    <DialogDescription>
                      Customize how your name appears to other users in the community.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="displayName" className="text-sm font-medium text-slate-300">
                        Display Name (Optional)
                      </Label>
                      <Input
                        id="displayName"
                        value={localDisplayName}
                        onChange={(e) => setLocalDisplayName(e.target.value)}
                        className="bg-slate-800 border-slate-600 text-white mt-2"
                        placeholder="Enter your preferred display name..."
                        maxLength={50}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Leave empty to use your wallet address or GitHub username
                      </p>
                      {user?.displayName && (
                        <p className="text-xs text-blue-400 mt-1">
                          Current: "{user.displayName}"
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowProfileSettings(false);
                          // Reset to current user displayName when cancelling
                          setLocalDisplayName(user?.displayName || '');
                        }}
                        className="border-slate-600 text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={async () => {
                          try {
                            if (!user?.walletAddress) {
                              throw new Error('No wallet address found');
                            }

                            const response = await fetch(`/api/auth/user/${user.walletAddress}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                displayName: localDisplayName.trim() || null
                              })
                            });

                            if (!response.ok) {
                              throw new Error('Failed to update profile');
                            }

                            const updatedUser = await response.json();
                            console.log('Profile update response:', updatedUser);

                            // Update the query cache immediately with the new user data
                            queryClient.setQueryData([`/api/auth/user/${user.walletAddress}`], updatedUser);
                            
                            // Also invalidate to ensure fresh data
                            queryClient.invalidateQueries({ queryKey: [`/api/auth/user/${user.walletAddress}`] });
                            queryClient.invalidateQueries({ queryKey: ['/api/audit/user-sessions'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/community/audits'] });

                            // Show success feedback
                            const successMsg = document.createElement('div');
                            successMsg.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                            successMsg.textContent = 'Profile updated successfully!';
                            document.body.appendChild(successMsg);
                            setTimeout(() => document.body.removeChild(successMsg), 3000);
                            
                            // Close the dialog after successful update
                            setShowProfileSettings(false);
                          } catch (error) {
                            console.error('Failed to save profile:', error);
                            
                            // Show error feedback
                            const errorMsg = document.createElement('div');
                            errorMsg.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                            errorMsg.textContent = 'Failed to update profile. Please try again.';
                            document.body.appendChild(errorMsg);
                            setTimeout(() => document.body.removeChild(errorMsg), 3000);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={async () => {
                  try {
                    // First disconnect wallet and clear client state
                    disconnect();
                    
                    // Clear all cached queries
                    queryClient.clear();
                    
                    // Clear any stored auth data
                    localStorage.clear();
                    
                    // Then call server logout to clear session
                    await fetch('/api/logout', { method: 'GET' });
                    
                    // Force page reload to ensure clean state
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  } catch (error) {
                    console.error('Logout error:', error);
                    // Fallback: just reload the page
                    window.location.reload();
                  }
                }}
                className="text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Audit</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this audit? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteSessionId(null);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </>
  );
}