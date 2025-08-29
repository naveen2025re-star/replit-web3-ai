import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Download 
} from "lucide-react";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";

interface AuditSession {
  id: string;
  publicTitle?: string;
  contractLanguage: string;
  status: string;
  isPublic: boolean;
  createdAt: string;
  completedAt?: string;
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
  const [contextMenu, setContextMenu] = useState<{sessionId: string, x: number, y: number} | null>(null);
  const queryClient = useQueryClient();
  const { disconnect } = useWeb3Auth();

  // Filter sessions by search term
  const filteredSessions = auditHistory.filter(session => 
    session.publicTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.contractLanguage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group sessions by time periods
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groupedSessions = {
    recent: filteredSessions.filter(s => new Date(s.createdAt) > sevenDaysAgo),
    previous30: filteredSessions.filter(s => {
      const date = new Date(s.createdAt);
      return date <= sevenDaysAgo && date > thirtyDaysAgo;
    }),
    older: filteredSessions.filter(s => new Date(s.createdAt) <= thirtyDaysAgo)
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

      {/* Bottom section with additional options */}
      <div className="border-t border-slate-700/50 p-3">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50 h-9"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50 h-9"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived Chats
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
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {(user?.displayName || user?.ensName || user?.githubUsername || user?.walletAddress)?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">
                    {user?.displayName || user?.ensName || user?.githubUsername || 'Anonymous'}
                  </div>
                  <div className="text-sm text-slate-400">
                    {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'No wallet connected'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
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
            onClick={() => {
              setContextMenu(null);
              // Handle pin functionality
            }}
          >
            <Pin className="h-3 w-3" />
            Pin
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              const session = auditHistory.find(s => s.id === contextMenu.sessionId);
              if (session && onEditAuditTitle) {
                const newTitle = prompt('Enter new title:', session.publicTitle || '');
                if (newTitle !== null) {
                  onEditAuditTitle(contextMenu.sessionId, newTitle);
                }
              }
            }}
          >
            <Edit3 className="h-3 w-3" />
            Rename
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              // Handle archive functionality
            }}
          >
            <Archive className="h-3 w-3" />
            Archive
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
    </div>
  );
}