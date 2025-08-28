import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Check, Star, Zap, Shield, Users } from "lucide-react";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

export function CreditPurchase({ open, onOpenChange, userId }: CreditPurchaseProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: packages = [], isLoading } = useQuery<CreditPackage[]>({
    queryKey: ['/api/credits/packages'],
    enabled: open,
  });

  const [paymentData, setPaymentData] = useState<any>(null);

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiRequest("POST", "/api/credits/purchase", { packageId, userId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresPayment) {
        setPaymentData(data);
      } else {
        toast({
          title: "Credits Added!",
          description: `Successfully added ${data.creditsAdded} credits to your account.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
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
      onOpenChange(false);
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
    if (name.includes('Starter')) return <Zap className="h-5 w-5" />;
    if (name.includes('Developer')) return <Shield className="h-5 w-5" />;
    if (name.includes('Team')) return <Users className="h-5 w-5" />;
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-credit-purchase">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-6 w-6" />
            Purchase Credits
          </DialogTitle>
          <DialogDescription>
            Choose a credit package to continue auditing smart contracts. Credits never expire and are used only when you run successful audits.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                pkg.popular ? 'ring-2 ring-primary shadow-lg' : ''
              } ${selectedPackage === pkg.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
              data-testid={`card-package-${pkg.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
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
                  <p className="text-3xl font-bold text-primary">
                    {formatPrice(pkg.price)}
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
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                    disabled={purchaseMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pkg.id);
                    }}
                    data-testid={`button-purchase-${pkg.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {purchaseMutation.isPending && selectedPackage === pkg.id ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Coins className="h-4 w-4 mr-2" />
                        Purchase with PayPal
                      </>
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