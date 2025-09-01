import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Check, Star, Zap, Shield, Users, AlertCircle, Sparkles, Crown, Gift } from "lucide-react";
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
import { EnterpriseContactModal } from "./EnterpriseContactModal";
import SimpleRazorpayButton from "./SimpleRazorpayButton";

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
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: packages = [], isLoading } = useQuery<CreditPackage[]>({
    queryKey: ['/api/credits/packages'],
    enabled: open,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiRequest("POST", "/api/credits/purchase", { packageId, userId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresContact) {
        window.open(`mailto:${data.contactEmail}?subject=Enterprise Plan Inquiry`, '_blank');
        toast({
          title: "Contact Sales",
          description: data.message,
        });
        if (onOpenChange) onOpenChange(false);
        if (onClose) onClose();
      } else if (data.requiresPayment) {
        // Payment will be handled by the button
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
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to process purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getPackageIcon = (name: string) => {
    if (name.includes('Free')) return <Gift className="h-6 w-6" />;
    if (name.includes('Pro+')) return <Crown className="h-6 w-6" />;
    if (name.includes('Pro')) return <Sparkles className="h-6 w-6" />;
    if (name.includes('Enterprise')) return <Users className="h-6 w-6" />;
    return <Star className="h-6 w-6" />;
  };

  const getPackageGradient = (name: string, isPopular: boolean) => {
    if (isPopular) return 'from-emerald-500/20 via-emerald-600/10 to-emerald-700/20 border-emerald-500/30';
    if (name.includes('Free')) return 'from-gray-500/20 via-gray-600/10 to-gray-700/20 border-gray-500/30';
    if (name.includes('Pro+')) return 'from-purple-500/20 via-purple-600/10 to-purple-700/20 border-purple-500/30';
    if (name.includes('Pro')) return 'from-blue-500/20 via-blue-600/10 to-blue-700/20 border-blue-500/30';
    if (name.includes('Enterprise')) return 'from-gold-500/20 via-gold-600/10 to-gold-700/20 border-gold-500/30';
    return 'from-slate-500/20 via-slate-600/10 to-slate-700/20 border-slate-500/30';
  };

  const handleQuickPurchase = (packageId: string) => {
    setSelectedPackage(packageId);
    purchaseMutation.mutate(packageId);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl border-slate-700/50 bg-slate-900/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Loading Credit Packages</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        setSelectedPackage(null);
      }
      if (onOpenChange) onOpenChange(newOpen);
      if (!newOpen && onClose) onClose();
    }}>
      <DialogContent className="bg-slate-900/98 border-slate-700/50 max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl backdrop-blur-lg" data-testid="dialog-credit-purchase">
        <DialogHeader className="pb-6 text-center">
          <DialogTitle className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Coins className="h-7 w-7 text-white" />
            </div>
            Choose Your Credits
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-lg mt-3 max-w-2xl mx-auto">
            Secure, fast auditing credits that never expire. Choose the perfect package for your smart contract security needs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative group transition-all duration-500 transform hover:scale-[1.02] bg-gradient-to-br ${getPackageGradient(pkg.name, pkg.popular)} border-2 backdrop-blur-sm ${
                pkg.popular ? 'shadow-2xl shadow-emerald-500/20 scale-[1.02]' : 'hover:shadow-xl hover:shadow-slate-900/30'
              } ${selectedPackage === pkg.id ? 'ring-2 ring-emerald-400/60 scale-[1.02]' : ''}`}
              data-testid={`card-package-${pkg.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-2 shadow-lg shadow-emerald-500/30 text-sm font-bold">
                    <Star className="h-4 w-4 mr-2 fill-current" />
                    MOST POPULAR
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4 pt-8">
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    pkg.popular ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 
                    pkg.name.includes('Pro+') ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                    pkg.name.includes('Pro') ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                    pkg.name.includes('Enterprise') ? 'bg-gradient-to-br from-gold-500 to-gold-600' :
                    'bg-gradient-to-br from-gray-500 to-gray-600'
                  } shadow-lg`}>
                    {getPackageIcon(pkg.name)}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                
                <div className="space-y-2">
                  <div className="text-4xl font-black text-white">
                    {pkg.name === 'Enterprise' ? (
                      <span className="text-2xl">Contact Us</span>
                    ) : pkg.price === 0 ? (
                      <span className="text-emerald-400">FREE</span>
                    ) : (
                      <span>${(pkg.price / 100).toFixed(2)}</span>
                    )}
                  </div>
                  
                  {pkg.savings > 0 && (
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
                      Save {pkg.savings}%
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Credit Summary */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-400 mb-1">
                      {pkg.totalCredits.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-300">Total Credits</div>
                    
                    {pkg.bonusCredits > 0 && (
                      <div className="mt-2 text-sm">
                        <span className="text-slate-400">{pkg.credits.toLocaleString()} base</span>
                        <span className="text-emerald-400 font-semibold"> + {pkg.bonusCredits.toLocaleString()} bonus</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {pkg.name === 'Enterprise' ? (
                    // Enterprise features
                    <>
                      <div className="flex items-center gap-3 text-blue-300">
                        <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm">Single Sign-On (SSO)</span>
                      </div>
                      <div className="flex items-center gap-3 text-blue-300">
                        <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm">Unlimited credits</span>
                      </div>
                      <div className="flex items-center gap-3 text-blue-300">
                        <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm">Priority support & SLA</span>
                      </div>
                      <div className="flex items-center gap-3 text-blue-300">
                        <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm">Custom integrations</span>
                      </div>
                    </>
                  ) : (
                    // Regular package features
                    <>
                      <div className="flex items-center gap-3 text-emerald-300">
                        <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm">Credits never expire</span>
                      </div>
                      <div className="flex items-center gap-3 text-emerald-300">
                        <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm">AI-powered security analysis</span>
                      </div>
                      <div className="flex items-center gap-3 text-emerald-300">
                        <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm">5-500 credits per audit</span>
                      </div>
                      
                      {pkg.name === 'Free' ? (
                        <div className="flex items-center gap-3 text-amber-400">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">Public audits only</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-emerald-300">
                          <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-sm">Public & private audits</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  {pkg.name === 'Enterprise' ? (
                    <Button
                      className="w-full h-14 text-lg font-bold transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-500 hover:via-purple-500 hover:to-blue-600 text-white shadow-xl shadow-blue-500/25 border-0"
                      onClick={() => setShowEnterpriseModal(true)}
                      data-testid="button-contact-enterprise"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Contact Sales
                    </Button>
                  ) : pkg.price === 0 ? (
                    <div className="w-full h-14 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-2 border-emerald-500/50 rounded-lg flex items-center justify-center">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                        <Check className="h-5 w-5" />
                        Included Free
                      </div>
                    </div>
                  ) : selectedPackage === pkg.id ? (
                    // Show payment interface when selected
                    <div className="space-y-3">
                      <div className="bg-slate-800/70 rounded-xl p-4 border border-emerald-500/30">
                        <div className="text-center mb-3">
                          <div className="text-emerald-400 font-semibold">Secure Payment</div>
                          <div className="text-sm text-slate-300">Powered by Razorpay</div>
                        </div>
                        
                        <SimpleRazorpayButton
                          amount={pkg.price / 100}
                          currency="USD"
                          packageName={pkg.name}
                          packageId={pkg.id}
                          userId={userId || ""}
                          onSuccess={() => {
                            toast({
                              title: "Payment Successful!",
                              description: `${pkg.totalCredits.toLocaleString()} credits added to your account.`,
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
                            setSelectedPackage(null);
                            if (onOpenChange) onOpenChange(false);
                            if (onClose) onClose();
                          }}
                          onError={() => {
                            setSelectedPackage(null);
                          }}
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-white"
                        onClick={() => setSelectedPackage(null)}
                      >
                        Choose Different Package
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className={`w-full h-14 text-lg font-bold transition-all duration-300 transform hover:scale-105 ${
                        pkg.popular
                          ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 text-white shadow-xl shadow-emerald-500/25'
                          : pkg.name.includes('Pro+')
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/20'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20'
                      } border-0`}
                      disabled={purchaseMutation.isPending}
                      onClick={() => handleQuickPurchase(pkg.id)}
                      data-testid={`button-purchase-${pkg.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {purchaseMutation.isPending && selectedPackage === pkg.id ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Coins className="h-5 w-5" />
                          Get Credits
                        </div>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage Guide */}
        <div className="mt-8 p-6 rounded-xl bg-slate-800/50 border border-slate-600/30">
          <h4 className="font-bold text-white mb-4 text-center">💡 How Credit Usage Works</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="font-semibold text-emerald-400 mb-1">Simple Contracts</div>
              <div className="text-slate-300">5-20 credits</div>
              <div className="text-xs text-slate-400 mt-1">Basic tokens, storage contracts</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <div className="font-semibold text-blue-400 mb-1">DeFi Protocols</div>
              <div className="text-slate-300">20-75 credits</div>
              <div className="text-xs text-slate-400 mt-1">NFT contracts, DeFi logic</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Crown className="h-6 w-6 text-purple-400" />
              </div>
              <div className="font-semibold text-purple-400 mb-1">Complex Systems</div>
              <div className="text-slate-300">75-500 credits</div>
              <div className="text-xs text-slate-400 mt-1">Multi-file projects, advanced DeFi</div>
            </div>
          </div>
        </div>

        <EnterpriseContactModal
          open={showEnterpriseModal}
          onOpenChange={setShowEnterpriseModal}
          userId={userId}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CreditPurchase;