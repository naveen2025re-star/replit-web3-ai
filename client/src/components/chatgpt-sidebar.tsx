import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Settings, 
  Archive, 
  LogOut, 
  ChevronDown, 
  ChevronRight, 
  Pin, 
  Edit3, 
  Trash2, 
  Share, 
  Download,
  Check,
  X,
  User,
  CreditCard
} from "lucide-react";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import CreditDisplay from "@/components/CreditDisplay";
import CreditPurchase from "@/components/CreditPurchase";

interface AuditSession {
  id: string;
  publicTitle?: string;
  contractLanguage: string;
  status: string;
  isPublic: boolean;
  createdAt: string;
  completedAt?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

interface ChatGPTSidebarProps {
  auditHistory: AuditSession[];
  user: any;
  onNewAudit: () => void;
  onLoadSession: (sessionId: string) => void;
  onEditAuditTitle?: (sessionId: string, newTitle: string) => void;
  onDeleteAudit?: (sessionId: string) => void;
}

export function ChatGPTSidebar({ 
  auditHistory, 
  user, 
  onNewAudit, 
  onLoadSession,
  onEditAuditTitle,
  onDeleteAudit
}: ChatGPTSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameValue, setDisplayNameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{sessionId: string, x: number, y: number} | null>(null);
  const queryClient = useQueryClient();
  const { disconnect } = useWeb3Auth();
  const { toast } = useToast();

  // Get archived chats
  const archivedChats = auditHistory.filter(session => session.isArchived);

  // Filter sessions by search term and exclude archived
  const filteredSessions = auditHistory.filter(session => 
    !session.isArchived && (
      session.publicTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.contractLanguage?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Separate pinned and regular sessions
  const pinnedSessions = filteredSessions.filter(s => s.isPinned);
  const regularSessions = filteredSessions.filter(s => !s.isPinned);

  // Group regular sessions by time periods  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groupedSessions = {
    recent: regularSessions.filter(s => new Date(s.createdAt) > sevenDaysAgo),
    previous30: regularSessions.filter(s => {
      const date = new Date(s.createdAt);
      return date <= sevenDaysAgo && date > thirtyDaysAgo;
    }),
    older: regularSessions.filter(s => new Date(s.createdAt) <= thirtyDaysAgo)
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ sessionId, x: e.clientX, y: e.clientY });
  };

  const handleLogout = async () => {
    try {
      disconnect();
      queryClient.clear();
      localStorage.clear();
      await fetch('/api/logout', { method: 'GET' });
      setTimeout(() => window.location.reload(), 100);
    } catch (error) {
      console.error('Logout error:', error);
      window.location.reload();
    }
  };

