import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { 
  Shield, 
  Search, 
  Filter, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft,
  ExternalLink,
  Eye,
  Star,
  Calendar,
  Code,
  TrendingUp,
  FileText
} from "lucide-react";

export default function Community() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedAudit, setSelectedAudit] = useState<string | null>(null);
  const pageSize = 12;

  // Fetch public audits
  const { data: auditsData, isLoading: auditsLoading } = useQuery({
    queryKey: ["/api/community/audits", currentPage, searchTerm, selectedTags.join(","), sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchTerm,
        tags: selectedTags.join(",")
      });
      const response = await fetch(`/api/community/audits?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audits');
      return response.json();
    }
  });

  // Fetch trending tags
  const { data: trendingTags } = useQuery({
    queryKey: ["/api/community/trending-tags"],
    queryFn: () => fetch('/api/community/trending-tags').then(res => res.json())
  });

  // Query for selected audit details
  const { data: auditDetails } = useQuery({
    queryKey: ['/api/audit/session', selectedAudit],
    queryFn: () => {
      if (!selectedAudit) return null;
      return fetch(`/api/audit/session/${selectedAudit}`).then(res => res.json());
    },
    enabled: !!selectedAudit,
  });

  const getSeverityColor = (severity: string) => {
    if (!severity) return "bg-gray-500";
    
    const severityLevel = severity.toLowerCase();
    switch (severityLevel) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityFromScore = (score: number) => {
    if (score >= 90) return 'Low';
    if (score >= 70) return 'Medium';
    if (score >= 50) return 'High';
    return 'Critical';
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setLocation("/")}
                className="text-gray-300 hover:text-white"
                data-testid="button-back-home"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-600" />
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-blue-400" />
                <h1 className="text-2xl font-bold text-white">Community Audits</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-green-400 text-green-300 bg-green-900/20">
                <TrendingUp className="h-3 w-3 mr-1" />
                {auditsData?.total || 0} Public Scans
              </Badge>
              <Button 
                onClick={() => setLocation("/app")}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-start-audit"
              >
                <Shield className="h-4 w-4 mr-2" />
                Start Your Audit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search public audits by title..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  data-testid="input-search-audits"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="score">Security Score</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                data-testid="button-clear-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Trending Tags */}
          {trendingTags && trendingTags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Trending Tags</h3>
              <div className="flex flex-wrap gap-2">
                {trendingTags.slice(0, 15).map((tag: { tag: string; count: number }) => (
                  <Button
                    key={tag.tag}
                    variant={selectedTags.includes(tag.tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTag(tag.tag)}
                    className={`text-xs ${
                      selectedTags.includes(tag.tag)
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-700"
                    }`}
                    data-testid={`tag-${tag.tag.toLowerCase()}`}
                  >
                    {tag.tag} ({tag.count})
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(searchTerm || selectedTags.length > 0) && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Active filters:</span>
              {searchTerm && (
                <Badge variant="outline" className="border-blue-400 text-blue-300">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {selectedTags.map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="border-purple-400 text-purple-300 cursor-pointer hover:bg-purple-900/20"
                  onClick={() => toggleTag(tag)}
                >
                  {tag} ✕
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Audits Grid */}
        {auditsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : auditsData?.audits && auditsData.audits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auditsData.audits.map((audit: any) => {
              const severity = audit.result?.securityScore 
                ? getSeverityFromScore(audit.result.securityScore)
                : 'Unknown';
              
              return (
                <Card 
                  key={audit.id} 
                  className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors cursor-pointer group"
                  onClick={() => setSelectedAudit(audit.id)}
                  data-testid={`audit-card-${audit.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-base line-clamp-2 group-hover:text-blue-300 transition-colors">
                          {audit.publicTitle || `${audit.contractLanguage} Contract Audit`}
                        </CardTitle>
                        <CardDescription className="text-gray-400 text-sm mt-1">
                          by {audit.user?.username || audit.user?.walletAddress?.slice(0, 8) + '...' || 'Anonymous'}
                        </CardDescription>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0" />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {audit.publicDescription && (
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                        {audit.publicDescription}
                      </p>
                    )}
                    
                    {/* Tags */}
                    {audit.tags && audit.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {audit.tags.slice(0, 3).map((tag: string, index: number) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs px-2 py-1 border-gray-600 text-gray-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {audit.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-1 border-gray-600 text-gray-400">
                            +{audit.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Metrics */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getSeverityColor(severity)}`}></div>
                          <span className="text-gray-300">{severity}</span>
                        </div>
                        
                        {audit.result?.vulnerabilityCount && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              {Object.values(audit.result.vulnerabilityCount).reduce((a: number, b: number) => a + b, 0)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-gray-400">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(audit.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Security Score */}
                    {audit.result?.securityScore && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Security Score</span>
                          <span className="text-white font-medium">{audit.result.securityScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              audit.result.securityScore >= 90 ? 'bg-green-500' :
                              audit.result.securityScore >= 70 ? 'bg-yellow-500' :
                              audit.result.securityScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${audit.result.securityScore}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Public Audits Found</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm || selectedTags.length > 0 
                ? "Try adjusting your search or filters"
                : "Be the first to share your audit with the community!"
              }
            </p>
            <Button 
              onClick={() => setLocation("/app")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Shield className="h-4 w-4 mr-2" />
              Start Your First Audit
            </Button>
          </div>
        )}

        {/* Pagination */}
        {auditsData && auditsData.total > pageSize && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(auditsData.total / pageSize) }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === Math.ceil(auditsData.total / pageSize) || 
                    Math.abs(page - currentPage) <= 2
                  )
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center">
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 p-0 ${
                          currentPage === page
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "border-gray-600 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>
              
              <Button
                variant="outline"
                disabled={currentPage === Math.ceil(auditsData.total / pageSize)}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Details Dialog */}
      <Dialog open={!!selectedAudit} onOpenChange={() => setSelectedAudit(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              {auditDetails?.publicTitle || 'Community Audit Details'}
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
                      <Badge className="bg-blue-500/20 text-blue-400">
                        <Eye className="h-3 w-3 mr-1" />
                        Public
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

              {/* Contract Code */}
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