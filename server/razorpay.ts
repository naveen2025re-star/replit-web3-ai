import Razorpay from 'razorpay';
import { Request, Response } from 'express';
import crypto from 'crypto';
import { CreditService } from './creditService';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_yourKeyId',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'yourKeySecret',
});

// Create Razorpay order
export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'USD', packageId, userId, packageName } = req.body;

    // 🛡️ SECURITY CHECK 1: Validate required fields
    if (!amount || !packageId || !userId) {
      console.error(`🚨 SECURITY: Missing required fields in order creation`);
      return res.status(400).json({ 
        error: 'Missing required fields: amount, packageId, userId' 
      });
    }

    // 🛡️ SECURITY CHECK 2: Validate package exists and amount matches expected price
    const { CreditService } = await import('./creditService');
    const packages = await CreditService.getCreditPackages();
    const validPackage = packages.find(p => p.id === packageId);
    
    if (!validPackage) {
      console.error(`🚨 SECURITY ALERT: Invalid package ID ${packageId} requested by user ${userId}`);
      return res.status(400).json({ error: 'Invalid package selected' });
    }
    
    // 🛡️ SECURITY CHECK 3: Verify amount matches package price exactly
    const expectedAmount = validPackage.price / 100; // Convert cents to dollars for comparison
    if (Math.abs(parseFloat(amount) - expectedAmount) > 0.01) {
      console.error(`🚨 SECURITY ALERT: Amount manipulation detected. Expected: $${expectedAmount}, Received: $${amount}`);
      return res.status(400).json({ error: 'Invalid amount specified' });
    }

    // Convert amount to cents (Razorpay requires amount in smallest currency unit)
    // For USD, multiply by 100 to convert dollars to cents
    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Create a short receipt ID (max 40 chars for Razorpay)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const shortPackageId = packageId.slice(0, 8); // First 8 chars
    const shortUserId = userId.slice(0, 8); // First 8 chars
    const receipt = `ord_${shortPackageId}_${shortUserId}_${timestamp}`;

    const options = {
      amount: amountInCents,
      currency: currency.toUpperCase(),
      receipt: receipt.slice(0, 40), // Ensure max 40 chars
      payment_capture: 1, // Auto capture payment
      notes: {
        packageId,
        userId,
        packageName: validPackage.name,
        expected_amount_usd: validPackage.price / 100,
        created_timestamp: new Date().toISOString(),
        security_hash: crypto.createHash('sha256')
          .update(`${packageId}:${userId}:${validPackage.price}:${Date.now()}`)
          .digest('hex').substring(0, 16)
      }
    };

    console.log(`🔒 SECURITY: Creating verified order for user ${userId}, package ${validPackage.name} ($${validPackage.price / 100})`);
    console.log('Order creation options:', {
      ...options,
      notes: {
        ...options.notes,
        security_hash: '[REDACTED]' // Don't log security hash
      }
    });

    const order = await razorpay.orders.create(options);
    
    console.log('Razorpay order created successfully:', order.id);

    res.json({
      order_id: order.id,
      currency: order.currency,
      amount: order.amount,
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_yourKeyId',
      packageId,
      userId,
      receipt: order.receipt
    });

  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create Razorpay order',
      details: error.message 
    });
  }
};

// Verify Razorpay payment signature
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      packageId,
      userId 
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing payment verification data' 
      });
    }

    // Create signature for verification
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'yourKeySecret')
      .update(sign.toString())
      .digest('hex');

    // Verify signature
    if (razorpay_signature !== expectedSign) {
      console.error('Payment signature verification failed');
      return res.status(400).json({ 
        error: 'Invalid payment signature',
        verified: false 
      });
    }

    console.log('Payment signature verified successfully');

    // Get package details and add credits to user account
    if (packageId && userId) {
      try {
        const packages = await CreditService.getCreditPackages();
        const selectedPackage = packages.find(p => p.id === packageId);
        
        if (selectedPackage) {
          const result = await CreditService.addCredits(
            userId,
            selectedPackage.totalCredits,
            "purchase",
            `Razorpay payment for ${selectedPackage.name} package`,
            { 
              packageId, 
              razorpay_payment_id, 
              razorpay_order_id,
              amount: selectedPackage.price 
            }
          );

          if (result.success) {
            console.log(`Added ${selectedPackage.totalCredits} credits to user ${userId}`);
          } else {
            console.error('Failed to add credits:', result.error);
          }
        }
      } catch (error) {
        console.error('Error adding credits after payment:', error);
      }
    }

    res.status(200).json({ 
      message: 'Payment verified successfully',
      verified: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: error.message 
    });
  }
};

// Get payment details (optional - for additional verification)
export const getRazorpayPaymentDetails = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const payment = await razorpay.payments.fetch(paymentId);
    
    res.json({
      payment_id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      created_at: payment.created_at
    });

  } catch (error: any) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment details',
      details: error.message 
    });
  }
};

// Razorpay webhook handler (for additional security)
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && webhookSignature) {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (webhookSignature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const paymentData = req.body.payload.payment.entity;

    console.log('Razorpay webhook received:', event);

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        console.log('Payment captured:', paymentData.id);
        // Handle successful payment
        break;
      
      case 'payment.failed':
        console.log('Payment failed:', paymentData.id);
        // Handle failed payment
        break;
      
      default:
        console.log('Unhandled webhook event:', event);
    }

    res.status(200).json({ status: 'ok' });

  } catch (error: any) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ 
      error: 'Webhook handling failed',
      details: error.message 
    });
  }
};