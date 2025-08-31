import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader } from "lucide-react";

interface PayPalButtonReliableProps {
  amount: string;
  currency: string;
  packageName: string;
  packageId?: string;
  userId?: string;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

export default function PayPalButtonReliable({
  amount,
  currency,
  packageName,
  packageId,
  userId,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonReliableProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setIsLoading(true);

      console.log("Creating PayPal payment for:", { amount, currency, packageName });

      // Create payment using standard PayPal REST API
      const response = await fetch("/api/paypal/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount).toFixed(2),
          currency: currency.toUpperCase(),
          packageName: packageName,
          packageId: packageId,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("PayPal API Error:", errorData);
        
        let userFriendlyMessage = errorData.error || `HTTP ${response.status}`;
        
        if (errorData.code === 'INVALID_CREDENTIALS') {
          userFriendlyMessage = "PayPal credentials need to be updated. Please contact support.";
        } else if (errorData.suggestion) {
          userFriendlyMessage = errorData.suggestion;
        }
        
        throw new Error(userFriendlyMessage);
      }

      const paymentData = await response.json();
      console.log("PayPal payment created:", paymentData);

      if (paymentData.approval_url) {
        // Redirect to PayPal for approval
        window.location.href = paymentData.approval_url;
      } else {
        throw new Error("No approval URL received from PayPal");
      }
    } catch (error) {
      console.error("PayPal payment creation failed:", error);
      setIsLoading(false);
      
      toast({
        title: "Payment Setup Failed",
        description: error instanceof Error ? error.message : "Failed to create PayPal payment",
        variant: "destructive",
      });

      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-medium py-3 px-6 rounded-lg transition-colors"
        data-testid="paypal-button-reliable"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin" />
            Creating Payment...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.281-.919c-.431-1.04-1.284-1.775-2.623-2.257C17.37 3.347 16.17 3.12 14.66 3.12H9.204c-.524 0-.968.382-1.05.9L6.86 9.797c-.082.518.317.937.841.937h2.62c4.298 0 7.664-1.747 8.647-6.797.03-.15.054-.294.077-.437.172-.87.259-1.733.177-2.583z"/>
            </svg>
            Pay with PayPal
            <ExternalLink className="h-4 w-4" />
          </div>
        )}
      </Button>
      
      <div className="text-xs text-center text-muted-foreground">
        Secure payment powered by PayPal
      </div>
    </div>
  );
}