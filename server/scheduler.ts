import { BlockchainScanner } from "./blockchainScanner";
import { db } from "./db";
import { auditSessions, liveScannedContracts } from "@shared/schema";
import { and, eq, lte } from "drizzle-orm";

export class Scheduler {
  private static intervals: Map<string, NodeJS.Timeout> = new Map();

  public static startDailyLiveScanning(): void {
    // Clear existing interval if any
    const existingInterval = this.intervals.get("live-scanning");
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Run cleanup first, then scanning
    setTimeout(async () => {
      await this.cleanupOldSessions();
      await this.runLiveScan();
    }, 5000); // Wait 5 seconds after server start

    // Schedule scanning every 8 hours + daily cleanup at midnight
    const scanInterval = setInterval(() => {
      this.runLiveScan();
    }, 8 * 60 * 60 * 1000); // 8 hours for more frequent scanning
    
    // Daily cleanup at midnight
    const cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.intervals.set("live-scanning", scanInterval);
    this.intervals.set("cleanup", cleanupInterval);
    console.log("[SCHEDULER] Smart scanning: every 8h + daily cleanup");
  }

  private static async runLiveScan(): Promise<void> {
    try {
      console.log("[SCHEDULER] Running daily live scan...");
      const success = await BlockchainScanner.scanRandomContract();
      
      if (success) {
        console.log("[SCHEDULER] Live scan completed successfully");
      } else {
        console.log("[SCHEDULER] Live scan skipped (already scanned today or failed)");
      }
    } catch (error) {
      console.error("[SCHEDULER] Live scan failed:", error);
    }
  }

  // Smart cleanup for old failed sessions
  private static async cleanupOldSessions(): Promise<void> {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Update old failed sessions to cleaned status instead of deleting
      const cleanedSessions = await db
        .update(auditSessions)
        .set({ status: "failed" })
        .where(
          and(
            eq(auditSessions.contractSource, "live-scan"),
            eq(auditSessions.status, "analyzing"),
            lte(auditSessions.createdAt, oneWeekAgo)
          )
        )
        .returning({ id: auditSessions.id });
      
      if (cleanedSessions.length > 0) {
        console.log(`[CLEANUP] Cleaned up ${cleanedSessions.length} old stuck sessions`);
      }
    } catch (error) {
      console.error("[CLEANUP] Error during cleanup:", error);
    }
  }

  public static stopAllSchedules(): void {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`[SCHEDULER] Stopped ${name} schedule`);
    });
    this.intervals.clear();
  }
}