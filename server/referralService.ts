import { db } from "./db";
import { users, referrals, creditTransactions } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class ReferralService {
  // Generate a unique referral code for a user
  static async generateReferralCode(userId: string): Promise<string> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) throw new Error("User not found");

    // Create a unique 8-character code based on user info
    const baseCode = user[0].displayName || user[0].username || user[0].walletAddress?.slice(2, 8) || "AUDIT";
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    let referralCode = `${baseCode.slice(0, 4).toUpperCase()}${timestamp}`;
    
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
      if (!existing.length) break;
      
      attempts++;
      const randomSuffix = Math.random().toString(36).slice(-2).toUpperCase();
      referralCode = `${baseCode.slice(0, 3).toUpperCase()}${timestamp.slice(0, 2)}${randomSuffix}`;
    }

    // Update user with referral code
    await db.update(users)
      .set({ referralCode, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return referralCode;
  }

  // Validate and apply referral code during signup
  static async applyReferralCode(referralCode: string, newUserId: string): Promise<boolean> {
    try {
      // Find the referrer
      const referrer = await db.select()
        .from(users)
        .where(eq(users.referralCode, referralCode))
        .limit(1);

      if (!referrer.length) return false;

      const referrerId = referrer[0].id;
      if (referrerId === newUserId) return false; // Can't refer yourself

      // Check if user is already referred
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.id, newUserId))
        .limit(1);

      if (!existingUser.length) return false;
      if (existingUser[0].referredBy) return false; // Already referred

      // Create referral record
      const referralRecord = await db.insert(referrals)
        .values({
          referrerId,
          referredUserId: newUserId,
          referralCode,
          status: "pending",
          referrerReward: 500, // 500 credits for referrer
          referredReward: 200, // 200 credits for new user
          metadata: { signupSource: "referral" }
        })
        .returning();

      // Update the new user to mark them as referred
      await db.update(users)
        .set({ 
          referredBy: referrerId,
          updatedAt: new Date()
        })
        .where(eq(users.id, newUserId));

      // Give immediate welcome bonus to the referred user
      await this.awardReferralCredits(referralRecord[0].id, "signup");

      return true;
    } catch (error) {
      console.error("Error applying referral code:", error);
      return false;
    }
  }

  // Award credits when referral milestones are met
  static async awardReferralCredits(referralId: string, trigger: "signup" | "first_audit" | "first_purchase"): Promise<void> {
    const referral = await db.select()
      .from(referrals)
      .where(eq(referrals.id, referralId))
      .limit(1);

    if (!referral.length) return;

    const ref = referral[0];
    let shouldAwardReferrer = false;
    let shouldAwardReferred = false;

    switch (trigger) {
      case "signup":
        // Give immediate welcome bonus to referred user
        shouldAwardReferred = true;
        break;
      
      case "first_audit":
        // Award both users when referred user completes first audit
        if (ref.status === "pending") {
          shouldAwardReferrer = true;
          shouldAwardReferred = true;
          
          // Mark as completed
          await db.update(referrals)
            .set({ 
              status: "completed",
              completedAt: new Date(),
              metadata: { 
                ...ref.metadata, 
                firstAuditCompleted: true 
              }
            })
            .where(eq(referrals.id, referralId));
        }
        break;
        
      case "first_purchase":
        // Bonus credits for first purchase
        shouldAwardReferrer = true;
        break;
    }

    // Award credits to referred user
    if (shouldAwardReferred) {
      await this.addCreditsToUser(ref.referredUserId, ref.referredReward, 
        `Referral welcome bonus`, referralId);
    }

    // Award credits to referrer
    if (shouldAwardReferrer) {
      await this.addCreditsToUser(ref.referrerId, ref.referrerReward, 
        `Referral reward for inviting user`, referralId);
    }

    // Mark as credited if both have been awarded
    if (ref.status === "completed" && shouldAwardReferrer) {
      await db.update(referrals)
        .set({ 
          status: "credited",
          creditedAt: new Date()
        })
        .where(eq(referrals.id, referralId));
    }
  }

  // Add credits to a user and create transaction record
  private static async addCreditsToUser(userId: string, amount: number, reason: string, referralId?: string): Promise<void> {
    // Get current user balance
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) return;

    const newBalance = user[0].credits + amount;
    const newTotalEarned = user[0].totalCreditsEarned + amount;
    const newReferralCredits = user[0].referralCreditsEarned + amount;

    // Update user balance and referral counts
    const updates: any = {
      credits: newBalance,
      totalCreditsEarned: newTotalEarned,
      referralCreditsEarned: newReferralCredits,
      updatedAt: new Date()
    };

    // If this is for the referrer, increment their referral count
    if (reason.includes("inviting")) {
      updates.referralCount = user[0].referralCount + 1;
    }

    await db.update(users)
      .set(updates)
      .where(eq(users.id, userId));

    // Create transaction record
    await db.insert(creditTransactions)
      .values({
        userId,
        type: "referral",
        amount,
        reason,
        referralId,
        balanceAfter: newBalance,
        metadata: { referralCode: referralId }
      });
  }

  // Get referral stats for a user
  static async getReferralStats(userId: string) {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) throw new Error("User not found");

    // Get referral code or generate one
    let referralCode = user[0].referralCode;
    if (!referralCode) {
      referralCode = await this.generateReferralCode(userId);
    }

    // Get referral statistics
    const referralStats = await db
      .select({
        totalReferrals: sql<number>`count(*)`,
        completedReferrals: sql<number>`count(case when status = 'completed' or status = 'credited' then 1 end)`,
        pendingReferrals: sql<number>`count(case when status = 'pending' then 1 end)`,
        totalCreditsEarned: sql<number>`coalesce(sum(referrer_reward), 0)`
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    // Get recent referrals
    const recentReferrals = await db
      .select({
        id: referrals.id,
        status: referrals.status,
        referrerReward: referrals.referrerReward,
        referredReward: referrals.referredReward,
        createdAt: referrals.createdAt,
        completedAt: referrals.completedAt,
        referredUser: {
          displayName: users.displayName,
          username: users.username,
          walletAddress: users.walletAddress
        }
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referredUserId, users.id))
      .where(eq(referrals.referrerId, userId))
      .orderBy(sql`${referrals.createdAt} DESC`)
      .limit(10);

    return {
      referralCode,
      stats: referralStats[0] || {
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalCreditsEarned: 0
      },
      recentReferrals,
      userStats: {
        referralCount: user[0].referralCount,
        referralCreditsEarned: user[0].referralCreditsEarned
      }
    };
  }

  // Check and trigger referral milestones
  static async checkReferralMilestones(userId: string, event: "first_audit" | "first_purchase"): Promise<void> {
    // Find if this user was referred
    const referral = await db.select()
      .from(referrals)
      .where(eq(referrals.referredUserId, userId))
      .limit(1);

    if (referral.length) {
      await this.awardReferralCredits(referral[0].id, event);
    }
  }
}