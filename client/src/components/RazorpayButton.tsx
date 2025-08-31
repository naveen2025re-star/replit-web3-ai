import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader, CreditCard } from "lucide-react";

interface RazorpayButtonProps {
  amount: number;
  currency?: string;
  packageName: string;
  packageId: string;
  userId: string;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayButton({
  amount,
  currency = "INR",
  packageName,
  packageId,
  userId,
  onSuccess,
  onError,
  onCancel,
  disabled = false
}: RazorpayButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load Razorpay script dynamically with better error handling
  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      // Remove any existing scripts first
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      let timeoutId: NodeJS.Timeout;
      
      script.onload = () => {
        clearTimeout(timeoutId);
        // Give it a moment to initialize
        setTimeout(() => {
          resolve(!!window.Razorpay);
        }, 100);
      };
      
      script.onerror = () => {
        clearTimeout(timeoutId);
        console.error('Failed to load Razorpay script');
        resolve(false);
      };

      // Set a timeout for script loading
      timeoutId = setTimeout(() => {
        console.error('Razorpay script loading timeout');
        resolve(false);
      }, 10000); // 10 second timeout

      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setIsLoading(true);

      // Load Razorpay script with retry logic
      let razorpayLoaded = await loadRazorpay();
      
      // Retry once if failed
      if (!razorpayLoaded) {
        console.log('Retrying Razorpay script load...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        razorpayLoaded = await loadRazorpay();
      }
      
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection and try again.');
      }

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

      // Configure Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Smart Contract Auditor',
        description: `${packageName} - Smart Contract Audit Credits`,
        order_id: orderData.order_id,
        timeout: 300, // 5 minutes timeout
        handler: async function (paymentResponse: any) {
          try {
            setIsLoading(true);
            
            // Verify payment on backend
            const verificationResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                packageId: packageId,
                userId: userId
              }),
            });

            if (!verificationResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const verificationData = await verificationResponse.json();
            
            toast({
              title: "Payment Successful!",
              description: `Your payment has been processed successfully. Credits will be added to your account.`,
            });

            if (onSuccess) {
              onSuccess({
                ...paymentResponse,
                verified: true,
                orderData,
                verificationData
              });
            }

          } catch (error) {
            console.error('Payment verification failed:', error);
            toast({
              title: "Payment Verification Failed",
              description: "Your payment was processed but verification failed. Please contact support.",
              variant: "destructive",
            });

            if (onError) {
              onError(error);
            }
          } finally {
            setIsLoading(false);
          }
        },
        prefill: {
          name: `User ${userId}`,
          email: '',
          contact: ''
        },
        notes: {
          packageId: packageId,
          userId: userId,
          packageName: packageName
        },
        theme: {
          color: '#3b82f6',
          backdrop_color: 'rgba(0, 0, 0, 0.5)'
        },
        modal: {
          escape: true,
          animation: true,
          backdropclose: false,
          handleback: true,
          confirm_close: false,
          ondismiss: function() {
            console.log('Payment modal closed by user');
            setIsLoading(false);
            if (onCancel) {
              onCancel();
            }
          }
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: 'Pay using NetBanking',
                instruments: [
                  {
                    method: 'netbanking',
                    banks: ['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK']
                  }
                ]
              },
              other: {
                name: 'Other payment modes',
                instruments: [
                  {
                    method: 'card',
                  },
                  {
                    method: 'upi'
                  }
                ]
              }
            },
            hide: [
              {
                method: 'emi'
              }
            ],
            sequence: ['block.banks', 'block.other'],
            preferences: {
              show_default_blocks: true,
            }
          }
        }
      };

      // Open Razorpay checkout with error handling
      const paymentObject = new window.Razorpay(options);
      
      // Add error handler for payment object
      paymentObject.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        setIsLoading(false);
        
        toast({
          title: "Payment Failed",
          description: response.error.description || "Payment failed. Please try again.",
          variant: "destructive",
        });

        if (onError) {
          onError(new Error(response.error.description || 'Payment failed'));
        }
      });

      // Open the payment modal
      try {
        paymentObject.open();
      } catch (error) {
        console.error('Failed to open Razorpay modal:', error);
        setIsLoading(false);
        throw error;
      }

    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });

      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isLoading || disabled}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
      data-testid="razorpay-button"
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader className="h-4 w-4 animate-spin" />
          Setting up payment...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Pay ₹{amount} with Razorpay
        </div>
      )}
    </Button>
  );
}