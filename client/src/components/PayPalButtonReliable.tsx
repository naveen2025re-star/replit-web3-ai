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
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const { toast } = useToast();
  const paypalRef = useRef<HTMLDivElement>(null);

  // Load PayPal SDK and initialize buttons
  useEffect(() => {
    // Skip SDK loading and use direct payment method temporarily
    console.log("Skipping SDK, using direct payment to avoid redirect issues");
    setUseDirectPayment(true);
    return;

    // SDK loading code (disabled for now)
    const loadPayPalSDK = () => {
      if ((window as any).paypal) {
        console.log("PayPal SDK already loaded, initializing buttons");
        setSdkLoaded(true);
        initializePayPalButtons();
        return;
      }

      console.log("Loading PayPal SDK...");
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=AcxoLIazlHKHcBwJIa9i1ZnkhSvZ9LHPKCP9k17m8a8K-h7E5XqNLAx1JWUwV2P_y5nTBfAApF3-Rd_S&currency=${currency}&intent=capture&disable-funding=credit,card`;
      script.async = true;
      script.onload = () => {
        console.log("PayPal SDK loaded successfully");
        setSdkLoaded(true);
        initializePayPalButtons();
      };
      script.onerror = () => {
        console.error("Failed to load PayPal SDK, falling back to direct payment");
        setUseDirectPayment(true);
      };
      document.head.appendChild(script);
    };

    setTimeout(loadPayPalSDK, 100);
  }, [amount, currency, packageId, userId]);

  const initializePayPalButtons = () => {
    if (!paypalRef.current || !(window as any).paypal) {
      console.error("PayPal ref or SDK not available");
      return;
    }

    // Clear any existing PayPal buttons
    paypalRef.current.innerHTML = '';
    console.log("Initializing PayPal SDK buttons...");

    (window as any).paypal.Buttons({
      createOrder: async () => {
        try {
          // Use a direct order creation for SDK (different from redirect approach)
          const orderData = {
            intent: 'CAPTURE',
            purchase_units: [{
              amount: {
                currency_code: currency.toUpperCase(),
                value: parseFloat(amount).toFixed(2)
              },
              description: `${packageName} - Credits`,
              custom_id: packageId && userId ? `${packageId}-${userId}` : undefined
            }]
          };

          // Create order directly through PayPal SDK
          const order = await fetch('/api/paypal/sdk-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
          });

          if (!order.ok) {
            // Fallback to old method if new endpoint doesn't exist
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
                sdkMode: true, // Flag to indicate SDK usage
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to create PayPal order");
            }

            const orderData = await response.json();
            return orderData.id;
          }

          const orderResult = await order.json();
          return orderResult.id;
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
    // For now, show a message that PayPal needs to be completed externally
    toast({
      title: "PayPal Payment Setup",
      description: "We're setting up a better PayPal integration. For now, please contact support to complete your purchase.",
      variant: "default",
    });
    
    if (onError) {
      onError(new Error("PayPal integration temporarily disabled"));
    }
    
    // Temporarily disabled to prevent the redirect issue
    return;

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
        <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              PayPal Integration Notice
            </h4>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            We're currently updating our PayPal integration to provide a better payment experience. 
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => {
                const subject = `Credit Purchase Request - ${packageName}`;
                const body = `Hi,\n\nI would like to purchase:\n- Package: ${packageName}\n- Amount: $${amount}\n- Package ID: ${packageId}\n\nPlease help me complete this purchase.\n\nThank you!`;
                window.open(`mailto:support@yoursite.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Contact Support for Purchase
            </Button>
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
              Or use the test endpoint to simulate successful purchase
            </p>
            <Button
              onClick={() => {
                window.location.href = `/api/paypal/test-success?userId=${userId}&packageId=${packageId}`;
              }}
              variant="outline"
              size="sm"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300"
            >
              Test Purchase (Development Only)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!sdkLoaded && !useDirectPayment && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4 animate-spin" />
          Loading PayPal...
        </div>
      )}
      
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4 animate-spin" />
          Processing payment...
        </div>
      )}
      
      {sdkLoaded && (
        <div 
          ref={paypalRef}
          className="min-h-[45px]"
          data-testid="paypal-button-sdk"
        />
      )}
      
      {!sdkLoaded && !useDirectPayment && (
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Loading secure PayPal checkout...
          </p>
        </div>
      )}
      
      <div className="text-xs text-center text-muted-foreground">
        Secure payment powered by PayPal
      </div>
    </div>
  );
}