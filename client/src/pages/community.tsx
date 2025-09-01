import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  FileText,
  Upload,
  Globe,
  Github
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
    if (score >= 90) return 'Low Risk';
    if (score >= 70) return 'Medium Risk';
    if (score >= 50) return 'High Risk';
    return 'Critical Risk';
  };

  const formatUserDisplayName = (user: any) => {
    if (!user) return 'Anonymous';
    
    // Priority 1: User-set display name
    if (user.displayName && user.displayName.trim()) {
      return user.displayName.trim();
    }
    
    // Priority 2: ENS name (looks most professional)
    if (user.ensName && user.ensName.trim()) {
      return user.ensName.trim();
    }
    
    // Priority 3: GitHub username
    if (user.githubUsername && user.githubUsername.trim()) {
      return user.githubUsername.trim();
    }
    
    // Priority 4: Regular username (but filter out auto-generated ones)
    if (user.username && user.username.trim() && !user.username.match(/^user_[a-f0-9_]+$/)) {
      return user.username.trim();
    }
    
    // Priority 5: Shortened wallet address
    if (user.walletAddress && user.walletAddress.trim()) {
      const addr = user.walletAddress.trim();
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
    
    return 'Anonymous';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 p-4 sm:p-0">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
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
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Community Audits</h1>
                  <p className="text-sm text-gray-400 hidden sm:block">Explore public smart contract security analysis</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
              <Badge variant="outline" className="border-green-400 text-green-300 bg-green-900/20 text-xs sm:text-sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                {auditsData?.total || 0} Public Scans
              </Badge>
              <Button 
                onClick={() => setLocation("/auditor")}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[140px] bg-gray-800/50 border-gray-600 text-white">
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
                className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto"
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
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="h-4 w-4 bg-gray-700 rounded"></div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3 mb-4"></div>
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 bg-gray-700 rounded w-16"></div>
                    <div className="h-6 bg-gray-700 rounded w-20"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-700 rounded w-16"></div>
                    <div className="h-4 bg-gray-700 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : auditsData?.audits && auditsData.audits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auditsData.audits.map((audit: any) => {
              const severity = audit.result?.securityScore 
                ? getSeverityFromScore(audit.result.securityScore)
                : audit.status === 'completed' ? 'Completed' : 
                  audit.result ? 'Analyzed' : 'Unknown';
              
              const userDisplayName = formatUserDisplayName(audit.user);
              
              return (
                <Card 
                  key={audit.id} 
                  className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 hover:border-gray-600 transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-xl"
                  onClick={() => setSelectedAudit(audit.id)}
                  data-testid={`audit-card-${audit.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-base font-semibold line-clamp-2 group-hover:text-blue-300 transition-colors mb-1">
                          {audit.publicTitle || `${audit.contractLanguage} Contract Audit`}
                        </CardTitle>
                        <CardDescription className="text-gray-400 text-sm flex items-center gap-2">
                          <User className="h-3 w-3" />
                          by {userDisplayName}
                        </CardDescription>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0" />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {audit.publicDescription && (
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">
                        {audit.publicDescription}
                      </p>
                    )}
                    
                    {/* Tags */}
                    {audit.tags && audit.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {audit.tags.slice(0, 3).map((tag: string, index: number) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs px-2 py-1 border-purple-500/30 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {audit.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-1 border-gray-600 text-gray-400 bg-gray-800/30">
                            +{audit.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Metrics */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            severity === 'Unknown' ? 'bg-gray-500' : 
                            severity === 'Completed' ? 'bg-green-500' :
                            getSeverityColor(severity)
                          }`}></div>
                          <span className="text-gray-300 text-xs">{severity}</span>
                        </div>
                        
                        {audit.result?.vulnerabilityCount && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              {Object.values(audit.result.vulnerabilityCount as Record<string, number>).reduce((a, b) => a + b, 0)}
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
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-blue-400" />
                            <span className="text-gray-400">Security Score</span>
                          </div>
                          <span className="text-white font-semibold text-base">{audit.result.securityScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 shadow-inner">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              audit.result.securityScore >= 90 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                              audit.result.securityScore >= 70 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                              audit.result.securityScore >= 50 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-red-500 to-red-400'
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
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-slate-800/30 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Shield className="h-12 w-12 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-200 mb-3">
                {searchTerm || selectedTags.length > 0 ? "No Audits Match Your Filters" : "No Public Audits Yet"}
              </h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                {searchTerm || selectedTags.length > 0 
                  ? "Try adjusting your search terms or removing some filters to see more results."
                  : "Be the first to share your smart contract audit with the community! Help others learn from your security analysis."
              }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {(searchTerm || selectedTags.length > 0) && (
                  <Button 
                    variant="outline"
                    onClick={clearFilters}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
                <Button 
                  onClick={() => setLocation("/auditor")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {searchTerm || selectedTags.length > 0 ? "Start New Audit" : "Create First Audit"}
                </Button>
              </div>
            </div>
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
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700 text-white shadow-2xl">
          <DialogHeader className="sticky top-0 bg-slate-900 pb-4 border-b border-slate-700">
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <div>{auditDetails?.publicTitle || 'Community Audit Details'}</div>
                <div className="text-sm font-normal text-gray-400 mt-1">
                  Security Analysis Report
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Detailed security analysis and findings for this smart contract audit
            </DialogDescription>
          </DialogHeader>
          
          {auditDetails && (
            <div className="space-y-8 py-6">
              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Status</div>
                      <div className="font-semibold text-white capitalize">{auditDetails.status}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Code className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Language</div>
                      <div className="font-semibold text-white">{auditDetails.contractLanguage}</div>
                    </div>
                  </div>
                </div>
                
                {auditDetails.result?.securityScore && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Shield className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Security Score</div>
                        <div className="font-semibold text-white text-lg">{auditDetails.result.securityScore}/100</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Audit Metadata */}
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <h4 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Audit Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Auditor:</span>
                      <span className="text-white font-medium">
                        {formatUserDisplayName(auditDetails.user)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Visibility:</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        <Eye className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Created:</span>
                      <span className="text-white">{new Date(auditDetails.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time:</span>
                      <span className="text-white">{new Date(auditDetails.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contract Code */}
              {auditDetails.contractCode && (
                <div className="bg-slate-800/30 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/10 rounded">
                        <FileText className="h-4 w-4 text-blue-400" />
                      </div>
                      Smart Contract Code
                    </h4>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {auditDetails.contractLanguage}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto border border-slate-800 max-h-96">
                      <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        Source Code
                        <span className="text-slate-600">•</span>
                        <span>{auditDetails.contractCode.split('\\n').length} lines</span>
                      </div>
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        <code>{auditDetails.contractCode}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Response */}
              {(auditDetails.result?.rawResponse || auditDetails.result?.formattedReport) && (
                <div className="bg-slate-800/30 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                      <div className="p-1.5 bg-green-500/10 rounded">
                        <Shield className="h-4 w-4 text-green-400" />
                      </div>
                      Security Analysis Report
                    </h4>
                    {auditDetails.result?.securityScore && (
                      <Badge className={`${
                        auditDetails.result.securityScore >= 90 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        auditDetails.result.securityScore >= 70 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        auditDetails.result.securityScore >= 50 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 
                        'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {auditDetails.result.securityScore >= 90 ? 'Low Risk' :
                         auditDetails.result.securityScore >= 70 ? 'Medium Risk' :
                         auditDetails.result.securityScore >= 50 ? 'High Risk' : 'Critical Risk'}
                      </Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                      <div className="text-xs text-slate-500 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        AI Security Analysis
                        <span className="text-slate-600">•</span>
                        <span>Generated by SmartAudit AI</span>
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
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}