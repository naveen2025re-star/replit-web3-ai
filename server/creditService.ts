import { db } from "./db";
import { users, creditTransactions, auditSessions, creditPackages } from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export interface CreditDeductionResult {
  success: boolean;
  creditsDeducted: number;
  remainingCredits: number;
  error?: string;
}

export interface CreditCalculationFactors {
  codeLength: number;
  complexity: number;
  hasMultipleFiles: boolean;
  analysisType: 'security' | 'optimization' | 'full';
  language: string;
}

export class CreditService {
  
  /**
   * Calculate credits needed for an audit based on multiple factors
   */
  static calculateCreditsNeeded(factors: CreditCalculationFactors): number {
    let baseCredits = 10; // Minimum cost
    
    // Code length factor (logarithmic scaling)
    const lengthMultiplier = Math.max(1, Math.log10(factors.codeLength / 100) * 0.5);
    baseCredits *= lengthMultiplier;
    
    // Complexity factor (1-10 scale)
    const complexityMultiplier = 1 + (factors.complexity - 1) * 0.2; // 1.0 to 2.8x
    baseCredits *= complexityMultiplier;
    
    // Multiple files add overhead
    if (factors.hasMultipleFiles) {
      baseCredits *= 1.5;
    }
    
    // Analysis type affects cost
    const analysisMultipliers = {
      'security': 1.0,
      'optimization': 0.8,
      'full': 1.4
    };
    baseCredits *= analysisMultipliers[factors.analysisType] || 1.0;
    
    // Language complexity affects cost
    const languageMultipliers: Record<string, number> = {
      'solidity': 1.0,
      'rust': 1.3,
      'go': 1.1,
      'vyper': 1.2,
      'cairo': 1.4,
      'move': 1.3
    };
    baseCredits *= languageMultipliers[factors.language?.toLowerCase?.()] || 1.0;
    
    // Round up and apply caps
    const finalCredits = Math.ceil(baseCredits);
    return Math.max(5, Math.min(finalCredits, 500)); // Min 5, max 500 credits
  }
  
  /**
   * Check if user has sufficient credits and calculate exact cost
   */
  static async checkCreditsAndCalculateCost(
    userId: string, 
    factors: CreditCalculationFactors
  ): Promise<{ hasEnough: boolean; needed: number; current: number; cost: number }> {
    const user = await db.select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user.length) {
      throw new Error('User not found');
    }
    
    const currentCredits = user[0].credits;
    const neededCredits = this.calculateCreditsNeeded(factors);
    
