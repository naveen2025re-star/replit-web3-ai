import paypal from "paypal-rest-sdk";
import { Request, Response } from "express";

// Validate PayPal credentials - warn but don't crash if missing
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  console.warn("PayPal credentials are not configured. PayPal payments will not work until PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are set.");
}

// Smart PayPal configuration - auto-detect sandbox vs live
let paypalMode = "sandbox"; // Default to sandbox if no credentials
let clientId = process.env.PAYPAL_CLIENT_ID || "dummy";
let clientSecret = process.env.PAYPAL_CLIENT_SECRET || "dummy";

if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
  // If credentials look like sandbox, switch to sandbox mode
  if (clientId?.includes('sandbox') || clientId?.startsWith('AZa') || clientId?.startsWith('ATa')) {
    paypalMode = "sandbox";
    console.log("Detected sandbox credentials - switching to sandbox mode");
  } else {
    paypalMode = "live";
    console.log("Using live PayPal mode");
  }
  
  paypal.configure({
    mode: paypalMode, // Auto-detect sandbox vs live
    client_id: clientId,
    client_secret: clientSecret,
    // Add these additional configuration options for better reliability
    headers: {
      'User-Agent': 'SmartAudit/1.0'
    }
  });

  console.log(`PayPal configured for ${paypalMode.toUpperCase()} mode with Client ID:`, clientId?.substring(0, 10) + "...");
} else {
  console.log("PayPal not configured - using dummy configuration");
  paypal.configure({
    mode: "sandbox",
    client_id: "dummy",
    client_secret: "dummy"
  });
}

// Create PayPal payment
export const createPayment = (req: Request, res: Response) => {
  const { amount, currency = "USD", packageName = "Smart Contract Audit Credits" } = req.body;
  
  // Validate payment amount for security
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000) {
    return res.status(400).json({ 
      error: "Invalid payment amount", 
      details: "Amount must be between $0.01 and $10,000" 
    });
  }

  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: `${req.protocol}://${req.get('host')}/api/paypal/success`,
      cancel_url: `${req.protocol}://${req.get('host')}/api/paypal/cancel`,
    },
    application_context: {
      brand_name: "Smart Contract Auditor",
      locale: "en-US",
      landing_page: "BILLING",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
      return_url: `${req.protocol}://${req.get('host')}/api/paypal/success`,
      cancel_url: `${req.protocol}://${req.get('host')}/api/paypal/cancel`,
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: packageName,
              sku: "credits",
              price: parseFloat(amount).toFixed(2),
              currency: currency.toUpperCase(),
              quantity: 1,
            },
          ],
        },
        amount: {
          currency: currency.toUpperCase(),
          total: parseFloat(amount).toFixed(2),
          details: {
            subtotal: parseFloat(amount).toFixed(2)
          }
        },
        description: `${packageName} - Smart Contract Audit Credits`,
      },
    ],
  };

  paypal.payment.create(create_payment_json, (error: any, payment: any) => {
    if (error) {
      console.error("PayPal payment creation error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Provide specific error messages based on the error type
      let errorMessage = "Failed to create PayPal payment";
      let errorCode = "PAYPAL_ERROR";
      
      if (error.response) {
        console.error("PayPal API Response:", error.response);
        
        if (error.response.error === 'invalid_client') {
          errorMessage = "PayPal authentication failed. Please check your live PayPal credentials.";
          errorCode = "INVALID_CREDENTIALS";
        } else if (error.response.error_description) {
          errorMessage = error.response.error_description;
          errorCode = error.response.error;
        }
      }
      
      res.status(500).json({ 
        error: errorMessage,
        code: errorCode,
        details: error.message,
        suggestion: "Please verify your PayPal business account is verified and your live API credentials are correct."
      });
    } else {
      console.log("PayPal payment created successfully:", payment.id);
      
      // Find approval URL
      const approvalUrl = payment.links?.find((link: any) => link.rel === "approval_url");
      
      if (approvalUrl) {
        res.json({
          id: payment.id,
          approval_url: approvalUrl.href,
          status: "created"
        });
      } else {
        console.error("No approval URL found in payment:", payment);
        res.status(500).json({ error: "No approval URL found in PayPal response" });
      }
    }
  });
};

// Execute PayPal payment after approval
export const executePayment = (req: Request, res: Response) => {
  const paymentId = req.query.paymentId as string;
  const payerId = req.query.PayerID as string;

  if (!paymentId || !payerId) {
    return res.status(400).json({ error: "Missing payment ID or payer ID" });
  }

  console.log("Executing payment:", paymentId, "for payer:", payerId);

  // Get payment details first to get the amount
  paypal.payment.get(paymentId, (error: any, payment: any) => {
    if (error) {
      console.error("Error getting payment details:", error);
      return res.status(500).json({ error: "Failed to get payment details" });
    }

    const amount = payment.transactions?.[0]?.amount?.total;
    const currency = payment.transactions?.[0]?.amount?.currency;

    if (!amount || !currency) {
      return res.status(500).json({ error: "Invalid payment data" });
    }

    const execute_payment_json = {
      payer_id: payerId,
      transactions: [
        {
          amount: {
            currency: currency,
            total: amount,
          },
        },
      ],
    };

    paypal.payment.execute(paymentId, execute_payment_json, (executeError: any, executedPayment: any) => {
      if (executeError) {
        console.error("Payment execution error:", executeError);
        const frontendUrl = `${req.protocol}://${req.get('host')}/settings?tab=credits&payment=error&message=${encodeURIComponent(executeError.message || 'Payment failed')}`;
        res.redirect(frontendUrl);
      } else {
        console.log("Payment executed successfully:", executedPayment.id);
        
        // Redirect to success page with payment details
        const frontendUrl = `${req.protocol}://${req.get('host')}/settings?tab=credits&payment=success&amount=${amount}&currency=${currency}&paymentId=${executedPayment.id}`;
        res.redirect(frontendUrl);
      }
    });
  });
};

// Handle payment cancellation
export const cancelPayment = (req: Request, res: Response) => {
  console.log("Payment cancelled by user");
  const frontendUrl = `${req.protocol}://${req.get('host')}/settings?tab=credits&payment=cancelled`;
  res.redirect(frontendUrl);
};

// Get payment details
export const getPaymentDetails = (req: Request, res: Response) => {
  const { paymentId } = req.params;

  paypal.payment.get(paymentId, (error: any, payment: any) => {
    if (error) {
      console.error("Error getting payment details:", error);
      res.status(500).json({ error: "Failed to get payment details" });
    } else {
      res.json(payment);
    }
  });
};