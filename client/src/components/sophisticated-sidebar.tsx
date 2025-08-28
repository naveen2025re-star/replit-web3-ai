import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Archive
} from "lucide-react";
import { Link } from "wouter";

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
}

export function SophisticatedSidebar({ 
  auditHistory, 
  communityAudits, 
  user, 
  onNewAudit, 
  onLoadSession, 
  onShowSettings 
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'audits' | 'community'>('audits');

  return (
    <div className="w-80 bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-900/95 border-r border-slate-700/30 flex flex-col backdrop-blur-lg shadow-2xl">
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
        <div className="space-y-3">
          <Button 
            onClick={onNewAudit}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] h-11 font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Security Audit
          </Button>
          <Link href="/history">
            <Button 
              variant="outline"
              className="w-full bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 h-10"
            >
              <Archive className="h-4 w-4 mr-2" />
              Audit History
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-5 py-4 border-b border-slate-700/30">
        <div className="flex bg-slate-800/50 rounded-xl p-1.5 shadow-inner">
          <button 
            onClick={() => setActiveTab('audits')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'audits' 
                ? 'text-white bg-slate-700/70 shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <History className="h-4 w-4" />
            My Audits
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'community' 
                ? 'text-white bg-slate-700/70 shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Globe className="h-4 w-4" />
            Community
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'audits' ? (
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
                        <div className="text-sm text-white font-medium truncate group-hover:text-blue-300 transition-colors mb-2">
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
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Globe className="h-4 w-4" />
                <span className="font-medium">Community</span>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-full">
                {communityAudits.total || 0}
              </span>
            </div>
            
            {!communityAudits.audits || communityAudits.audits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm text-slate-300 mb-2 font-medium">No public audits yet</p>
                <p className="text-xs text-slate-500 leading-relaxed">Be the first to share<br />your security analysis</p>
              </div>
            ) : (
              <div className="space-y-3">
                {communityAudits.audits.slice(0, 10).map((audit: any, index: number) => (
                  <Card 
                    key={audit.id}
                    className="group p-4 cursor-pointer hover:bg-slate-800/70 transition-all duration-300 ease-out bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 hover:shadow-xl transform hover:scale-[1.02] rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate group-hover:text-blue-300 transition-colors mb-2">
                          {audit.publicTitle || `Community Audit #${index + 1}`}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="text-slate-400">
                            by {audit.user?.walletAddress?.slice(0, 6)}...{audit.user?.walletAddress?.slice(-4)}
                          </div>
                          <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Profile */}
      {user && (
        <div className="p-5 border-t border-slate-700/30 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {user.walletAddress?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-sm font-medium truncate">
                {user.walletAddress?.slice(0, 8)}...{user.walletAddress?.slice(-6)}
              </div>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Connected
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onShowSettings}
              className="text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}