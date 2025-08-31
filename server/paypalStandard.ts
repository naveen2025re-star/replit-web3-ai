import paypal from "paypal-rest-sdk";
import { Request, Response } from "express";
import axios from "axios";

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

// Create PayPal payment using modern Orders v2 API
export const createPayment = async (req: Request, res: Response) => {
  const { amount, currency = "USD", packageName = "Smart Contract Audit Credits", packageId, userId } = req.body;
  
  // Validate payment amount for security
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000) {
    return res.status(400).json({ 
      error: "Invalid payment amount", 
      details: "Amount must be between $0.01 and $10,000" 
    });
  }

  // Check if credentials are configured
  if (!clientId || !clientSecret || clientId === 'dummy') {
    return res.status(500).json({
      error: "PayPal not configured",
      code: "MISSING_CREDENTIALS",
      details: "PayPal credentials are not properly configured"
    });
  }

  try {
    // Using axios for modern PayPal Orders v2 API calls
    
    // Get access token first
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const apiBase = paypalMode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    
    console.log(`Creating PayPal order in ${paypalMode} mode`);
    
    const authResponse = await axios.post(`${apiBase}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = authResponse.data.access_token;
    
    // Create order using Orders v2 API
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: parseFloat(amount).toFixed(2)
        },
        description: `${packageName} - Smart Contract Audit Credits`,
        custom_id: packageId ? `${packageId}-${userId}` : undefined // Store package and user info
      }],
      application_context: {
        brand_name: "Smart Contract Auditor",
        landing_page: "BILLING",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: `${req.protocol}://${req.get('host')}/api/paypal/success`,
        cancel_url: `${req.protocol}://${req.get('host')}/api/paypal/cancel`
      }
    };
    
    const orderResponse = await axios.post(`${apiBase}/v2/checkout/orders`, 
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );
    
    const order = orderResponse.data;
    console.log("PayPal order created successfully:", order.id);
    
    // Find approval URL
    const approvalUrl = order.links?.find((link: any) => link.rel === "approve");
    
    if (approvalUrl) {
      res.json({
        id: order.id,
        approval_url: approvalUrl.href,
        status: "created"
      });
    } else {
      console.error("No approval URL found in order:", order);
      res.status(500).json({ error: "No approval URL found in PayPal response" });
    }
    
  } catch (error: any) {
    console.error("PayPal order creation error:", error.response?.data || error.message);
    
    let errorMessage = "Failed to create PayPal order";
    let errorCode = "PAYPAL_ERROR";
    
    if (error.response?.data) {
      const errorData = error.response.data;
      if (errorData.name === 'VALIDATION_ERROR') {
        errorMessage = "PayPal validation error: " + (errorData.details?.[0]?.issue || errorData.message);
        errorCode = "VALIDATION_ERROR";
      } else if (errorData.error === 'invalid_client') {
        errorMessage = "PayPal authentication failed. Please check your live PayPal credentials.";
        errorCode = "INVALID_CREDENTIALS";
      }
    }
    
    res.status(500).json({ 
      error: errorMessage,
      code: errorCode,
      details: error.response?.data || error.message,
      suggestion: "Please verify your PayPal business account is verified and your live API credentials are correct."
    });
  }
};

// Execute PayPal order after approval (Orders v2 API)
export const executePayment = async (req: Request, res: Response) => {
  const orderId = req.query.token as string; // Orders v2 uses 'token' instead of 'paymentId'
  
  if (!orderId) {
    return res.status(400).json({ error: "Missing order ID" });
  }

  console.log("Capturing PayPal order:", orderId);

  try {
    // Get access token first
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const apiBase = paypalMode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    
    const authResponse = await axios.post(`${apiBase}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = authResponse.data.access_token;
    
    // Capture the order
    const captureResponse = await axios.post(`${apiBase}/v2/checkout/orders/${orderId}/capture`, 
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );
    
    const capturedOrder = captureResponse.data;
    console.log("Order captured successfully:", capturedOrder.id);
    
    // Extract payment details
    const amount = capturedOrder.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    const currency = capturedOrder.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code;
    
    if (amount && currency) {
      // Extract package and user info from custom_id
      const customId = capturedOrder.purchase_units?.[0]?.custom_id;
      
      if (customId) {
        const [packageId, userId] = customId.split('-');
        
        if (packageId && userId) {
          try {
            // Import the credit service
            const { CreditService } = await import('./creditService');
            
            // Get package details
            const packages = await CreditService.getCreditPackages();
            const selectedPackage = packages.find(p => p.id === packageId);
            
            if (selectedPackage) {
              // Add credits to user account
              const result = await CreditService.addCredits(
                userId,
                selectedPackage.totalCredits,
                "purchase",
                `Purchased ${selectedPackage.name} package via PayPal`,
                { packageId, paypalOrderId: capturedOrder.id, amount, currency }
              );
              
              if (result.success) {
                console.log(`Credits added successfully: ${selectedPackage.totalCredits} credits to user ${userId}`);
                // Redirect to success page with payment details
                const frontendUrl = `${req.protocol}://${req.get('host')}/settings?tab=credits&payment=success&amount=${amount}&currency=${currency}&credits=${selectedPackage.totalCredits}&paymentId=${capturedOrder.id}`;
                console.log(`Redirecting to success page: ${frontendUrl}`);
                res.redirect(frontendUrl);
                return;
              } else {
                console.error("Failed to add credits:", result.error);
              }
            } else {
              console.error("Package not found:", packageId);
            }
          } catch (error) {
            console.error("Error processing credit addition:", error);
          }
        }
      }
      
      // Fallback redirect for successful payment but failed credit processing
      console.log(`Payment successful: ${amount} ${currency}`);
      const frontendUrl = `${req.protocol}://${req.get('host')}/settings?tab=credits&payment=success&amount=${amount}&currency=${currency}&paymentId=${capturedOrder.id}&warning=credits_not_added`;
      console.log(`Redirecting to fallback success page: ${frontendUrl}`);
      res.redirect(frontendUrl);
    } else {
      console.error("Invalid capture response:", capturedOrder);
      const frontendUrl = `${req.protocol}://${req.get('host')}/settings?tab=credits&payment=error&message=${encodeURIComponent('Invalid payment response')}`;
      res.redirect(frontendUrl);
    }
    
  } catch (error: any) {
    console.error("Order capture error:", error.response?.data || error.message);
    
    // Handle specific PayPal errors
    let errorMessage = 'Payment failed';
    if (error.response?.data?.details?.[0]?.issue === 'ORDER_NOT_APPROVED') {
      errorMessage = 'Payment not yet approved by user. Please complete the payment process on PayPal.';
    } else if (error.response?.data?.name === 'UNPROCESSABLE_ENTITY') {
      errorMessage = 'Payment could not be processed. Please try again or contact support.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    const frontendUrl = `${req.protocol}://${req.get('host')}/settings?tab=credits&payment=error&message=${encodeURIComponent(errorMessage)}`;
    res.redirect(frontendUrl);
  }
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