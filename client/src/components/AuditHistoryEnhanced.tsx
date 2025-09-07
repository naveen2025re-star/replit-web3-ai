import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { 
  Search, 
  Calendar, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  Trash2,
  Download,
  Share2,
  MoreHorizontal,
  Tag,
  FileText
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface AuditItem {
  id: string;
  sessionId: string;
  title: string;
  language: string;
  contractCode: string;
  createdAt: string;
  status: "completed" | "in_progress" | "failed";
  severity?: "low" | "medium" | "high" | "critical";
  vulnerabilityCount?: number;
  creditCost?: number;
  isPublic?: boolean;
  tags?: string[];
}

interface AuditHistoryEnhancedProps {
  audits: AuditItem[];
  onLoadAudit: (sessionId: string) => void;
  onDeleteAudit?: (auditId: string) => void;
  onBulkDelete?: (auditIds: string[]) => void;
  onExportAudit?: (auditId: string) => void;
  onShareAudit?: (auditId: string) => void;
}

type SortField = "date" | "title" | "severity" | "cost";
type SortDirection = "asc" | "desc";

export function AuditHistoryEnhanced({ 
  audits, 
  onLoadAudit, 
  onDeleteAudit, 
  onBulkDelete,
  onExportAudit,
  onShareAudit
}: AuditHistoryEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedAudits, setSelectedAudits] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Get unique values for filter options
  const languages = useMemo(() => 
    Array.from(new Set(audits.map(audit => audit.language))).filter(Boolean),
    [audits]
  );

  // Filter and sort audits
  const filteredAndSortedAudits = useMemo(() => {
    let filtered = audits;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(audit =>
        audit.title.toLowerCase().includes(query) ||
        audit.contractCode.toLowerCase().includes(query) ||
        audit.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply language filter
    if (selectedLanguage !== "all") {
      filtered = filtered.filter(audit => audit.language === selectedLanguage);
    }

    // Apply severity filter
    if (selectedSeverity !== "all") {
      filtered = filtered.filter(audit => audit.severity === selectedSeverity);
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter(audit => audit.status === selectedStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "severity":
          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          comparison = (severityOrder[a.severity || "low"]) - (severityOrder[b.severity || "low"]);
          break;
        case "cost":
          comparison = (a.creditCost || 0) - (b.creditCost || 0);
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    return filtered;
  }, [audits, searchQuery, selectedLanguage, selectedSeverity, selectedStatus, sortField, sortDirection]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAudits(filteredAndSortedAudits.map(audit => audit.id));
    } else {
      setSelectedAudits([]);
    }
  };

  const handleSelectAudit = (auditId: string, checked: boolean) => {
    if (checked) {
      setSelectedAudits(prev => [...prev, auditId]);
    } else {
      setSelectedAudits(prev => prev.filter(id => id !== auditId));
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search audits, contract code, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-600 text-white"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {languages.map(lang => (
                  <SelectItem key={lang} value={lang} className="capitalize">
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={`${sortField}-${sortDirection}`} 
              onValueChange={(value) => {
                const [field, direction] = value.split('-') as [SortField, SortDirection];
                setSortField(field);
                setSortDirection(direction);
              }}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="title-desc">Title Z-A</SelectItem>
                <SelectItem value="severity-desc">Highest Severity</SelectItem>
                <SelectItem value="cost-desc">Highest Cost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedAudits.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <span className="text-sm text-blue-400">
              {selectedAudits.length} audit{selectedAudits.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBulkDelete?.(selectedAudits)}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAudits([])}
                className="text-slate-400 hover:text-white"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedAudits.length === filteredAndSortedAudits.length && filteredAndSortedAudits.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span>
            {filteredAndSortedAudits.length} of {audits.length} audits
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
          }}
          className="text-slate-400 hover:text-white"
        >
          {sortDirection === "desc" ? (
            <SortDesc className="h-4 w-4 mr-2" />
          ) : (
            <SortAsc className="h-4 w-4 mr-2" />
          )}
          {sortField}
        </Button>
      </div>

      {/* Audit List */}
      <div className="space-y-3">
        {filteredAndSortedAudits.map((audit) => (
          <Card key={audit.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedAudits.includes(audit.id)}
                  onCheckedChange={(checked) => handleSelectAudit(audit.id, !!checked)}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(audit.status)}
                    <h3 className="font-medium text-white truncate">
                      {audit.title || `${audit.language} Contract Analysis`}
                    </h3>
                    {audit.isPublic && (
                      <Eye className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(audit.createdAt), { addSuffix: true })}
                    </span>
                    <span className="capitalize">{audit.language}</span>
                    {audit.creditCost && (
                      <span>{audit.creditCost} credits</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    {audit.severity && (
                      <Badge variant="outline" className={getSeverityColor(audit.severity)}>
                        {audit.severity}
                      </Badge>
                    )}
                    {audit.vulnerabilityCount !== undefined && (
                      <Badge variant="outline" className="bg-slate-700 text-slate-300">
                        {audit.vulnerabilityCount} issues found
                      </Badge>
                    )}
                    {audit.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-400/30">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {audit.contractCode.substring(0, 120)}...
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLoadAudit(audit.sessionId)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                      <DropdownMenuItem onClick={() => onExportAudit?.(audit.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShareAudit?.(audit.id)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDeleteAudit?.(audit.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {filteredAndSortedAudits.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audits found matching your criteria.</p>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-blue-400 hover:text-blue-300"
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}