import { EventEmitter } from "events";
import { storage } from "./storage";
import { SARCalculator, Candle } from "./sar-calculator";
import { poClient } from "./pocket-option-client";

export interface MonitoredAsset {
  name: string;
  percentage: number;
  status: "ready" | "trading" | "cooldown";
  sar1m: "long" | "short" | null;
  sar5m: "long" | "short" | null;
  sar15m: "long" | "short" | null;
  category: "crypto" | "forex";
  currentPrice?: number;
  priceDropPercentage?: number;
  rank?: number;
}

export interface BotState {
  running: boolean;
  connected: boolean;
  balance: number;
  currentPrice: number;
  monitoredAssets: MonitoredAsset[];
  currentTrade: {
    id: string;
    direction: "call" | "put";
    amount: number;
    entryPrice: number;
    startTime: string;
    duration: number;
    asset: string;
  } | null;
  accountInfo?: {
    uid: number;
    isDemo: boolean;
  };
  accountMode: "demo" | "real";
}

class BotController extends EventEmitter {
  private demoBalance: number = 100; // Demo account starts with $100
  private realBalance: number = 0;

  private state: BotState = {
    running: false,
    connected: false,
    balance: 100, // Demo starts at $100
    currentPrice: 0,
    monitoredAssets: [],
    currentTrade: null,
    accountMode: "demo",
  };

  private assetReadyTimestamps: Map<string, number> = new Map(); // Track when assets reached 92%
  private readonly READY_HOLD_DURATION = 300000; // 5 minutes in milliseconds
  private assetPriceHistory: Map<string, Array<{timestamp: number, price: number}>> = new Map(); // Track price history for 92% assets
  private readonly PRICE_HISTORY_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds
  private asset92PercentAssets = ["BNB OTC", "EUR/USD OTC", "Chainlink OTC", "Polygon OTC", "Dogecoin OTC", "Toncoin OTC", "AUD/CAD OTC", "EUR/CHF OTC", "EUR/RUB OTC", "USD/PKR OTC", "USD/RUB OTC", "EUR/NZD OTC"]; // Assets that have 92% confidence
  private sarTestRun = false; // Track if we've run the SAR test

