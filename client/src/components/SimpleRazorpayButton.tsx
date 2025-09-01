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
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      // Create purchase session first
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
      console.log('💳 Order created:', orderData);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Use direct URL redirect to Razorpay's hosted page
      const paymentUrl = `https://api.razorpay.com/v1/checkout/embedded?` +
        `key_id=${encodeURIComponent(orderData.key_id)}&` +
        `amount=${encodeURIComponent(orderData.amount)}&` +
        `currency=${encodeURIComponent(orderData.currency)}&` +
        `order_id=${encodeURIComponent(orderData.order_id)}&` +
        `name=${encodeURIComponent('Smart Contract Auditor')}&` +
        `description=${encodeURIComponent(packageName)}&` +
        `callback_url=${encodeURIComponent(window.location.origin + '/payment-callback')}&` +
        `cancel_url=${encodeURIComponent(window.location.origin + '/payment-cancel')}`;

      console.log('🔗 Opening payment URL:', paymentUrl);

      // Open payment page in new tab
      const paymentWindow = window.open(paymentUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!paymentWindow) {
        throw new Error('Please allow popups to complete payment');
      }

      toast({
        title: "Payment Window Opened",
        description: "Complete your payment in the new tab. This page will update automatically.",
      });

      // Monitor payment status
      const checkPaymentStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/razorpay/payment-status/${orderData.order_id}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('📊 Payment status:', statusData);
            
            if (statusData.status === 'paid' || statusData.amount_paid > 0) {
              toast({
                title: "Payment Successful!",
                description: "Credits have been added to your account.",
              });
              if (onSuccess) onSuccess(statusData);
              setIsLoading(false);
              paymentWindow?.close();
              return;
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
        
        // Continue monitoring if payment window is still open
        if (!paymentWindow?.closed) {
          setTimeout(checkPaymentStatus, 3000);
        } else {
          console.log('Payment window closed by user');
          setIsLoading(false);
        }
      };

      // Start monitoring after a delay
      setTimeout(checkPaymentStatus, 5000);

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
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 focus-ring card-hover"
      data-testid="simple-razorpay-button"
      aria-label={`Pay $${amount} with Razorpay for ${packageName}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader className="h-4 w-4 animate-spin" />
          Processing Payment...
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