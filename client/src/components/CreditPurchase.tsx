import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Check, Star, Zap, Shield, Users, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PayPalButton from "./PayPalButton";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  popular: boolean;
  savings: number;
}

interface CreditPurchaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userId?: string;
  onClose?: () => void;
}

export function CreditPurchase({ open = true, onOpenChange, userId, onClose }: CreditPurchaseProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: packages = [], isLoading } = useQuery<CreditPackage[]>({
    queryKey: ['/api/credits/packages'],
    enabled: open,
  });

  // Check if user has already claimed free credits
  const { data: hasClaimedFree } = useQuery({
    queryKey: ['/api/credits/check-free-claim', userId],
    queryFn: async () => {
      if (!userId) return false;
      const response = await fetch(`/api/credits/check-free-claim?userId=${userId}`);
      const data = await response.json();
      return data.hasClaimed || false;
    },
    enabled: open && !!userId,
  });

  const [paymentData, setPaymentData] = useState<any>(null);

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiRequest("POST", "/api/credits/purchase", { packageId, userId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresContact) {
        // Handle Enterprise package - open contact email
        window.open(`mailto:${data.contactEmail}?subject=Enterprise Plan Inquiry`, '_blank');
        toast({
          title: "Contact Sales",
          description: data.message,
        });
        if (onOpenChange) onOpenChange(false);
        if (onClose) onClose();
      } else if (data.requiresPayment) {
        setPaymentData(data);
      } else {
        toast({
          title: "Credits Added!",
          description: `Successfully added ${data.creditsAdded} credits to your account.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
        if (onOpenChange) onOpenChange(false);
        if (onClose) onClose();
      }
    },
    onError: (error: any) => {
      // Handle already claimed free credits error
      if (error.message?.includes('already claimed')) {
        toast({
          title: "Free Credits Already Claimed",
          description: "You've already received your free credits! Upgrade to Pro or Pro+ for more credits.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to process purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completePurchaseMutation = useMutation({
    mutationFn: async ({ packageId, paypalOrderId }: { packageId: string; paypalOrderId: string }) => {
      const response = await apiRequest("POST", "/api/credits/purchase/complete", { 
        packageId, 
        paypalOrderId, 
        userId 
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credits Added!",
        description: `Successfully added ${data.creditsAdded} credits to your account.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
      setPaymentData(null);
      setSelectedPackage(null);
      if (onOpenChange) onOpenChange(false);
      if (onClose) onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getPackageIcon = (name: string) => {
    if (name.includes('Free')) return <Zap className="h-5 w-5" />;
    if (name.includes('Pro+')) return <Star className="h-5 w-5" />;
    if (name.includes('Pro')) return <Shield className="h-5 w-5" />;
    if (name.includes('Enterprise')) return <Users className="h-5 w-5" />;
    return <Star className="h-5 w-5" />;
  };

  const handlePurchase = (packageId: string) => {
    setSelectedPackage(packageId);
    purchaseMutation.mutate(packageId);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Purchase Credits</DialogTitle>
            <DialogDescription>Loading credit packages...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl backdrop-blur-sm" data-testid="dialog-credit-purchase">
        <DialogHeader className="pb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-t-lg -z-10" />
          <DialogTitle className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Coins className="h-6 w-6 text-white" />
            </div>
            Choose Your Credits
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-lg mt-2">
            Select the perfect credit package for your smart contract auditing needs. Credits never expire and unlock powerful security analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-600/30 backdrop-blur-sm ${
                pkg.popular ? 'ring-2 ring-emerald-500/50 shadow-xl shadow-emerald-500/20' : 'hover:shadow-xl hover:shadow-slate-900/50'
              } ${selectedPackage === pkg.id ? 'ring-2 ring-emerald-500/70 scale-105' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
              data-testid={`card-package-${pkg.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 shadow-lg shadow-emerald-500/25">
                    <Star className="h-4 w-4 mr-2 fill-current" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-3">
                <div className="flex justify-center mb-2">
                  {getPackageIcon(pkg.name)}
                </div>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-emerald-400">
                    {pkg.name === 'Enterprise' ? 'Contact Us' : pkg.price === 0 ? 'Free' : formatPrice(pkg.price)}
                  </p>
                  {pkg.savings > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Save {pkg.savings}%
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Base Credits</span>
                    <span className="font-medium">{formatNumber(pkg.credits)}</span>
                  </div>
                  
                  {pkg.bonusCredits > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600">Bonus Credits</span>
                      <span className="font-medium text-green-600">
                        +{formatNumber(pkg.bonusCredits)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Credits</span>
                      <span className="text-lg font-bold text-primary">
                        {formatNumber(pkg.totalCredits)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>Credits never expire</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>Used only for successful audits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>5-500 credits per audit</span>
                  </div>
                  {pkg.name === 'Free' && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      <span className="text-amber-600">Public audits only</span>
                    </div>
                  )}
                  {(pkg.name === 'Pro' || pkg.name === 'Pro+') && (
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Public & private audits</span>
                    </div>
                  )}
                </div>

                {paymentData && selectedPackage === pkg.id ? (
                  <div className="space-y-2">
                    <p className="text-sm text-center text-muted-foreground mb-4">
                      Complete your purchase with PayPal
                    </p>
                    <PayPalButton
                      amount={paymentData.amount}
                      currency={paymentData.currency}
                      intent="CAPTURE"
                      onSuccess={(orderData) => {
                        completePurchaseMutation.mutate({
                          packageId: paymentData.packageId,
                          paypalOrderId: orderData.orderId
                        });
                      }}
                      onError={(error) => {
                        console.error('PayPal payment failed:', error);
                        toast({
                          title: "Payment Failed",
                          description: "PayPal payment failed. Please try again.",
                          variant: "destructive",
                        });
                        setPaymentData(null);
                        setSelectedPackage(null);
                      }}
                      onCancel={() => {
                        setPaymentData(null);
                        setSelectedPackage(null);
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPaymentData(null);
                        setSelectedPackage(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    className={`w-full h-12 text-base font-bold transition-all duration-300 transform hover:scale-105 ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 text-white shadow-xl shadow-emerald-500/25'
                        : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white shadow-lg hover:shadow-xl border-slate-600/50'
                    }`}
                    disabled={purchaseMutation.isPending || (pkg.price === 0 && hasClaimedFree)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pkg.id);
                    }}
                    data-testid={`button-purchase-${pkg.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {purchaseMutation.isPending && selectedPackage === pkg.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        Processing...
                      </div>
                    ) : pkg.name === 'Enterprise' ? (
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Contact Sales
                      </div>
                    ) : pkg.price === 0 ? (
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        {hasClaimedFree ? 'Already Claimed' : 'Get Free Credits'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        Purchase with PayPal
                      </div>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted">
          <h4 className="font-medium mb-2">How Credit Pricing Works</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <strong>Simple Contracts (5-20 credits)</strong>
              <p>Basic ERC-20 tokens, simple storage contracts</p>
            </div>
            <div>
              <strong>Medium Contracts (20-75 credits)</strong>
              <p>DeFi protocols, NFT contracts with logic</p>
            </div>
            <div>
              <strong>Complex Contracts (75-500 credits)</strong>
              <p>Multi-file projects, advanced DeFi protocols</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreditPurchase;