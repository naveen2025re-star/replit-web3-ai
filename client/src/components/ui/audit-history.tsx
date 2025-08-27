import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { History, Eye, Download, Calendar, Code, Shield, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import type { AuditSession, AuditResult } from "@shared/schema";

interface AuditHistoryProps {
  userId?: string;
}

export function AuditHistory({ userId }: AuditHistoryProps) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  
  const { data: sessions, isLoading, error } = useQuery<AuditSession[]>({
    queryKey: [`/api/audit/user-sessions/${userId}`],
    enabled: !!userId,
  });
  
  const { data: auditData } = useQuery<{session: AuditSession, result: AuditResult}>({
    queryKey: [`/api/audit/results/${selectedSession}`],
    enabled: !!selectedSession,
  });

  if (!userId) {
    return (
      <Card className="p-6 text-center">
        <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
        <p className="text-muted-foreground">
          Connect your wallet to view your audit history and personalized dashboard
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Audit History</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (error || !sessions) {
    return (
      <Card className="p-6 text-center">
        <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Unable to load history</h3>
        <p className="text-muted-foreground">
          There was an error loading your audit history. Please try again.
        </p>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No audits yet</h3>
        <p className="text-muted-foreground">
          Start your first security audit to build your history
        </p>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'analyzing':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Audit History</h3>
          <Badge variant="secondary" data-testid="text-audit-count">
            {sessions.length}
          </Badge>
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {sessions.map((session, index) => (
            <div key={session.id}>
              <div className="flex items-start justify-between p-4 rounded-lg border border-border/50 hover:border-border transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {session.contractLanguage}
                    </Badge>
                    <Badge variant={getStatusColor(session.status)} className="text-xs">
                      {session.status}
                    </Badge>
                    {session.contractSource === 'github' && (
                      <Badge variant="secondary" className="text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        GitHub
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                  </div>
                  
                  {session.githubFilePath && (
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {session.githubFilePath}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {session.status === 'completed' ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="View Results"
                          data-testid={`button-view-${index}`}
                          onClick={() => setSelectedSession(session.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Smart Contract Audit Report
                            <Badge variant="outline" className="ml-auto">
                              {session.contractLanguage}
                            </Badge>
                          </DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh] mt-4">
                          {auditData?.result?.formattedReport ? (
                            <MarkdownRenderer content={auditData.result.formattedReport} />
                          ) : (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                              Loading audit report...
                            </div>
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="Analysis not completed"
                      disabled
                      data-testid={`button-view-${index}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {session.status === 'completed' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="Download Report"
                      data-testid={`button-download-${index}`}
                      onClick={() => {
                        if (auditData?.result?.formattedReport) {
                          const blob = new Blob([auditData.result.formattedReport], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `audit-report-${session.id}.md`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {index < sessions.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}