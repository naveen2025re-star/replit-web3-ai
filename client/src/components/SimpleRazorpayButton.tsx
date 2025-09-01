import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader, CreditCard } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SimpleRazorpayButtonProps {
  amount: number;
  currency?: string;
  packageName: string;
  packageId: string;
  userId: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
}

export default function SimpleRazorpayButton({
  amount,
  currency = "USD",
  packageName,
  packageId,
  userId,
  onSuccess,
  onError,
  disabled = false
}: SimpleRazorpayButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.defer = true; // Defer loading to avoid conflicts
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      
      // Add to head to avoid body conflicts
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      // Load Razorpay script with proper error handling
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway. Please check your internet connection.');
      }

      // Create purchase session
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create purchase session');
      }

      const { sessionId } = await response.json();

      // Create Razorpay order
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          packageId,
          userId,
          amount,
          currency,
          packageName
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create Razorpay order');
      }

      const orderData = await orderResponse.json();

      // Ultra-clean Razorpay configuration to avoid RTB tracking issues
      const options = {
        // Core payment options only
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Smart Contract Auditor',
        description: packageName,
        
        // Success handler
        handler: async function (response: any) {
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packageId: packageId,
                userId: userId
              }),
            });

            if (verifyResponse.ok) {
              toast({
                title: "Payment Successful!",
                description: "Credits have been added to your account.",
              });
              if (onSuccess) onSuccess(response);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Error",
              description: "Payment verification failed. Please contact support.",
              variant: "destructive",
            });
            if (onError) onError(error);
          } finally {
            setIsLoading(false);
          }
        },

        // Minimal theme to avoid conflicts
        theme: {
          color: '#3b82f6'
        },

        // Clean modal config - no complex options that trigger RTB
        modal: {
          ondismiss: function() {
            setIsLoading(false);
          }
        },

        // Disable analytics and tracking to avoid fingerprint errors
        config: {
          display: {
            hide: {
              analytics: true // Hide analytics to prevent tracking errors
            }
          }
        }
      };

      // Create Razorpay instance with error suppression
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      // Temporarily suppress Razorpay console errors about fingerprinting
      console.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('x-rtb-fingerprint-id') || 
            message.includes('fingerprint') || 
            message.includes('unsafe header')) {
          return; // Suppress these specific errors
        }
        originalConsoleError.apply(console, args);
      };
      
      console.warn = function(...args) {
        const message = args.join(' ');
        if (message.includes('x-rtb-fingerprint-id') || 
            message.includes('fingerprint')) {
          return; // Suppress these specific warnings
        }
        originalConsoleWarn.apply(console, args);
      };

      const rzp = new window.Razorpay(options);
      
      // Handle payment failures
      rzp.on('payment.failed', function (response: any) {
        setIsLoading(false);
        const errorMsg = response.error?.description || "Payment failed. Please try again.";
        toast({
          title: "Payment Failed",
          description: errorMsg,
          variant: "destructive",
        });
        if (onError) onError(new Error(errorMsg));
      });

      // Open the modal
      rzp.open();

      // Restore console functions after a delay
      setTimeout(() => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      }, 5000);

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
      setIsLoading(false);
      if (onError) onError(error);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isLoading || disabled}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
      data-testid="simple-razorpay-button"
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader className="h-4 w-4 animate-spin" />
          Processing...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Pay ${amount} with Razorpay
        </div>
      )}
    </Button>
  );
}