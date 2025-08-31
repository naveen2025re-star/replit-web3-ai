import paypal from "paypal-rest-sdk";
import { Request, Response } from "express";

// Configure PayPal with environment variables (using live mode)
paypal.configure({
  mode: "live", // Always use live/production mode
  client_id: process.env.PAYPAL_CLIENT_ID!,
  client_secret: process.env.PAYPAL_CLIENT_SECRET!,
});

// Create PayPal payment
export const createPayment = (req: Request, res: Response) => {
  const { amount, currency = "USD", packageName = "Smart Contract Audit Credits" } = req.body;

  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
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
        },
        description: `${packageName} - Smart Contract Audit Credits`,
      },
    ],
  };

  paypal.payment.create(create_payment_json, (error: any, payment: any) => {
    if (error) {
      console.error("PayPal payment creation error:", error);
      res.status(500).json({ 
        error: "Failed to create PayPal payment",
        details: error.message 
      });
    } else {
      console.log("PayPal payment created:", payment.id);
      
      // Find approval URL
      const approvalUrl = payment.links?.find((link: any) => link.rel === "approval_url");
      
      if (approvalUrl) {
        res.json({
          id: payment.id,
          approval_url: approvalUrl.href,
          status: "created"
        });
      } else {
        res.status(500).json({ error: "No approval URL found" });
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