    return {
      hasEnough: currentCredits >= neededCredits,
      needed: neededCredits,
      current: currentCredits,
      cost: neededCredits
    };
  }
  
  /**
   * Deduct credits for an audit with atomic transaction
   */
  static async deductCreditsForAudit(
    userId: string,
    sessionId: string,
    factors: CreditCalculationFactors
  ): Promise<CreditDeductionResult> {
    return await db.transaction(async (tx) => {
      try {
        // Get current user credits with lock
        const user = await tx.select({ 
          credits: users.credits,
          totalCreditsUsed: users.totalCreditsUsed 
        })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (!user.length) {
          return { success: false, creditsDeducted: 0, remainingCredits: 0, error: 'User not found' };
        }
        
        const currentCredits = user[0].credits;
        const currentTotalUsed = user[0].totalCreditsUsed;
        const creditsNeeded = this.calculateCreditsNeeded(factors);
        
        // Check insufficient credits
        if (currentCredits < creditsNeeded) {
          return { 
            success: false, 
            creditsDeducted: 0, 
            remainingCredits: currentCredits,
            error: `Insufficient credits. Need ${creditsNeeded}, have ${currentCredits}` 
          };
        }
        
        const newBalance = currentCredits - creditsNeeded;
        
        // Update user credits and usage tracking
        await tx.update(users)
          .set({ 
            credits: newBalance,
            totalCreditsUsed: currentTotalUsed + creditsNeeded,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        // Record transaction
        await tx.insert(creditTransactions).values({
          userId,
          sessionId,
          type: 'deduction',
          amount: -creditsNeeded,
          reason: `Smart contract analysis - ${factors.analysisType}`,
          metadata: {
            codeLength: factors.codeLength,
            complexity: factors.complexity
          },
          balanceAfter: newBalance
        });
        
        // Update audit session with credits used
        await tx.update(auditSessions)
          .set({ 
            creditsUsed: creditsNeeded,
            codeComplexity: factors.complexity
          })
          .where(eq(auditSessions.id, sessionId));
        
        return {
          success: true,
          creditsDeducted: creditsNeeded,
          remainingCredits: newBalance
        };
        
      } catch (error) {
        console.error('Credit deduction error:', error);
        return { 
          success: false, 
          creditsDeducted: 0, 
          remainingCredits: 0,
          error: 'Transaction failed'
        };
      }
    });
  }
  
  /**
   * Add credits to user account (purchase, bonus, refund)
   */
  static async addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund' | 'initial',
    reason: string,
    metadata?: any
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    return await db.transaction(async (tx) => {
      try {
        // Get current balance
        const user = await tx.select({ 
          credits: users.credits,
          totalCreditsEarned: users.totalCreditsEarned 
        })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (!user.length) {
          return { success: false, newBalance: 0, error: 'User not found' };
        }
        
        const newBalance = user[0].credits + amount;
        const newTotalEarned = user[0].totalCreditsEarned + amount;
        
        // Update user balance
        await tx.update(users)
          .set({ 
            credits: newBalance,
            totalCreditsEarned: newTotalEarned,
            lastCreditGrant: new Date(),
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        // Record transaction
        await tx.insert(creditTransactions).values({
          userId,
          type,
          amount,
          reason,
          metadata,
          balanceAfter: newBalance
        });
        
        return { success: true, newBalance };
        
      } catch (error) {
        console.error('Credit addition error:', error);
        return { success: false, newBalance: 0, error: 'Transaction failed' };
      }
    });
  }
  
  /**
   * Get user's credit balance and recent transactions
   */
  static async getUserCredits(userId: string) {
    const userResult = await db.select({
      credits: users.credits,
      totalCreditsUsed: users.totalCreditsUsed,
      totalCreditsEarned: users.totalCreditsEarned,
      lastCreditGrant: users.lastCreditGrant
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    if (!userResult.length) {
      throw new Error('User not found');
    }
    
    const recentTransactions = await db.select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(20);
    
    return {
      balance: userResult[0].credits,
      totalUsed: userResult[0].totalCreditsUsed,
      totalEarned: userResult[0].totalCreditsEarned,
      lastGrant: userResult[0].lastCreditGrant,
      recentTransactions
    };
  }
  
  /**
   * Get available credit packages
   */
  static async getCreditPackages() {
    return await db.select()
      .from(creditPackages)
      .where(eq(creditPackages.active, true))
      .orderBy(creditPackages.sortOrder, creditPackages.price);
  }
  
  /**
   * Refund credits for failed/cancelled analysis
   */
  static async refundCredits(
    userId: string,
    sessionId: string,
    reason: string
  ): Promise<{ success: boolean; refundedAmount: number; error?: string }> {
    return await db.transaction(async (tx) => {
      try {
        // Get the session to find out how many credits were used
        const session = await tx.select({ creditsUsed: auditSessions.creditsUsed })
          .from(auditSessions)
          .where(eq(auditSessions.id, sessionId))
          .limit(1);
        
        if (!session.length || !session[0].creditsUsed) {
          return { success: false, refundedAmount: 0, error: 'No credits to refund' };
        }
        
        const refundAmount = session[0].creditsUsed;
        
        // Add credits back
        const result = await this.addCredits(userId, refundAmount, 'refund', reason, { sessionId });
        
        if (result.success) {
          // Mark session as refunded
          await tx.update(auditSessions)
            .set({ creditsUsed: 0 })
            .where(eq(auditSessions.id, sessionId));
        }
        
        return { 
          success: result.success, 
          refundedAmount: refundAmount,
          error: result.error 
        };
        
      } catch (error) {
        console.error('Credit refund error:', error);
        return { success: false, refundedAmount: 0, error: 'Refund failed' };
      }
    });
  }
  
  /**
   * Determine user's plan tier based on their credit history
   */
  static async getUserPlanTier(userId: string): Promise<'Free' | 'Pro' | 'Pro+' | 'Enterprise'> {
    try {
      const user = await db.select({
        totalCreditsEarned: users.totalCreditsEarned
      })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) return 'Free';

      const totalEarned = user[0].totalCreditsEarned;
      
      // Determine tier based on total credits earned
      if (totalEarned >= 15000) return 'Pro+';  // Has purchased Pro+ (15000 credits)
      if (totalEarned >= 5000) return 'Pro';    // Has purchased Pro (5000 credits)
      return 'Free';                            // Only has initial 1000 credits
    } catch (error) {
      console.error('Error determining user plan tier:', error);
      return 'Free'; // Default to Free on error
    }
  }

  /**
   * Check if user can create private audits
   */
  static async canCreatePrivateAudits(userId: string): Promise<boolean> {
    const tier = await this.getUserPlanTier(userId);
    return tier === 'Pro' || tier === 'Pro+' || tier === 'Enterprise';
  }

  /**
   * Initialize default credit packages (completely clean slate)
   */
  static async initializeDefaultPackages() {
    // Completely delete all existing packages to avoid duplicates
    await db.delete(creditPackages);

    const defaultPackages = [
      {
        name: 'Free',
        credits: 1000,
        bonusCredits: 0,
        totalCredits: 1000,
        price: 0, // Free
        popular: false,
        savings: 0,
        sortOrder: 1,
        active: true
      },
      {
        name: 'Pro',
        credits: 5000,
        bonusCredits: 0,
        totalCredits: 5000,
        price: 2999, // $29.99
        popular: true,
        savings: 0,
        sortOrder: 2,
        active: true
      },
      {
        name: 'Pro+',
        credits: 15000,
        bonusCredits: 0,
        totalCredits: 15000,
        price: 7999, // $79.99
        popular: false,
        savings: 20,
        sortOrder: 3,
        active: true
      },
      {
        name: 'Enterprise',
        credits: 0,
        bonusCredits: 0,
        totalCredits: 0,
        price: 0, // Contact us
        popular: false,
        savings: 0,
        sortOrder: 4,
        active: true
      }
    ];
    
    // Insert the exact 4 packages
    await db.insert(creditPackages).values(defaultPackages);
  }
}