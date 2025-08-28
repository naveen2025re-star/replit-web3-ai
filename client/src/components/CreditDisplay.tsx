import { Coins, TrendingUp, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

interface CreditStats {
  balance: number;
  totalUsed: number;
  totalEarned: number;
  lastGrant: string | null;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

interface CreditDisplayProps {
  userId?: string;
  showPurchaseButton?: boolean;
  onPurchaseClick?: () => void;
  compact?: boolean;
}

export function CreditDisplay({ 
  userId, 
  showPurchaseButton = true, 
  onPurchaseClick,
  compact = false 
}: CreditDisplayProps) {
  const { data: credits, isLoading } = useQuery<CreditStats>({
    queryKey: ['/api/credits/balance', userId],
    queryFn: async () => {
      const response = await fetch(`/api/credits/balance?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 animate-pulse" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credits) {
    return null;
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getBalanceColor = (balance: number) => {
    if (balance >= 1000) return "text-green-600";
    if (balance >= 100) return "text-yellow-600";
    return "text-red-600";
  };

  const getBalanceVariant = (balance: number) => {
    if (balance >= 1000) return "default";
    if (balance >= 100) return "secondary";
    return "destructive";
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
              <Coins className="h-4 w-4" />
              <Badge variant={getBalanceVariant(credits.balance)} className="px-2 py-1">
                {formatNumber(credits.balance)}
              </Badge>
              {showPurchaseButton && credits.balance < 100 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onPurchaseClick}
                  className="h-6 px-2 text-xs"
                  data-testid="button-buy-credits"
                >
                  Buy
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>Current Balance: {formatNumber(credits.balance)} credits</p>
              <p>Total Used: {formatNumber(credits.totalUsed)} credits</p>
              <p>Total Earned: {formatNumber(credits.totalEarned)} credits</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card data-testid="card-credit-display">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5" />
          Credit Balance
          {credits.balance < 100 && (
            <Badge variant="destructive" className="ml-auto">
              Low Balance
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Current Balance</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Credits available for smart contract audits</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className={`text-2xl font-bold ${getBalanceColor(credits.balance)}`} data-testid="text-credit-balance">
              {formatNumber(credits.balance)}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Total Used</span>
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-muted-foreground" data-testid="text-credits-used">
              {formatNumber(credits.totalUsed)}
            </p>
          </div>
        </div>

        {credits.balance < 100 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium mb-2">
              Low Credit Warning
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              You're running low on credits. Most audits require 10-100 credits depending on complexity.
            </p>
            {showPurchaseButton && (
              <Button 
                size="sm" 
                onClick={onPurchaseClick}
                className="w-full"
                data-testid="button-purchase-credits"
              >
                Purchase More Credits
              </Button>
            )}
          </div>
        )}

        {showPurchaseButton && credits.balance >= 100 && (
          <Button 
            variant="outline" 
            onClick={onPurchaseClick}
            className="w-full"
            data-testid="button-purchase-credits"
          >
            <Coins className="h-4 w-4 mr-2" />
            Purchase More Credits
          </Button>
        )}

        {credits.recentTransactions && credits.recentTransactions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {credits.recentTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{tx.reason}</span>
                  <span className={tx.amount > 0 ? "text-green-600" : "text-red-600"}>
                    {tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CreditDisplay;