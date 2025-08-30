import { Request, Response } from "express";

// Custom PayPal integration that handles return URLs properly
export async function createCustomPaypalOrder(req: Request, res: Response) {
  try {
    const { amount, currency, intent } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: "Invalid amount. Amount must be a positive number.",
      });
    }

    if (!currency) {
      return res.status(400).json({ error: "Invalid currency. Currency is required." });
    }

    if (!intent) {
      return res.status(400).json({ error: "Invalid intent. Intent is required." });
    }

    // Get proper host for return URLs
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Create order directly with PayPal REST API
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    // Get access token
    const tokenResponse = await fetch(
      process.env.NODE_ENV === 'production' 
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Create the order
    const orderResponse = await fetch(
      process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com/v2/checkout/orders'
        : 'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `${Date.now()}-${Math.random()}`,
        },
        body: JSON.stringify({
          intent: intent.toUpperCase(),
          purchase_units: [
            {
              reference_id: 'default',
              amount: {
                currency_code: currency,
                value: amount,
              },
              description: `Smart Contract Audit Credits - ${amount} ${currency}`,
            },
          ],
          application_context: {
            brand_name: 'SecureAudit Pro',
            locale: 'en-US',
            landing_page: 'BILLING',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: `${baseUrl}/payment/success?source=paypal`,
            cancel_url: `${baseUrl}/payment/cancel?source=paypal`,
          },
        }),
      }
    );

    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      console.error('PayPal order creation failed:', orderData);
      return res.status(orderResponse.status).json({ 
        error: 'Failed to create PayPal order',
        details: orderData 
      });
    }

    res.status(201).json(orderData);
  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({ error: 'Failed to create order.' });
  }
}

export async function captureCustomPaypalOrder(req: Request, res: Response) {
  try {
    const { orderID } = req.params;

    // Get access token
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch(
      process.env.NODE_ENV === 'production' 
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Capture the order
    const captureResponse = await fetch(
      process.env.NODE_ENV === 'production'
        ? `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`
        : `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `${Date.now()}-${Math.random()}`,
        },
      }
    );

    const captureData = await captureResponse.json();
    
    if (!captureResponse.ok) {
      console.error('PayPal capture failed:', captureData);
      return res.status(captureResponse.status).json({ 
        error: 'Failed to capture PayPal payment',
        details: captureData 
      });
    }

    res.status(200).json(captureData);
  } catch (error) {
    console.error('PayPal capture error:', error);
    res.status(500).json({ error: 'Failed to capture order.' });
  }
}

export async function getCustomPaypalClientToken(req: Request, res: Response) {
  try {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(
      process.env.NODE_ENV === 'production' 
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&response_type=client_token&intent=sdk_init',
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('PayPal token generation failed:', data);
      return res.status(response.status).json({ 
        error: 'Failed to get PayPal client token',
        details: data 
      });
    }

    res.json({
      clientToken: data.access_token,
    });
  } catch (error) {
    console.error('PayPal token error:', error);
    res.status(500).json({ error: 'Failed to initialize PayPal' });
  }
}