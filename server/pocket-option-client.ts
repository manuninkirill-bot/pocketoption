/**
 * PocketOption API Client - SSID Authentication with Test Data Generator
 * Real SSID connection + test data for SAR demonstration
 */

import { Candle } from "./sar-calculator";

interface SsidData {
  session?: string;
  sessionToken?: string;
  uid?: number;
  isDemo?: number;
  platform?: number;
}


export class PocketOptionClient {
  private ssid: string;
  private ssidData: SsidData | null = null;
  private enabled: boolean;
  private connected: boolean = false;
  private balance: number = 0;
  private candleCache: Map<string, Candle[]> = new Map();
  private lastCacheTime: Map<string, number> = new Map();
  private CACHE_DURATION = 3000; // 3 seconds cache

  constructor() {
    this.ssid = process.env.POCKET_OPTION_SSID || "";
    this.enabled = !!this.ssid;

    if (!this.enabled) {
      console.error("[PocketOption] POCKET_OPTION_SSID not set - SYSTEM DISABLED");
    } else {
      console.log("[PocketOption] Client initialized with SSID");
      this.parseSsid();
      this.connected = true;
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.connected;
  }

  getBalance(): number {
    return this.balance;
  }

  setBalance(amount: number): void {
    this.balance = amount;
  }

  async fetchBalanceFromService(): Promise<number | null> {
    try {
      const response = await fetch('http://127.0.0.1:5001/api/balance');
      if (response.ok) {
        const data = await response.json() as { success: boolean; balance: number | null; connected: boolean };
        if (data.success && data.balance !== null && data.balance !== undefined) {
          this.balance = data.balance;
          console.log(`[PocketOption] Balance updated: $${this.balance.toFixed(2)}`);
          return this.balance;
        }
      }
    } catch (e) {
      // service not ready yet
    }
    return null;
  }

  getAccountInfo(): { uid: number; isDemo: boolean; sessionToken: string } {
    return {
      uid: (this.ssidData as any)?.uid || 0,
      isDemo: (this.ssidData as any)?.isDemo === 1,
      sessionToken: (this.ssidData as any)?.session || ""
    };
  }

  private parseSsid(): void {
    try {
      let ssidClean = this.ssid.trim();

      // Handle Socket.IO format: 42["auth",{...}]
      if (ssidClean.startsWith('42[')) {
        const jsonPart = ssidClean.slice(2);
        const data = JSON.parse(jsonPart);
        if (Array.isArray(data) && data.length >= 2 && data[0] === "auth") {
          this.ssidData = data[1];
          console.log(`[PocketOption] ✅ SSID parsed: uid=${data[1].uid}, isDemo=${data[1].isDemo}`);
          if (data[1].isDemo === 0) {
            console.log("[PocketOption] ✅ REAL ACCOUNT CONFIRMED");
          }
          return;
        }
      }

      // Try plain JSON
      try {
        const parsed = JSON.parse(ssidClean);
        if (Array.isArray(parsed) && parsed.length >= 2 && parsed[0] === "auth") {
          this.ssidData = parsed[1];
          console.log(`[PocketOption] ✅ SSID parsed from JSON array`);
          return;
        }
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          this.ssidData = parsed;
          console.log(`[PocketOption] ✅ SSID parsed as object`);
          return;
        }
      } catch (e) {}

      // Accept as token
      if (ssidClean.length > 10) {
        this.ssidData = { session: ssidClean };
        console.log(`[PocketOption] ✅ SSID accepted as session token`);
      }
    } catch (error) {
      console.error("[PocketOption] ❌ SSID parse error:", error);
    }
  }

  async getCandles(
    asset: string,
    timeframe: "1m" | "5m" | "15m",
    limit: number = 50
  ): Promise<Candle[] | null> {
    if (!this.enabled || !this.connected) {
      return null;
    }

    try {
      const cacheKey = `${asset}/${timeframe}`;
      const now = Date.now();
      const lastTime = this.lastCacheTime.get(cacheKey) || 0;

      // Return cached data if fresh
      if (now - lastTime < this.CACHE_DURATION && this.candleCache.has(cacheKey)) {
        return this.candleCache.get(cacheKey) || null;
      }

      // Try to fetch from Python microservice first
      try {
        const response = await fetch('http://127.0.0.1:5001/api/candles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset, timeframe, count: limit })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.candles && data.candles.length > 0) {
            this.candleCache.set(cacheKey, data.candles);
            this.lastCacheTime.set(cacheKey, now);
            return data.candles;
          }
        }
      } catch (e) {
        console.warn(`[PocketOption] Python service unavailable for ${asset}/${timeframe} — no fallback data`);
      }

      // No fake data fallback — if Python service is unavailable, return null
      return null;
    } catch (error) {
      console.error(`[PocketOption] Error fetching ${asset}/${timeframe}:`, error);
      return null;
    }
  }

  async getCurrentPrice(asset: string): Promise<number | null> {
    try {
      const candles = await this.getCandles(asset, "1m", 1);
      if (candles && candles.length > 0) {
        return candles[candles.length - 1].close;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export const poClient = new PocketOptionClient();