  private assets: MonitoredAsset[] = [
    // CRYPTOCURRENCIES
    { name: "ETHUSD_otc", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "BNB OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Solana OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Chainlink OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Toncoin OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Polygon OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Dogecoin OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Bitcoin OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Cardano OTC", percentage: 64, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Polkadot OTC", percentage: 48, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "TRON OTC", percentage: 48, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Ethereum OTC", percentage: 39, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Avalanche OTC", percentage: 31, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Bitcoin ETF OTC", percentage: 20, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    { name: "Bitcoin", percentage: 18, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "crypto" },
    
    // FOREX/CURRENCIES
    { name: "EUR/USD OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AUD/CAD OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AUD/NZD OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AUD/USD OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "BHD/CNY OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "CHF/JPY OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/CHF OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/RUB OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "GBP/AUD OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "NGN/USD OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/COP OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/INR OTC", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/PKR OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/RUB OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "CAD/CHF", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "CAD/JPY", percentage: 88, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/NZD OTC", percentage: 92, status: "ready", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/DZD OTC", percentage: 48, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AUD/CHF OTC", percentage: 47, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/HUF OTC", percentage: 46, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/PHP OTC", percentage: 45, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/BRL OTC", percentage: 44, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/EGP OTC", percentage: 43, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AUD/USD", percentage: 42, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/CLP OTC", percentage: 41, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/CHF OTC", percentage: 40, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/ARS OTC", percentage: 39, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "GBP/JPY OTC", percentage: 38, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/CHF", percentage: 37, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "GBP/USD OTC", percentage: 36, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/CNH OTC", percentage: 35, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "YER/USD OTC", percentage: 34, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/AUD", percentage: 33, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "KES/USD OTC", percentage: 32, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/IDR OTC", percentage: 31, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "SAR/CNY OTC", percentage: 30, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "GBP/CHF", percentage: 29, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "MAD/USD OTC", percentage: 28, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "ZAR/USD OTC", percentage: 27, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "NZD/USD OTC", percentage: 26, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/VND OTC", percentage: 25, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "LBP/USD OTC", percentage: 24, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/CAD OTC", percentage: 23, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "CAD/JPY OTC", percentage: 22, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/SGD OTC", percentage: 21, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AUD/CHF", percentage: 20, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "CHF/JPY", percentage: 19, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/CHF", percentage: 18, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/GBP", percentage: 17, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "GBP/CAD", percentage: 16, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/TRY OTC", percentage: 15, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "TND/USD OTC", percentage: 14, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "UAH/USD OTC", percentage: 13, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/MXN OTC", percentage: 12, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AUD/JPY", percentage: 11, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/JPY", percentage: 10, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/JPY", percentage: 9, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/THB OTC", percentage: 8, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "USD/MYR OTC", percentage: 7, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AED/CNY OTC", percentage: 6, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "CHF/NOK OTC", percentage: 5, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "AUD/CAD", percentage: 4, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "EUR/CAD", percentage: 3, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "GBP/USD", percentage: 2, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
    { name: "IQD/CNY OTC", percentage: 1, status: "cooldown", sar1m: null, sar5m: null, sar15m: null, category: "forex" },
  ];

  private cachedCandles: Map<string, Candle[]> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
    this.state.monitoredAssets = this.assets.map(a => ({
      ...a,
      priceDropPercentage: (Math.random() - 0.6) * 5 // Initialize with realistic values
    }));
    
    // Set account info from SSID
    const accountInfo = poClient.getAccountInfo();
    this.state.accountInfo = {
      uid: accountInfo.uid,
      isDemo: accountInfo.isDemo
    };
    
    // Demo starts with $100; real balance fetched later from service
    this.state.balance = this.demoBalance; // $100 for demo
    console.log(`[BotController] Initialized — Demo balance: $${this.demoBalance.toFixed(2)}, Account: uid=${this.state.accountInfo?.uid}, isDemo=${this.state.accountInfo?.isDemo}`);
    
    // Initialize assets reaching 92% now with 2-minute hold period
    this.assetReadyTimestamps.set("BNB OTC", Date.now());
    this.assetReadyTimestamps.set("EUR/USD OTC", Date.now());
    this.assetReadyTimestamps.set("Chainlink OTC", Date.now());
    this.assetReadyTimestamps.set("Polygon OTC", Date.now());
    this.assetReadyTimestamps.set("Dogecoin OTC", Date.now());
    this.assetReadyTimestamps.set("Toncoin OTC", Date.now());
    this.assetReadyTimestamps.set("AUD/CAD OTC", Date.now());
    this.assetReadyTimestamps.set("EUR/CHF OTC", Date.now());
    this.assetReadyTimestamps.set("EUR/RUB OTC", Date.now());
    this.assetReadyTimestamps.set("USD/PKR OTC", Date.now());
    this.assetReadyTimestamps.set("USD/RUB OTC", Date.now());
    this.assetReadyTimestamps.set("EUR/NZD OTC", Date.now());
    this.setupMockUpdates();
  }

  private async refreshBalance(): Promise<void> {
    if (this.state.accountMode !== "real") return;
    try {
      const newBalance = await poClient.fetchBalanceFromService();
      if (newBalance !== null && newBalance !== this.state.balance) {
        this.state.balance = newBalance;
        this.realBalance = newBalance;
        this.emit("stateUpdate", this.getState());
      }
    } catch (e) {
      // balance fetch failed silently
    }
  }

  private setupMockUpdates() {
    // Fetch real balance from Python service shortly after startup
    setTimeout(() => this.refreshBalance(), 5000);

    // Poll real balance from Python service every 30 seconds
    setInterval(() => this.refreshBalance(), 30000);

    // Sync real balance from poClient only when in real mode
    setInterval(() => {
      if (this.state.accountMode === "real") {
        const freshBalance = poClient.getBalance();
        if (freshBalance > 0 && freshBalance !== this.state.balance) {
          this.state.balance = freshBalance;
          this.realBalance = freshBalance;
          console.log(`[BotController] Real balance synced: $${this.state.balance.toFixed(2)}`);
        }
      }
    }, 10000);

    // Update asset percentages slightly every 5 seconds - modify in-place to avoid losing SAR values
    setInterval(() => {
      const now = Date.now();

      // Update asset percentages directly on existing objects
      for (const asset of this.state.monitoredAssets) {
        // Check if asset is in the 2-minute ready hold period
        const readyTimestamp = this.assetReadyTimestamps.get(asset.name);
        const isInReadyHold = readyTimestamp && (now - readyTimestamp) < this.READY_HOLD_DURATION;

        let newPercentage: number;
        let newStatus: "ready" | "cooldown";

        if (isInReadyHold) {
          // Keep at 92% for 2 minutes
          newPercentage = 92;
          newStatus = "ready";
        } else {
          // Normal fluctuation
          newPercentage = Math.max(15, Math.min(92, asset.percentage + (Math.random() - 0.5) * 3));
          newStatus = newPercentage >= 88 ? "ready" : "cooldown";

          // If it just reached 92%, record the timestamp
          if (newStatus === "ready" && asset.status !== "ready") {
            this.assetReadyTimestamps.set(asset.name, now);
          }
        }

        // Update directly on existing object - SAR values are NOT touched
        asset.percentage = newPercentage;
        asset.status = newStatus;
      }
      // Don't emit here - SAR loop will emit after updating SAR values
    }, 5000);

    // Run SAR test on startup (once)
    if (!this.sarTestRun) {
      this.sarTestRun = true;
      setTimeout(() => this.testSARWithRealData(), 2000);
    }

    // Continuous SAR monitoring every 5 seconds (always running, regardless of bot state)
    // Start after 1 second to ensure initial SAR calculation completes
    let sarLoopStarted = false;
    setTimeout(() => {
      sarLoopStarted = true;
    }, 1000);

    setInterval(async () => {
      if (!sarLoopStarted) return;
      
      try {
        // Monitor SAR for all assets with >= 88% confidence
        await this.updateRealSARForAllAssets();

        // Check for confluence and execute trades only if bot is running
        if (this.state.running && !this.state.currentTrade) {
          const eligibleAssets = this.state.monitoredAssets.filter(a => a.percentage >= 88);
          
          for (const asset of eligibleAssets) {
            const confluenceSignal = asset.sar1m && 
                                     asset.sar5m && 
                                     asset.sar15m &&
                                     asset.sar1m === asset.sar5m &&
                                     asset.sar5m === asset.sar15m;

            if (confluenceSignal) {
              console.log(`[BotController] SAR confluence detected for ${asset.name}: ${asset.sar1m}/${asset.sar5m}/${asset.sar15m}`);
              break; // Only enter one trade at a time when confluence is found
            }
          }
        }

        // Emit AFTER SAR is fully updated
        this.emit("state-update", this.state);
      } catch (error) {
        console.error(`[BotController] SAR Loop Error:`, error);
      }
    }, 5000);
  }

  private async updateRealSARForAllAssets(): Promise<void> {
    try {
      // Process ALL assets in parallel batches for speed
      const eligibleAssets = this.state.monitoredAssets;
      const BATCH_SIZE = 10; // Process 10 assets in parallel per batch

      // Split into batches
      for (let i = 0; i < eligibleAssets.length; i += BATCH_SIZE) {
        const batch = eligibleAssets.slice(i, i + BATCH_SIZE);
        
        // Process entire batch in parallel
        await Promise.all(batch.map(async (asset) => {
          try {
            // Fetch all candles in parallel for this asset
            const [candles1m, candles5m, candles15m] = await Promise.all([
              poClient.getCandles(asset.name, "1m", 50),
              poClient.getCandles(asset.name, "5m", 50),
              poClient.getCandles(asset.name, "15m", 50),
            ]);

            // Always calculate SAR - use real data if available, otherwise generate random
            // Calculate SAR for 1m timeframe
            if (candles1m && candles1m.length > 0) {
              const sar1m = SARCalculator.calculateSAR(candles1m);
              asset.sar1m = sar1m?.direction ?? null;
              this.state.currentPrice = candles1m[candles1m.length - 1].close;
              
              // Track current price and price change for ALL assets
              {
                const currentPrice = candles1m[candles1m.length - 1].close;
                const openPrice = candles1m[0].open;
                asset.currentPrice = currentPrice;
                
                // Calculate % change from first open to last close (period change)
                if (openPrice > 0) {
                  // Positive = price went UP, Negative = price went DOWN
                  asset.priceDropPercentage = ((currentPrice - openPrice) / openPrice) * 100;
                } else {
                  asset.priceDropPercentage = 0;
                }
              }
            }

            // Calculate SAR for 5m timeframe
            if (candles5m && candles5m.length > 0) {
              const sar5m = SARCalculator.calculateSAR(candles5m);
              asset.sar5m = sar5m?.direction ?? null;
            }

            // Calculate SAR for 15m timeframe
            if (candles15m && candles15m.length > 0) {
              const sar15m = SARCalculator.calculateSAR(candles15m);
              asset.sar15m = sar15m?.direction ?? null;
            }

            console.log(
              `[BotController] SAR ${asset.name} - 1m: ${asset.sar1m}, 5m: ${asset.sar5m}, 15m: ${asset.sar15m}`
            );
          } catch (error) {
            console.error(`[BotController] Error processing SAR for ${asset.name}:`, error);
          }
        }));
      }
      
      // Real data only - no fallback to random values
      // If SAR is still null, it means API data was unavailable
      
      // Update ranking for 92% assets
      this.updateAsset92PercentRanking();
      // Don't emit here - SAR loop will emit after this completes
    } catch (error) {
      console.error("[BotController] Error updating real SAR:", error);
    }
  }

  private updateAsset92PercentRanking(): void {
    // Calculate price drop for each asset (random for demo, based on 30min history)
    for (const asset of this.state.monitoredAssets) {
      // For now, generate realistic price drops (negative = down, positive = up)
      // Range: -5% to +2% (most assets falling slightly)
      if (asset.priceDropPercentage === undefined) {
        asset.priceDropPercentage = (Math.random() - 0.6) * 5; // Bias towards negative (falls)
      }
    }
    
    // Get all assets with 92% confidence that are in Ready to Trade status
    const readyAssets = this.state.monitoredAssets.filter(
      a => a.percentage === 92 && a.status === "ready"
    );
    
    // Sort by price drop percentage (highest drop = rank 1, most negative first)
    readyAssets.sort((a, b) => (b.priceDropPercentage ?? 0) - (a.priceDropPercentage ?? 0));
    
    // Assign ranks
    readyAssets.forEach((asset, index) => {
      asset.rank = index + 1;
    });
    
    if (readyAssets.length > 0) {
      console.log(
        `[BotController] Asset Ranking (Top 5): ${readyAssets.slice(0, 5).map(a => `${a.name}(#${a.rank}): -${Math.abs(a.priceDropPercentage ?? 0).toFixed(2)}%`).join(", ")}`
      );
    }
  }

  private async testSARWithRealData(): Promise<void> {
    console.log("\n[SAR TEST] Starting SAR test with real data from PocketOption...");
    
    try {
      const asset = "ETHUSD_otc";
      
      // Fetch real candles for each timeframe
      const candles1m = await poClient.getCandles(asset, "1m", 50);
      const candles5m = await poClient.getCandles(asset, "5m", 50);
      const candles15m = await poClient.getCandles(asset, "15m", 50);
      
      console.log(`[SAR TEST] Candles received - 1m: ${candles1m?.length || 0}, 5m: ${candles5m?.length || 0}, 15m: ${candles15m?.length || 0}`);
      
      // Test SAR calculation
      if (candles1m && candles1m.length > 0) {
        console.log(`[SAR TEST] 1m sample: open=${candles1m[0].open}, high=${candles1m[0].high}, low=${candles1m[0].low}, close=${candles1m[0].close}`);
        const sar1m = SARCalculator.calculateSAR(candles1m);
        console.log(`[SAR TEST] 1m SAR Result: ${sar1m ? `${sar1m.direction} (SAR=${sar1m.sar.toFixed(2)}, AF=${sar1m.af.toFixed(3)})` : "null"}`);
      } else {
        console.log("[SAR TEST] ❌ No 1m candles received");
      }
      
      if (candles5m && candles5m.length > 0) {
        const sar5m = SARCalculator.calculateSAR(candles5m);
        console.log(`[SAR TEST] 5m SAR Result: ${sar5m ? `${sar5m.direction} (SAR=${sar5m.sar.toFixed(2)}, AF=${sar5m.af.toFixed(3)})` : "null"}`);
      } else {
        console.log("[SAR TEST] ❌ No 5m candles received");
      }
      
      if (candles15m && candles15m.length > 0) {
        const sar15m = SARCalculator.calculateSAR(candles15m);
        console.log(`[SAR TEST] 15m SAR Result: ${sar15m ? `${sar15m.direction} (SAR=${sar15m.sar.toFixed(2)}, AF=${sar15m.af.toFixed(3)})` : "null"}`);
      } else {
        console.log("[SAR TEST] ❌ No 15m candles received");
      }
      
      console.log("[SAR TEST] ✅ Test complete\n");
    } catch (error) {
      console.error("[SAR TEST] Error:", error);
    }
  }


  async start(): Promise<void> {
    if (this.state.running) {
      throw new Error("Bot is already running");
    }

    console.log("[BotController] Starting bot...");
    
    this.state = {
      running: true,
      connected: true,
      balance: 5.30,
      currentPrice: 3625.42,
      monitoredAssets: this.assets.map(a => ({ ...a })), // Deep copy assets
      currentTrade: null,
    };

    this.emit("started");
    this.emit("state-update", this.state);

    console.log("[BotController] Bot started successfully");
  }

  async stop(): Promise<void> {
    if (!this.state.running) {
      throw new Error("Bot is not running");
    }

    console.log("[BotController] Stopping bot...");
    
    this.state.running = false;
    this.state.connected = false;
    this.state.currentTrade = null;

    this.emit("stopped");
    this.emit("state-update", this.state);

    console.log("[BotController] Bot stopped successfully");
  }

  updateRealBalance(balance: number): void {
    this.realBalance = balance;
    if (this.state.accountMode === "real") {
      this.state.balance = balance;
      this.emit("state-update", this.state);
      console.log(`[BotController] Real balance updated from browser: $${balance.toFixed(2)}`);
    }
  }

  setAccountMode(mode: "demo" | "real"): void {
    // Save current balance before switching
    if (this.state.accountMode === "demo") {
      this.demoBalance = this.state.balance;
    } else {
      this.realBalance = this.state.balance;
    }
    this.state.accountMode = mode;
    // Restore balance for the selected mode
    this.state.balance = mode === "demo" ? this.demoBalance : this.realBalance;
    this.emit("state-update", this.state);
    console.log(`[BotController] Account mode switched to: ${mode}, balance: $${this.state.balance.toFixed(2)}`);
  }

  getState(): BotState {
    return {
      ...this.state,
      accountInfo: poClient.getAccountInfo()
    };
  }

  async getStatus() {
    const stats = await storage.getTradeStats();
    const recentTrades = await storage.getRecentTrades(20);

    return {
      ...this.state,
      stats,
      trades: recentTrades.map(trade => ({
        id: trade.id,
        timestamp: trade.occurredAt.toISOString(),
        direction: trade.direction,
        amount: parseFloat(trade.amount),
        asset: trade.asset,
        duration: trade.durationSeconds,
        entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : undefined,
        exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
        result: trade.result,
      })),
    };
  }


  private calculateTradeResult(direction: "call" | "put", entryPrice: number, exitPrice: number): "win" | "loss" {
    if (direction === "call") {
      return exitPrice > entryPrice ? "win" : "loss";
    } else {
      return exitPrice < entryPrice ? "win" : "loss";
    }
  }
}

export const botController = new BotController();
