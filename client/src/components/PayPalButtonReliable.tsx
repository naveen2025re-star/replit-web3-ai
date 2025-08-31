import React, { useState, useEffect, useRef } from "react";
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
  const [useDirectPayment, setUseDirectPayment] = useState(false);
  const { toast } = useToast();
  const paypalRef = useRef<HTMLDivElement>(null);

  // Load PayPal SDK and initialize buttons
  useEffect(() => {
    const loadPayPalSDK = () => {
      // Check if PayPal SDK is already loaded
      if ((window as any).paypal) {
        initializePayPalButtons();
        return;
      }

      // Load PayPal SDK
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AcxoLIazlHKHcBwJIa9i1ZnkhSvZ9LHPKCP9k17m8a8K-h7E5XqNLAx1JWUwV2P_y5nTBfAApF3-Rd_S'}&currency=${currency}&intent=capture`;
      script.async = true;
      script.onload = () => {
        initializePayPalButtons();
      };
      script.onerror = () => {
        console.error("Failed to load PayPal SDK, falling back to direct payment");
        setUseDirectPayment(true);
      };
      document.head.appendChild(script);
    };

    loadPayPalSDK();
  }, [amount, currency, packageId, userId]);

  const initializePayPalButtons = () => {
    if (!paypalRef.current || !(window as any).paypal) return;

    // Clear any existing PayPal buttons
    paypalRef.current.innerHTML = '';

    (window as any).paypal.Buttons({
      createOrder: async () => {
        try {
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
            throw new Error("Failed to create PayPal order");
          }

          const orderData = await response.json();
          return orderData.id;
        } catch (error) {
          console.error("Error creating PayPal order:", error);
          toast({
            title: "Payment Setup Failed",
            description: "Failed to create PayPal order. Please try again.",
            variant: "destructive",
          });
          throw error;
        }
      },
      onApprove: async (data: any) => {
        try {
          setIsLoading(true);
          
          // The payment is automatically captured by our success handler
          toast({
            title: "Payment Successful!",
            description: "Processing your payment and adding credits...",
          });

          // Payment success is handled by the redirect, so we just show success
          if (onSuccess) {
            onSuccess(data);
          }
        } catch (error) {
          console.error("Error processing payment:", error);
          toast({
            title: "Payment Error",
            description: "Payment failed to process. Please contact support.",
            variant: "destructive",
          });
          if (onError) {
            onError(error);
          }
        } finally {
          setIsLoading(false);
        }
      },
      onCancel: (data: any) => {
        toast({
          title: "Payment Cancelled",
          description: "Your payment was cancelled.",
        });
        if (onCancel) {
          onCancel();
        }
      },
      onError: (err: any) => {
        console.error("PayPal SDK error:", err);
        toast({
          title: "Payment Error",
          description: "An error occurred with PayPal. Please try again.",
          variant: "destructive",
        });
        if (onError) {
          onError(err);
        }
      },
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal',
        height: 45
      }
    }).render(paypalRef.current);
  };

  const handleDirectPayment = async () => {
    try {
      setIsLoading(true);

      console.log("Creating PayPal payment for:", { amount, currency, packageName });

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
        throw new Error(errorData.error || "Failed to create PayPal payment");
      }

      const paymentData = await response.json();
      console.log("PayPal payment created:", paymentData);

      if (paymentData.approval_url) {
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

  if (useDirectPayment) {
    return (
      <div className="space-y-4">
        <Button
          onClick={handleDirectPayment}
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

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4 animate-spin" />
          Processing payment...
        </div>
      )}
      
      <div 
        ref={paypalRef}
        className="min-h-[45px]"
        data-testid="paypal-button-sdk"
      />
      
      <div className="text-xs text-center text-muted-foreground">
        Secure payment powered by PayPal
      </div>
    </div>
  );
}