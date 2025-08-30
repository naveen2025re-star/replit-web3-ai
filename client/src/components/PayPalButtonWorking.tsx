import React, { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface PayPalButtonWorkingProps {
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

export default function PayPalButtonWorking({
  amount,
  currency,
  intent,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonWorkingProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Clear any existing PayPal button
    if (paypalRef.current) {
      paypalRef.current.innerHTML = "";
    }

    const loadPayPalScript = async () => {
      try {
        // Remove existing PayPal script if any
        const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
        if (existingScript) {
          existingScript.remove();
        }

        // Get client ID from server
        const clientIdResponse = await fetch('/api/paypal/client-id');
        const { clientId } = await clientIdResponse.json();
        
        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=${intent.toLowerCase()}&components=buttons`;
        script.async = true;
        script.onload = () => {
          renderPayPalButton();
        };
        script.onerror = () => {
          console.error("Failed to load PayPal SDK");
          toast({
            title: "Error",
            description: "Failed to load PayPal. Please refresh the page.",
            variant: "destructive",
          });
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error("Failed to get PayPal client ID:", error);
        toast({
          title: "Error",
          description: "Failed to initialize PayPal. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    const renderPayPalButton = () => {
      if (!window.paypal || !paypalRef.current) {
        console.error("PayPal not loaded or ref not available");
        return;
      }

      try {
        window.paypal.Buttons({
          createOrder: async () => {
            try {
              console.log("Creating PayPal order...");
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

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const orderData = await response.json();
              console.log("Order created:", orderData);
              
              if (!orderData.id) {
                throw new Error("No order ID returned");
              }
              
              return orderData.id;
            } catch (error) {
              console.error("Error creating order:", error);
              toast({
                title: "Error",
                description: "Failed to create payment order. Please try again.",
                variant: "destructive",
              });
              throw error;
            }
          },
          
          onApprove: async (data: any) => {
            try {
              console.log("Payment approved, capturing order:", data.orderID);
              const response = await fetch(`/api/paypal/order/${data.orderID}/capture`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const orderData = await response.json();
              console.log("Payment captured:", orderData);
              
              toast({
                title: "Payment Successful!",
                description: "Your credits have been added to your account.",
              });
              
              if (onSuccess) {
                onSuccess(orderData);
              }
            } catch (error) {
              console.error("Error capturing payment:", error);
              toast({
                title: "Payment Error",
                description: "Payment was approved but failed to process. Please contact support.",
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
            });
            if (onCancel) {
              onCancel(data);
            }
          },
          
          onError: (err: any) => {
            console.error("PayPal button error:", err);
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
            height: 40,
          },
        }).render(paypalRef.current);
        
        console.log("PayPal button rendered successfully");
      } catch (error) {
        console.error("Error rendering PayPal button:", error);
        toast({
          title: "Error",
          description: "Failed to initialize PayPal. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    if (window.paypal) {
      renderPayPalButton();
    } else {
      loadPayPalScript().catch(error => {
        console.error('Failed to load PayPal script:', error);
        toast({
          title: "Error",
          description: "Failed to initialize PayPal. Please refresh the page.",
          variant: "destructive",
        });
      });
    }

    // Cleanup
    return () => {
      if (paypalRef.current) {
        paypalRef.current.innerHTML = "";
      }
    };
  }, [amount, currency, intent]);

  return (
    <div 
      ref={paypalRef} 
      className="paypal-button-container w-full min-h-[50px]"
      data-testid="paypal-button-working"
    />
  );
}