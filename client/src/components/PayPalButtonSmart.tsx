import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PayPalErrorHandler } from "./PayPalErrorHandler";

interface PayPalButtonSmartProps {
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

export default function PayPalButtonSmart({
  amount,
  currency,
  intent,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonSmartProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  const initializePayPal = async () => {
    try {
      setIsLoading(true);
      setPaypalError(null);

      // Clear any existing content
      if (paypalRef.current) {
        paypalRef.current.innerHTML = "";
      }

      // Remove existing scripts
      const existingScripts = document.querySelectorAll('script[src*="paypal.com"]');
      existingScripts.forEach(script => script.remove());

      // Get client ID from server
      const clientIdResponse = await fetch('/api/paypal/client-id');
      if (!clientIdResponse.ok) {
        throw new Error('Failed to get PayPal client ID');
      }
      const { clientId } = await clientIdResponse.json();

      // Load PayPal SDK with specific parameters for sandbox reliability
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=${intent.toLowerCase()}&components=buttons&enable-funding=paypal&disable-funding=credit,card`;
      script.async = true;
      
      script.onload = () => {
        renderPayPalButtons();
      };
      
      script.onerror = () => {
        setPaypalError("Failed to load PayPal SDK - this is a common sandbox issue");
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error("PayPal initialization error:", error);
      setPaypalError("PayPal initialization failed - sandbox environment issue");
      setIsLoading(false);
    }
  };

  const renderPayPalButtons = async () => {
    if (!window.paypal || !paypalRef.current) {
      setPaypalError("PayPal SDK not available");
      setIsLoading(false);
      return;
    }

    try {
      await window.paypal.Buttons({
        createOrder: async () => {
          try {
            console.log("Creating PayPal order for amount:", amount);
            
            const response = await fetch("/api/paypal/order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                amount: parseFloat(amount).toFixed(2),
                currency: currency.toUpperCase(),
                intent: intent.toUpperCase(),
              }),
            });

            if (!response.ok) {
              const errorData = await response.text();
              console.error("Order creation failed:", response.status, errorData);
              throw new Error(`Order creation failed: ${response.status}`);
            }

            const orderData = await response.json();
            console.log("Order created successfully:", orderData);
            
            if (!orderData.id) {
              throw new Error("No order ID returned from PayPal");
            }
            
            return orderData.id;
          } catch (error) {
            console.error("Error in createOrder:", error);
            setPaypalError("PayPal order creation failed - common sandbox issue");
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
              const errorData = await response.text();
              console.error("Payment capture failed:", response.status, errorData);
              throw new Error(`Payment capture failed: ${response.status}`);
            }

            const orderData = await response.json();
            console.log("Payment captured successfully:", orderData);
            
            toast({
              title: "Payment Successful!",
              description: "Your credits have been added to your account.",
            });
            
            if (onSuccess) {
              onSuccess(orderData);
            }
          } catch (error) {
            console.error("Error capturing payment:", error);
            setPaypalError("Payment processing failed");
            if (onError) {
              onError(error);
            }
          }
        },

        onCancel: (data: any) => {
          console.log("Payment cancelled by user:", data);
          toast({
            title: "Payment Cancelled",
            description: "You cancelled the payment.",
          });
          if (onCancel) {
            onCancel(data);
          }
        },

        onError: (err: any) => {
          console.error("PayPal button error:", err);
          setPaypalError("PayPal encountered an error - sandbox issue");
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
      
      setIsLoading(false);
      console.log("PayPal buttons rendered successfully");
    } catch (error) {
      console.error("Error rendering PayPal buttons:", error);
      setPaypalError("PayPal buttons failed to render - sandbox issue");
      setIsLoading(false);
    }
  };

  const retryPayPal = () => {
    setPaypalError(null);
    initializePayPal();
  };

  useEffect(() => {
    if (window.paypal) {
      // PayPal already loaded, render directly
      renderPayPalButtons();
    } else {
      // Load PayPal SDK
      initializePayPal();
    }

    return () => {
      if (paypalRef.current) {
        paypalRef.current.innerHTML = "";
      }
    };
  }, [amount, currency, intent]);

  if (paypalError) {
    return (
      <PayPalErrorHandler 
        onRetry={retryPayPal}
        packageName={`$${amount} ${currency} Package`}
        amount={amount}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          Loading PayPal...
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={paypalRef} 
      className="paypal-button-container w-full min-h-[50px]"
      data-testid="paypal-button-smart"
    />
  );
}