  const handleUpdateDisplayName = async () => {
    try {
      const response = await fetch('/api/user/display-name', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ displayName: displayNameValue.trim() })
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        setEditingDisplayName(false);
        toast({
          title: "Display name updated",
          description: "Your display name has been updated successfully.",
        });
      } else {
        throw new Error('Failed to update display name');
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      toast({
        title: "Error",
        description: "Failed to update display name.",
        variant: "destructive",
      });
    }
  };

  const handlePin = async (sessionId: string) => {
    try {
      setContextMenu(null);
      const session = auditHistory.find(s => s.id === sessionId);
      const newPinStatus = !session?.isPinned;
      
      const response = await fetch(`/api/audit/session/${sessionId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinStatus })
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/audit/user-sessions', user?.id] });
        toast({
          title: newPinStatus ? "Chat pinned" : "Chat unpinned",
          description: newPinStatus ? "Chat has been pinned to the top." : "Chat has been unpinned.",
        });
      } else {
        throw new Error('Failed to update pin status');
      }
    } catch (error) {
      console.error('Error updating pin status:', error);
      toast({
        title: "Error",
        description: "Failed to update pin status.",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (sessionId: string) => {
    try {
      setContextMenu(null);
      const session = auditHistory.find(s => s.id === sessionId);
      const newArchiveStatus = !session?.isArchived;
      
      const response = await fetch(`/api/audit/session/${sessionId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: newArchiveStatus })
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/audit/user-sessions', user?.id] });
        toast({
          title: newArchiveStatus ? "Chat archived" : "Chat unarchived",
          description: newArchiveStatus ? "Chat has been moved to archive." : "Chat has been restored from archive.",
        });
      } else {
        throw new Error('Failed to update archive status');
      }
    } catch (error) {
      console.error('Error updating archive status:', error);
      toast({
        title: "Error",
        description: "Failed to update archive status.",
        variant: "destructive",
      });
    }
  };

  const handleRename = (sessionId: string, currentTitle: string) => {
    setRenameSessionId(sessionId);
    setRenameValue(currentTitle || '');
    setShowRenameModal(true);
    setContextMenu(null);
  };

  const handleRenameSubmit = () => {
    if (renameSessionId && onEditAuditTitle) {
      onEditAuditTitle(renameSessionId, renameValue);
      setShowRenameModal(false);
      setRenameSessionId(null);
      setRenameValue('');
    }
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50">
        <Button 
          onClick={onNewAudit}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white h-10 font-medium text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        
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

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">No chats yet</p>
            <p className="text-xs text-slate-500 mt-1">Start your first analysis</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Pinned chats */}
            {pinnedSessions.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-slate-500 px-2 py-1 mb-2">Pinned</div>
                {pinnedSessions.map((session: AuditSession) => (
                  <div
                    key={session.id}
                    className="group relative flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors"
                    onClick={() => onLoadSession(session.id)}
                    onContextMenu={(e) => handleContextMenu(e, session.id)}
                  >
                    <Pin className="h-3 w-3 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 truncate">
                      {session.publicTitle || `${session.contractLanguage} Audit`}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-slate-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, session.id);
                      }}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Recent chats */}
            {groupedSessions.recent.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-slate-500 px-2 py-1 mb-2">Previous 7 days</div>
                {groupedSessions.recent.map((session: AuditSession) => (
                  <div
                    key={session.id}
                    className="group relative flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors"
                    onClick={() => onLoadSession(session.id)}
                    onContextMenu={(e) => handleContextMenu(e, session.id)}
                  >
                    <div className="flex-1 truncate">
                      {session.publicTitle || `${session.contractLanguage} Audit`}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-slate-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, session.id);
                      }}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Previous 30 days */}
            {groupedSessions.previous30.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-slate-500 px-2 py-1 mb-2">Previous 30 days</div>
                {groupedSessions.previous30.map((session: AuditSession) => (
                  <div
                    key={session.id}
                    className="group relative flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors"
                    onClick={() => onLoadSession(session.id)}
                    onContextMenu={(e) => handleContextMenu(e, session.id)}
                  >
                    <div className="flex-1 truncate">
                      {session.publicTitle || `${session.contractLanguage} Audit`}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-slate-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, session.id);
                      }}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Older */}
            {groupedSessions.older.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 px-2 py-1 mb-2">Older</div>
                {groupedSessions.older.map((session: AuditSession) => (
                  <div
                    key={session.id}
                    className="group relative flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors"
                    onClick={() => onLoadSession(session.id)}
                    onContextMenu={(e) => handleContextMenu(e, session.id)}
                  >
                    <div className="flex-1 truncate">
                      {session.publicTitle || `${session.contractLanguage} Audit`}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-slate-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, session.id);
                      }}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Archived Chats Section */}
      {archivedChats.length > 0 && (
        <div className="border-t border-slate-700/50 p-3">
          <button
            onClick={() => setShowArchivedChats(!showArchivedChats)}
            className="flex items-center justify-between w-full text-left py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              {showArchivedChats ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Archive className="h-4 w-4" />
              <span className="font-medium">Archived Chats</span>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-full">
              {archivedChats.length}
            </span>
          </button>
          
          {showArchivedChats && (
            <div className="space-y-1 mt-2">
              {archivedChats.map((session: AuditSession) => (
                <div
                  key={session.id}
                  className="group relative flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer text-sm text-slate-400 hover:text-slate-300 transition-colors"
                  onClick={() => onLoadSession(session.id)}
                  onContextMenu={(e) => handleContextMenu(e, session.id)}
                >
                  <div className="flex-1 truncate">
                    {session.publicTitle || `${session.contractLanguage} Audit`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-slate-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, session.id);
                    }}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom section with additional options */}
      <div className="border-t border-slate-700/50 p-3">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/settings'}
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50 h-9"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-slate-300 hover:text-red-400 hover:bg-slate-800/50 h-9"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>

      {/* User Profile */}
      <div className="border-t border-slate-700/50 p-3">
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {(user?.displayName || user?.ensName || user?.githubUsername || user?.walletAddress)?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm text-white truncate">
                  {user?.displayName || user?.ensName || user?.githubUsername || 
                   (user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Anonymous')}
                </div>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Account</DialogTitle>
              <DialogDescription className="text-slate-400">
                Manage your profile and account settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* User Profile Section */}
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-600/50">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                    {(user?.displayName || user?.ensName || user?.githubUsername || user?.walletAddress)?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-2">
                    {/* Display Name Section */}
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide font-medium">Display Name</label>
                      {editingDisplayName ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={displayNameValue}
                            onChange={(e) => setDisplayNameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateDisplayName()}
                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            placeholder="Enter display name"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={handleUpdateDisplayName}
                            className="bg-green-600 hover:bg-green-700 text-white px-3"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingDisplayName(false);
                              setDisplayNameValue('');
                            }}
                            className="border-slate-600 text-slate-300 hover:bg-slate-800 px-3"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-white font-medium">
                            {user?.displayName || user?.ensName || user?.githubUsername || 'Anonymous'}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDisplayNameValue(user?.displayName || '');
                              setEditingDisplayName(true);
                            }}
                            className="text-slate-400 hover:text-white hover:bg-slate-800/50 h-7 w-7 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Wallet Address */}
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide font-medium">Wallet</label>
                      <div className="text-xs text-slate-300 mt-1 font-mono">
                        {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Not connected'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credits Section */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-300">Credits</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowUserModal(false);
                      setShowCreditPurchase(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                  >
                    Buy More
                  </Button>
                </div>
                <CreditDisplay 
                  userId={user?.id}
                  compact={true}
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start border-red-600/50 text-red-300 hover:bg-red-500/20 hover:text-red-200 h-9"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Log out</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
            onClick={() => handlePin(contextMenu.sessionId)}
          >
            <Pin className="h-3 w-3" />
            {auditHistory.find(s => s.id === contextMenu.sessionId)?.isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
            onClick={() => {
              const session = auditHistory.find(s => s.id === contextMenu.sessionId);
              if (session) {
                handleRename(contextMenu.sessionId, session.publicTitle || '');
              }
            }}
          >
            <Edit3 className="h-3 w-3" />
            Rename
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
            onClick={() => handleArchive(contextMenu.sessionId)}
          >
            <Archive className="h-3 w-3" />
            {auditHistory.find(s => s.id === contextMenu.sessionId)?.isArchived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              // Handle share functionality
            }}
          >
            <Share className="h-3 w-3" />
            Share
          </button>
          <div className="border-t border-slate-700 my-1"></div>
          <button
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              if (onDeleteAudit && confirm('Are you sure you want to delete this chat?')) {
                onDeleteAudit(contextMenu.sessionId);
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      )}

      {/* Rename Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter a new title for this chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter chat title..."
              className="bg-slate-800 border-slate-600 text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                } else if (e.key === 'Escape') {
                  setShowRenameModal(false);
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRenameModal(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenameSubmit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Purchase Modal */}
      <CreditPurchase
        open={showCreditPurchase}
        onOpenChange={setShowCreditPurchase}
        userId={user?.id}
      />
    </div>
  );
}