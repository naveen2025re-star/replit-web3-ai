import React, { useState, useEffect } from "react";
import { Copy, Gift, Users, Coins, Star, Share2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ConfettiEffect } from "./ConfettiEffect";
import { CoinDropAnimation } from "./CoinDropAnimation";

interface ReferralStats {
  referralCode: string;
  stats: {
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalCreditsEarned: number;
  };
  userStats: {
    referralCount: number;
    referralCreditsEarned: number;
  };
  recentReferrals: Array<{
    id: string;
    status: string;
    referrerReward: number;
    referredReward: number;
    createdAt: string;
    completedAt?: string;
    referredUser: {
      displayName?: string;
      username?: string;
      walletAddress?: string;
    };
  }>;
}

export function ReferralCard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCoinDrop, setShowCoinDrop] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: referralData, isLoading } = useQuery({
    queryKey: ["/api/referrals/stats"],
    retry: false,
  });

  const generateCodeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/referrals/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/stats"] });
      setShowConfetti(true);
      toast({
        title: "🎉 Referral Code Generated!",
        description: "Your new referral code is ready to share!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate referral code",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast({
        title: "✨ Copied!",
        description: "Referral code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareReferral = async () => {
    const stats = referralData as ReferralStats;
    if (!stats?.referralCode) return;
    
    const referralUrl = `${window.location.origin}?ref=${stats.referralCode}`;
    const shareText = `🚀 Join me on this amazing smart contract auditing platform! Get 200 bonus credits with my referral code: ${stats.referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Smart Contract Auditing Platform",
          text: shareText,
          url: referralUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(`${shareText}\n\n${referralUrl}`);
      }
    } else {
      copyToClipboard(`${shareText}\n\n${referralUrl}`);
    }
  };

  const getTierBadge = (count: number) => {
    if (count >= 20) return { icon: "🏆", name: "Ambassador", color: "bg-yellow-500/20 text-yellow-300 border-yellow-400" };
    if (count >= 10) return { icon: "💎", name: "Expert", color: "bg-purple-500/20 text-purple-300 border-purple-400" };
    if (count >= 5) return { icon: "⭐", name: "Pro", color: "bg-blue-500/20 text-blue-300 border-blue-400" };
    if (count >= 1) return { icon: "🌟", name: "Starter", color: "bg-green-500/20 text-green-300 border-green-400" };
    return { icon: "🔰", name: "Newbie", color: "bg-slate-500/20 text-slate-300 border-slate-400" };
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-800/40 to-slate-900/60 border-slate-700/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-slate-700 rounded"></div>
              <div className="h-16 bg-slate-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = referralData as ReferralStats;
  const tier = getTierBadge(stats?.userStats?.referralCount || 0);

  return (
    <>
      <Card className="bg-gradient-to-br from-teal-900/20 via-slate-800/40 to-purple-900/20 border-slate-700/50 overflow-hidden relative">
        {showConfetti && <ConfettiEffect trigger={showConfetti} type="achievement" onComplete={() => setShowConfetti(false)} />}
        {showCoinDrop && <CoinDropAnimation trigger={showCoinDrop} creditsAdded={500} onComplete={() => setShowCoinDrop(false)} />}
        
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 rounded-lg">
                <Gift className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Referral Program</h3>
                <p className="text-sm text-slate-400">Earn credits by inviting friends</p>
              </div>
            </div>
            <Badge className={tier.color}>
              {tier.icon} {tier.name}
            </Badge>
          </div>

          {/* Referral Code Section */}
          {stats?.referralCode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Your Referral Code</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shareReferral}
                  className="text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <code className="text-lg font-mono text-teal-400 font-bold flex-1">
                  {stats.referralCode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(stats.referralCode)}
                  className={`transition-all duration-200 ${
                    copiedCode 
                      ? "text-green-400 hover:text-green-300" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Button
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white"
              >
                {generateCodeMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <Gift className="h-4 w-4 mr-2" />
                )}
                Generate Referral Code
              </Button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-400">Total Referrals</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats?.stats?.totalReferrals || 0}
              </div>
              {stats?.stats?.pendingReferrals > 0 && (
                <div className="text-xs text-yellow-400 mt-1">
                  {stats.stats.pendingReferrals} pending
                </div>
              )}
            </div>
            
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-slate-400">Credits Earned</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats?.userStats?.referralCreditsEarned || 0}
              </div>
              <div className="text-xs text-green-400 mt-1">
                +500 per referral
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">How it works:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                <span>Share your code with friends</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span>They get <strong className="text-white">200 bonus credits</strong> on signup</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span>You earn <strong className="text-white">500 credits</strong> when they complete their first audit</span>
              </div>
            </div>
          </div>

          {/* Recent Referrals */}
          {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">Recent Referrals</h4>
              <div className="space-y-2">
                {stats.recentReferrals.slice(0, 3).map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        referral.status === "completed" || referral.status === "credited" 
                          ? "bg-green-400" 
                          : "bg-yellow-400"
                      }`}></div>
                      <div>
                        <div className="text-sm text-white">
                          {referral.referredUser.displayName || 
                           referral.referredUser.username || 
                           `${referral.referredUser.walletAddress?.slice(0, 6)}...${referral.referredUser.walletAddress?.slice(-4)}`}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        referral.status === "completed" || referral.status === "credited"
                          ? "border-green-400 text-green-300"
                          : "border-yellow-400 text-yellow-300"
                      }
                    >
                      {referral.status === "completed" || referral.status === "credited" ? "✓ Complete" : "⏳ Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}