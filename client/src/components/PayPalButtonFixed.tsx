import React, { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface PayPalButtonFixedProps {
  amount: string;
  currency: string;
  intent: string;
  onSuccess?: (orderData: any) => void;
  onError?: (error: any) => void;
  onCancel?: (data: any) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalButtonFixed({
  amount,
  currency,
  intent,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonFixedProps) {
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if PayPal script is already loaded
    if (window.paypal) {
      renderPayPalButton();
    } else {
      loadPayPalScript();
    }
  }, [amount, currency, intent]);

  const loadPayPalScript = () => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.PAYPAL_CLIENT_ID || ""}&currency=${currency}&intent=${intent}&components=buttons`;
    script.onload = () => renderPayPalButton();
    script.onerror = () => {
      console.error("Failed to load PayPal SDK");
      toast({
        title: "Payment Error",
        description: "Failed to load PayPal. Please try again.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);
  };

  const renderPayPalButton = () => {
    if (!paypalContainerRef.current || !window.paypal) return;

    // Clear the container
    paypalContainerRef.current.innerHTML = "";

    window.paypal
      .Buttons({
        createOrder: async () => {
          try {
            const response = await fetch("/api/paypal/order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                amount: amount,
                currency: currency,
                intent: intent,
              }),
            });

            const orderData = await response.json();
            
            if (!response.ok) {
              throw new Error(orderData.error || "Failed to create order");
            }
            
            return orderData.id;
          } catch (error) {
            console.error("Error creating PayPal order:", error);
            toast({
              title: "Payment Error", 
              description: "Failed to create payment order. Please try again.",
              variant: "destructive",
            });
            throw error;
          }
        },
        onApprove: async (data: any) => {
          try {
            const response = await fetch(`/api/paypal/order/${data.orderID}/capture`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });

            const orderData = await response.json();
            
            if (!response.ok) {
              throw new Error(orderData.error || "Failed to capture payment");
            }
            
            console.log("Payment captured successfully:", orderData);
            
            toast({
              title: "Payment Successful!",
              description: "Your credits have been added to your account.",
            });
            
            if (onSuccess) {
              onSuccess({ ...orderData, orderId: data.orderID });
            }
          } catch (error) {
            console.error("Error capturing PayPal payment:", error);
            toast({
              title: "Payment Error",
              description: "Payment failed to process. Please contact support.",
              variant: "destructive",
            });
            if (onError) {
              onError(error);
            }
          }
        },
        onCancel: (data: any) => {
          console.log("Payment cancelled:", data);
          toast({
            title: "Payment Cancelled",
            description: "Your payment was cancelled.",
            variant: "default",
          });
          if (onCancel) {
            onCancel(data);
          }
        },
        onError: (err: any) => {
          console.error("PayPal error:", err);
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
          layout: "vertical",
          color: "blue",
          shape: "rect",
          label: "paypal",
        },
      })
      .render(paypalContainerRef.current);
  };

  return (
    <div 
      ref={paypalContainerRef} 
      className="paypal-button-container w-full"
      data-testid="paypal-button-container"
    />
  );
}