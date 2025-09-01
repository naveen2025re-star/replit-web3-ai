import React, { useState, useEffect } from 'react';
import { useRazorpay } from 'react-razorpay';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader, CreditCard } from "lucide-react";

interface ModernRazorpayButtonProps {
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
}: ModernRazorpayButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  const { isLoading: isRazorpayLoading, Razorpay } = useRazorpay();

  // Detect mobile device for responsive handling
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const handlePayment = async () => {
    if (isProcessing || isRazorpayLoading || !Razorpay) return;
    
    setIsProcessing(true);

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

      // Modern Razorpay options with 2024 best practices
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Smart Contract Auditor',
        description: packageName,
        image: '', // Empty to prevent loading issues
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
            setIsProcessing(false);
          }
        },
        prefill: {
          name: 'Customer',
          email: 'customer@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#3b82f6',
        },
        modal: {
          ondismiss: (reason: any) => {
            console.log('Payment modal dismissed:', reason);
            setIsProcessing(false);
          },
          confirm_close: !isMobile, // Less friction on mobile
          escape: true,
          backdropclose: false
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        timeout: 300, // 5 minutes
        remember_customer: false,
        // Mobile-optimized settings
        ...(isMobile && {
          display: {
            language: 'en',
            hide: {
              email: false,
              contact: false,
              card: false,
              bank_account: false
            }
          }
        })
      };

      const razorpayInstance = new Razorpay(options);
      
      // Enhanced error handling with proper event listener cleanup
      const handlePaymentFailed = (response: any) => {
        console.error('Payment failed:', response.error);
        setIsProcessing(false);
        
        const errorMsg = response.error?.description || 
                        response.error?.reason || 
                        'Payment failed. Please try again.';
        
        toast({
          title: "Payment Failed",
          description: errorMsg,
          variant: "destructive",
        });
        
        if (onError) onError(new Error(errorMsg));
      };

      razorpayInstance.on('payment.failed', handlePaymentFailed);

      // Open payment modal
      razorpayInstance.open();

    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
      if (onError) onError(error);
    }
  };

  const isButtonDisabled = isProcessing || isRazorpayLoading || !Razorpay || disabled;

  return (
    <div className={`payment-container ${isMobile ? 'w-full' : ''}`}>
      {isRazorpayLoading && (
        <p className="text-sm text-gray-600 mb-2">Loading payment system...</p>
      )}
      
      <Button
        onClick={handlePayment}
        disabled={isButtonDisabled}
        className={`
          ${isMobile ? 'w-full py-4 text-lg' : 'py-3 px-6 text-base'}
          w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg 
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center min-h-[48px]
        `}
        data-testid="modern-razorpay-button"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin" />
            Processing...
          </div>
        ) : isRazorpayLoading ? (
          <div className="flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pay ${amount} with Razorpay
          </div>
        )}
      </Button>
    </div>
  );
}