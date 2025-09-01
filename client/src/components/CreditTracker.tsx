import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Target, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  Activity,
  Wallet,
  History,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { CreditPurchase } from './CreditPurchase';

interface CreditStats {
  balance: number;
  totalUsed: number;
  totalEarned: number;
  lastGrant: string | null;
  planTier?: 'Free' | 'Pro' | 'Pro+' | 'Enterprise';
  canCreatePrivateAudits?: boolean;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    reason: string;
    createdAt: string;
    balanceAfter: number;
  }>;
}

interface Transaction {
  id: string;
  type: 'deduction' | 'purchase' | 'bonus' | 'refund' | 'initial';
  amount: number;
  reason: string;
  sessionId?: string;
  metadata?: any;
  balanceAfter: number;
  createdAt: string;
}

interface CreditTrackerProps {
  userId?: string;
  compact?: boolean;
  showPurchaseModal?: boolean;
  onPurchaseModalChange?: (open: boolean) => void;
}

export function CreditTracker({ 
  userId, 
  compact = false, 
  showPurchaseModal = false, 
  onPurchaseModalChange 
}: CreditTrackerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch credit balance and stats
  const { data: credits, isLoading: creditsLoading, refetch: refetchCredits } = useQuery<CreditStats>({
    queryKey: ['/api/credits/balance', userId],
    queryFn: async () => {
      const response = await fetch(`/api/credits/balance?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch credits');
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });

  // Fetch detailed transaction history
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/credits/transactions', userId],
    queryFn: async () => {
      const response = await fetch(`/api/credits/transactions/${userId}`, {
        headers: { 'x-user-id': userId || '' }
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 60000,
  });

  // Process data for charts and analytics
  const analyticsData = useMemo(() => {
    if (!transactions.length || !credits) return null;

    // Filter transactions by time range
    const now = new Date();
    const timeRangeMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const daysBack = timeRangeMap[timeRange as keyof typeof timeRangeMap] || 7;
    const filterDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    const filteredTransactions = transactions.filter(tx => 
      new Date(tx.createdAt) >= filterDate
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Balance over time chart data
    const balanceHistory = filteredTransactions.map(tx => ({
      date: new Date(tx.createdAt).toLocaleDateString(),
      balance: tx.balanceAfter,
      change: tx.amount,
      type: tx.type
    }));

    // Transaction type breakdown
    const typeBreakdown = transactions.reduce((acc, tx) => {
      const type = tx.type;
      if (!acc[type]) acc[type] = { count: 0, totalAmount: 0 };
      acc[type].count++;
      acc[type].totalAmount += Math.abs(tx.amount);
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    // Daily usage patterns
    const dailyUsage = filteredTransactions
      .filter(tx => tx.type === 'deduction')
      .reduce((acc, tx) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        if (!acc[date]) acc[date] = 0;
        acc[date] += Math.abs(tx.amount);
        return acc;
      }, {} as Record<string, number>);

    const dailyUsageChart = Object.entries(dailyUsage).map(([date, usage]) => ({
      date,
      usage
    }));

    // Calculate trends
    const recentUsage = filteredTransactions
      .filter(tx => tx.type === 'deduction')
      .slice(-7)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const previousUsage = filteredTransactions
      .filter(tx => tx.type === 'deduction')
      .slice(-14, -7)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const usageTrend = previousUsage > 0 ? 
      ((recentUsage - previousUsage) / previousUsage) * 100 : 0;

    // Predict when credits will run out
    const avgDailyUsage = recentUsage / 7;
    const daysUntilEmpty = avgDailyUsage > 0 ? Math.floor(credits.balance / avgDailyUsage) : Infinity;

    return {
      balanceHistory,
      typeBreakdown,
      dailyUsageChart,
      usageTrend,
      daysUntilEmpty,
      avgDailyUsage,
      totalSpent: transactions
        .filter(tx => tx.type === 'deduction')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      totalEarned: transactions
        .filter(tx => ['purchase', 'bonus', 'initial'].includes(tx.type))
        .reduce((sum, tx) => sum + tx.amount, 0)
    };
  }, [transactions, credits, timeRange]);

  if (creditsLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credits) return null;

  const getBalanceStatus = (balance: number) => {
    if (balance >= 1000) return { color: 'text-green-400', variant: 'default' as const, icon: CheckCircle };
    if (balance >= 100) return { color: 'text-yellow-400', variant: 'secondary' as const, icon: AlertTriangle };
    return { color: 'text-red-400', variant: 'destructive' as const, icon: AlertTriangle };
  };

  const balanceStatus = getBalanceStatus(credits.balance);

  const pieChartData = analyticsData ? Object.entries(analyticsData.typeBreakdown).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: data.totalAmount,
    count: data.count
  })) : [];

  const chartColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  if (compact) {
    return (
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {credits.balance.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">Credits Available</div>
              </div>
            </div>
            <Badge variant={balanceStatus.variant} className="gap-1">
              <balanceStatus.icon className="h-3 w-3" />
              {credits.planTier || 'Free'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Credit Tracker</h2>
            <p className="text-slate-400">Monitor your credit usage and analytics</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchCredits()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">
                  {credits.balance.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">Current Balance</div>
              </div>
              <div className={`p-2 rounded-lg bg-emerald-500/20 ${balanceStatus.color}`}>
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            {analyticsData && analyticsData.daysUntilEmpty !== Infinity && (
              <div className="mt-2 text-xs text-slate-500">
                ~{analyticsData.daysUntilEmpty} days remaining
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">
                  {credits.totalUsed.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">Total Used</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            {analyticsData && (
              <div className={`mt-2 text-xs flex items-center gap-1 ${
                analyticsData.usageTrend > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {analyticsData.usageTrend > 0 ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingDown className="h-3 w-3" />
                }
                {Math.abs(analyticsData.usageTrend).toFixed(1)}% vs last week
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">
                  {credits.totalEarned.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">Total Earned</div>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Plan: {credits.planTier || 'Free'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">
                  {analyticsData?.avgDailyUsage.toFixed(1) || '0'}
                </div>
                <div className="text-sm text-slate-400">Avg Daily Usage</div>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                <Target className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Last 7 days average
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="predictions">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balance History Chart */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Balance History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  {['7d', '30d', '90d', '1y'].map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData?.balanceHistory || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        color: '#fff'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.2} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Transaction Types Breakdown */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Transaction Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        color: '#fff'
                      }} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Daily Usage Pattern
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData?.dailyUsageChart || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      color: '#fff'
                    }} 
                  />
                  <Bar dataKey="usage" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'deduction' ? 'bg-red-500/20 text-red-400' :
                        tx.type === 'purchase' ? 'bg-green-500/20 text-green-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {tx.type === 'deduction' ? <ArrowDownRight className="h-4 w-4" /> :
                         tx.type === 'purchase' ? <ArrowUpRight className="h-4 w-4" /> :
                         <Zap className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-white font-medium">{tx.reason}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        Balance: {tx.balanceAfter.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Predictions */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Usage Predictions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData && (
                  <>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <span className="text-white font-medium">Credits Runway</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {analyticsData.daysUntilEmpty === Infinity ? '∞' : analyticsData.daysUntilEmpty} days
                      </div>
                      <div className="text-sm text-slate-400">
                        At current usage rate ({analyticsData.avgDailyUsage.toFixed(1)}/day)
                      </div>
                    </div>

                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-purple-400" />
                        <span className="text-white font-medium">Usage Trend</span>
                      </div>
                      <div className={`text-2xl font-bold ${
                        analyticsData.usageTrend > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {analyticsData.usageTrend > 0 ? '+' : ''}{analyticsData.usageTrend.toFixed(1)}%
                      </div>
                      <div className="text-sm text-slate-400">
                        Compared to last week
                      </div>
                    </div>

                    {credits.balance < 100 && (
                      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <span className="text-red-400 font-medium">Low Balance Warning</span>
                        </div>
                        <div className="text-sm text-red-300">
                          Consider purchasing more credits to avoid service interruption.
                        </div>
                        <Button 
                          className="mt-3 bg-red-600 hover:bg-red-700"
                          onClick={() => onPurchaseModalChange?.(true)}
                        >
                          Buy Credits
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Optimization Tips */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Optimization Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <div className="text-blue-300 font-medium text-sm">💡 Tip</div>
                  <div className="text-white text-sm mt-1">
                    Batch multiple contract audits together to optimize credit usage.
                  </div>
                </div>
                
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="text-green-300 font-medium text-sm">🎯 Strategy</div>
                  <div className="text-white text-sm mt-1">
                    Use security-only analysis for quick checks to save credits.
                  </div>
                </div>

                <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <div className="text-purple-300 font-medium text-sm">⚡ Performance</div>
                  <div className="text-white text-sm mt-1">
                    Smaller code files use fewer credits. Consider modularizing large contracts.
                  </div>
                </div>

                {credits.planTier === 'Free' && (
                  <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <div className="text-yellow-300 font-medium text-sm">🚀 Upgrade</div>
                    <div className="text-white text-sm mt-1">
                      Pro plans offer better credit rates and bonus credits.
                    </div>
                    <Button 
                      size="sm" 
                      className="mt-2 bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => onPurchaseModalChange?.(true)}
                    >
                      View Plans
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Credit Purchase Modal */}
      <CreditPurchase
        open={showPurchaseModal}
        onOpenChange={onPurchaseModalChange}
        userId={userId}
        onClose={() => onPurchaseModalChange?.(false)}
      />
    </div>
  );
}