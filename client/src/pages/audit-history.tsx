import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  Clock, 
  Globe, 
  Lock, 
  Shield,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Download,
  Share,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditSession {
  id: string;
  publicTitle?: string;
  contractLanguage: string;
  status: string;
  isPublic: boolean;
  createdAt: string;
  completedAt?: string;
  contractCode?: string;
  auditResult?: string;
}

interface FilterState {
  search: string;
  status: string;
  visibility: string;
  language: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function AuditHistoryPage() {
  const { user } = useWeb3Auth();
  const [selectedAudit, setSelectedAudit] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    visibility: 'all',
    language: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Fetch audit sessions with filters
  const { data: auditSessions = [], isLoading } = useQuery({
    queryKey: ['/api/audit/user-sessions', user?.id, filters, currentPage, pageSize],
    queryFn: async () => {
      if (!user?.id) return [];
      const searchParams = new URLSearchParams({
        search: filters.search,
        status: filters.status,
        visibility: filters.visibility,
        language: filters.language,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (filters.dateFrom) {
        searchParams.append('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        searchParams.append('dateTo', filters.dateTo.toISOString());
      }
      
      const response = await fetch(`/api/audit/user-sessions/${user.id}?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Since we're doing server-side filtering, just use the returned audits directly
  const filteredAudits = useMemo(() => {
    if (!Array.isArray(auditSessions)) return [];
    return auditSessions;
  }, [auditSessions]);

  // Query for selected audit details
  const { data: auditDetails } = useQuery({
    queryKey: ['/api/audit/session', selectedAudit],
    queryFn: () => {
      if (!selectedAudit) return null;
      return fetch(`/api/audit/session/${selectedAudit}`).then(res => res.json());
    },
    enabled: !!selectedAudit,
  });

  // Pagination
  const totalPages = Math.ceil(filteredAudits.length / pageSize);
  const paginatedAudits = filteredAudits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      visibility: 'all',
      language: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Audit History</h1>
              <p className="text-slate-400">Manage and review your security analyses</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6 bg-slate-900/50 border-slate-700/50">
          <div className="space-y-4">
            {/* Search and Quick Filters Row */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search audits by title or language..."
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.visibility} onValueChange={(value) => updateFilter('visibility', value)}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.language} onValueChange={(value) => updateFilter('language', value)}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="solidity">Solidity</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                  <SelectItem value="vyper">Vyper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">Date Range:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-start text-left font-normal bg-slate-800/50 border-slate-600",
                        !filters.dateFrom && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PPP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter('dateFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-start text-left font-normal bg-slate-800/50 border-slate-600",
                        !filters.dateTo && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PPP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter('dateTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">Sort by:</span>
                <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                  <SelectTrigger className="w-32 bg-slate-800/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={clearFilters}
                className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <p className="text-slate-300">
              Showing {paginatedAudits.length} of {filteredAudits.length} audits
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Audit Cards */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 bg-slate-800/30 border-slate-700 animate-pulse">
                  <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-slate-700 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </Card>
              ))}
            </div>
          ) : paginatedAudits.length === 0 ? (
            <Card className="p-12 bg-slate-800/30 border-slate-700 text-center">
              <Shield className="h-16 w-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No audits found</h3>
              <p className="text-slate-400">Try adjusting your search criteria or filters</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {paginatedAudits.map((audit: AuditSession, index: number) => (
                <Card key={audit.id} className="p-6 bg-slate-800/30 border-slate-700 hover:bg-slate-800/50 transition-all duration-200 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-medium text-white group-hover:text-blue-300 transition-colors">
                          {audit.publicTitle || `${audit.contractLanguage} Analysis #${index + 1}`}
                        </h3>
                        <Badge className={getStatusColor(audit.status)}>
                          {audit.status}
                        </Badge>
                        {audit.isPublic ? (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm text-slate-400 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Created {new Date(audit.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Language:</span>
                          <span className="text-slate-300">{audit.contractLanguage}</span>
                        </div>
                        {audit.completedAt && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Completed:</span>
                            <span className="text-slate-300">{new Date(audit.completedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAudit(audit.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Details Dialog */}
      <Dialog open={!!selectedAudit} onOpenChange={() => setSelectedAudit(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              {auditDetails?.publicTitle || 'Audit Details'}
            </DialogTitle>
          </DialogHeader>
          
          {auditDetails && (
            <div className="space-y-6 py-4">
              {/* Audit Info */}
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-slate-300 mb-2">Audit Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <Badge className={auditDetails.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                        {auditDetails.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Language:</span>
                      <span className="text-white">{auditDetails.contractLanguage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Visibility:</span>
                      <Badge className={auditDetails.isPublic ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}>
                        <Globe className="h-3 w-3 mr-1" />
                        {auditDetails.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created:</span>
                      <span className="text-white">{new Date(auditDetails.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {auditDetails.result && (
                  <div>
                    <h4 className="font-medium text-slate-300 mb-2">Security Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Security Score:</span>
                        <span className="text-white">{auditDetails.result.securityScore || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vulnerabilities:</span>
                        <span className="text-white">{auditDetails.result.vulnerabilityCount || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              {auditDetails.contractCode && (
                <div>
                  <h4 className="font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Smart Contract Code
                  </h4>
                  <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto border border-slate-800">
                    <div className="mb-3">
                      <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        User Input
                      </div>
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                        <code>{auditDetails.contractCode}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Response */}
              {(auditDetails.result?.rawResponse || auditDetails.result?.formattedReport) && (
                <div>
                  <h4 className="font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security Analysis Report
                  </h4>
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                    <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      AI Assistant Response
                    </div>
                    <div className="prose prose-slate prose-invert max-w-none prose-headings:text-slate-200 prose-headings:font-semibold prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4 prose-li:text-slate-300 prose-strong:text-white prose-code:text-blue-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="text-xl font-bold text-slate-100 mb-4 mt-6 first:mt-0">{children}</h1>,
                          h2: ({children}) => <h2 className="text-lg font-semibold text-slate-200 mb-3 mt-5 first:mt-0">{children}</h2>,
                          h3: ({children}) => <h3 className="text-base font-medium text-slate-200 mb-2 mt-4 first:mt-0">{children}</h3>,
                          p: ({children}) => <p className="text-slate-300 mb-3 leading-relaxed">{children}</p>,
                          ul: ({children}) => <ul className="text-slate-300 mb-4 ml-4">{children}</ul>,
                          ol: ({children}) => <ol className="text-slate-300 mb-4 ml-4">{children}</ol>,
                          li: ({children}) => <li className="mb-1">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                          code: ({children}) => <code className="text-blue-300 bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                          pre: ({children}) => <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto mb-4">{children}</pre>
                        }}
                      >
                        {auditDetails.result.rawResponse || auditDetails.result.formattedReport}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}