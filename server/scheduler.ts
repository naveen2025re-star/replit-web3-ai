import { BlockchainScanner } from "./blockchainScanner";

export class Scheduler {
  private static intervals: Map<string, NodeJS.Timeout> = new Map();

  public static startDailyLiveScanning(): void {
    // Clear existing interval if any
    const existingInterval = this.intervals.get("live-scanning");
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Run immediately on startup (for testing)
    setTimeout(() => {
      this.runLiveScan();
    }, 5000); // Wait 5 seconds after server start

    // Schedule to run twice daily (every 12 hours)
    const interval = setInterval(() => {
      this.runLiveScan();
    }, 12 * 60 * 60 * 1000); // 12 hours in milliseconds

    this.intervals.set("live-scanning", interval);
    console.log("[SCHEDULER] Live scanning scheduled to run every 12 hours");
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

  public static stopAllSchedules(): void {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`[SCHEDULER] Stopped ${name} schedule`);
    });
    this.intervals.clear();
  }
}