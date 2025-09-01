import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader, CreditCard } from "lucide-react";

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

  const handlePayment = async () => {
    if (isLoading) return;
    
    setIsLoading(true);

    try {
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

      // Create a form and submit to Razorpay hosted checkout
      // This bypasses the problematic modal entirely
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://api.razorpay.com/v1/checkout/embedded';
      form.target = '_blank'; // Open in new tab
      
      // Add form fields
      const fields = {
        key_id: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Smart Contract Auditor',
        description: packageName,
        callback_url: `${window.location.origin}/payment-callback`,
        cancel_url: `${window.location.origin}/payment-cancel`
      };

      // Add hidden input fields to form
      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      // Add form to document and submit
      document.body.appendChild(form);
      form.submit();
      
      // Clean up
      document.body.removeChild(form);
      
      // Show success message
      toast({
        title: "Payment Window Opened",
        description: "Complete your payment in the new tab. This page will update automatically.",
      });

      // Set up payment monitoring
      const checkPaymentStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/razorpay/payment-status/${orderData.order_id}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.status === 'captured') {
              toast({
                title: "Payment Successful!",
                description: "Credits have been added to your account.",
              });
              if (onSuccess) onSuccess(statusData);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
        
        // Check again in 3 seconds
        setTimeout(checkPaymentStatus, 3000);
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
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
      data-testid="simple-razorpay-button"
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader className="h-4 w-4 animate-spin" />
          Opening Payment...
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