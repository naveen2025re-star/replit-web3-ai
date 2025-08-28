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
  ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
    </div>
  );
}