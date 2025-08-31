import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader, CreditCard } from "lucide-react";

interface SimpleRazorpayButtonProps {
  amount: number;
  currency?: string;
  packageName: string;
  packageId: string;
  userId: string;
  onSuccess?: (paymentData: any) => void;
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
    try {
      setIsLoading(true);

      // Create order on backend
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: currency,
          packageId: packageId,
          userId: userId,
          packageName: packageName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await response.json();

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Razorpay options with minimal fingerprinting
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Smart Contract Auditor',
        description: packageName,
        theme: {
          color: '#3b82f6',
          hide_topbar: false
        },
        readonly: {
          email: false,
          contact: false,
          name: false
        },
        handler: async function (response: any) {
          try {
            setIsLoading(true);
            
            // Verify payment
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
            // Re-enable body scroll with delay
            setTimeout(() => {
              document.body.style.overflow = 'unset';
            }, 100);
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: function() {
            console.log('Razorpay modal dismissed by user');
            // Re-enable body scroll with small delay
            setTimeout(() => {
              document.body.style.overflow = 'unset';
            }, 100);
            setIsLoading(false);
          },
          escape: true,
          backdropclose: true,
          confirm_close: false,
          animation: false,
          handle_frame_messages: false
        },
        config: {
          display: {
            language: 'en',
            blocks: {
              banks: {
                name: 'Pay via Bank Account',
                instruments: [
                  {
                    method: 'netbanking'
                  },
                  {
                    method: 'upi'
                  }
                ]
              }
            }
          }
        },
        send_sms_hash: false,
        allow_rotation: false
      };

      // Open payment with error handling
      const rzp = new window.Razorpay(options);
      
      // Add error handling for Razorpay instance
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response.error);
        // Re-enable body scroll with delay
        setTimeout(() => {
          document.body.style.overflow = 'unset';
        }, 100);
        setIsLoading(false);
        toast({
          title: "Payment Failed",
          description: response.error.description || "Payment failed. Please try again.",
          variant: "destructive",
        });
        if (onError) onError(new Error(response.error.description));
      });
      
      try {
        // Prevent body scroll when modal opens with delay
        setTimeout(() => {
          document.body.style.overflow = 'hidden';
        }, 50);
        
        // Open with iframe prevention
        rzp.open();
      } catch (error) {
        console.error('Failed to open Razorpay:', error);
        // Re-enable body scroll on error
        document.body.style.overflow = 'unset';
        setIsLoading(false);
        throw error;
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
      if (onError) onError(error);
    } finally {
      setIsLoading(false);
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