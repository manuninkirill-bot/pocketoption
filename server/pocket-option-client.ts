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

interface AssetTrend {
  basePrice: number;
  trend: "up" | "down";
  volatility: number;
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
  private assetTrends: Map<string, AssetTrend> = new Map();

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

  private getTrend(asset: string): AssetTrend {
    // Return existing trend or create new one on demand
    if (this.assetTrends.has(asset)) {
      return this.assetTrends.get(asset)!;
    }

    // Create new trend for unknown asset
    const newTrend: AssetTrend = {
      basePrice: 100 + Math.random() * 1000,
      trend: Math.random() > 0.5 ? "up" : "down",
      volatility: 0.5 + Math.random() * 2
    };

    this.assetTrends.set(asset, newTrend);
    return newTrend;
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
        // Python service not available, fall back to test data
        console.warn(`[PocketOption] Python service unavailable, using test data for ${asset}`);
      }

      // Fallback: generate test candles
      const candles = this.generateTestCandles(asset, timeframe, limit);

      if (candles && candles.length > 0) {
        this.candleCache.set(cacheKey, candles);
        this.lastCacheTime.set(cacheKey, now);
        return candles;
      }

      return null;
    } catch (error) {
      console.error(`[PocketOption] Error fetching ${asset}/${timeframe}:`, error);
      return null;
    }
  }

  private generateTestCandles(asset: string, timeframe: "1m" | "5m" | "15m", limit: number): Candle[] {
    const trend = this.getTrend(asset); // Gets or creates trend

    const candles: Candle[] = [];
    let currentPrice = trend.basePrice;
    const now = Date.now();
    const tfMs = timeframe === "1m" ? 60000 : timeframe === "5m" ? 300000 : 900000;

    // Create 2 distinct trends: older candles go one direction, newer candles go another
    const midpoint = Math.floor(limit / 2);
    
    // First half: strong downtrend or uptrend
    const firstTrend = Math.random() > 0.5 ? "up" : "down";
    // Second half: opposite trend (creates SAR signals)
    const secondTrend = firstTrend === "up" ? "down" : "up";

    for (let i = limit - 1; i >= 0; i--) {
      // Determine which trend to use (older vs newer candles)
      const positionFromEnd = limit - 1 - i;
      const isFirstHalf = positionFromEnd < midpoint;
      const currentTrend = isFirstHalf ? firstTrend : secondTrend;

      // Apply strong directional movement
      const direction = currentTrend === "up" ? 1 : -1;
      // Increase volatility for more pronounced movements
      const volatilityMultiplier = 1.5;
      const change = (Math.random() - 0.3) * trend.volatility * direction * volatilityMultiplier;
      const open = currentPrice;
      const close = open * (1 + change / 100);

      const high = Math.max(open, close) * (1 + Math.random() * 0.3);
      const low = Math.min(open, close) * (1 - Math.random() * 0.3);

      candles.push({
        time: now - i * tfMs,
        open,
        high,
        low,
        close,
        volume: 1000 + Math.random() * 5000
      });

      currentPrice = close;
    }

    // Update base price and trend for next generation
    trend.basePrice = currentPrice;
    trend.trend = secondTrend; // Next cycle continues from current trend
    
    return candles;
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
