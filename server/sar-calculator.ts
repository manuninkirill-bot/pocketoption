/**
 * Parabolic SAR Calculator
 * Calculates real SAR signals based on OHLCV candle data
 */

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
}

export interface SARValue {
  sar: number;
  direction: "long" | "short";
  af: number; // Acceleration Factor
  hp: number; // High Point
  lp: number; // Low Point
}

export class SARCalculator {
  private static readonly INITIAL_AF = 0.02;
  private static readonly MAX_AF = 0.2;
  private static readonly AF_INCREMENT = 0.02;

  static calculateSAR(candles: Candle[]): SARValue | null {
    if (candles.length < 5) return null;

    // Determine initial trend based on price movement
    const firstHalf = candles.slice(0, Math.floor(candles.length / 2));
    const secondHalf = candles.slice(Math.floor(candles.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, c) => sum + c.close, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, c) => sum + c.close, 0) / secondHalf.length;
    
    // Start with direction based on price trend
    let direction: "long" | "short" = secondAvg > firstAvg ? "long" : "short";
    
    let sarValue = direction === "long" ? candles[0].low : candles[0].high;
    let af = this.INITIAL_AF;
    let hp = candles[0].high;
    let lp = candles[0].low;

    // Process each candle
    for (let i = 1; i < candles.length; i++) {
      const candle = candles[i];

      // Update SAR for next period
      sarValue = sarValue + af * (direction === "long" ? hp - sarValue : sarValue - lp);

      // Ensure SAR doesn't go below the last 2 lows (long) or above the last 2 highs (short)
      if (direction === "long") {
        sarValue = Math.min(sarValue, candles[i - 1].low, candles[i - 2]?.low || candle.low);
      } else {
        sarValue = Math.max(sarValue, candles[i - 1].high, candles[i - 2]?.high || candle.high);
      }

      // Check for reversal
      if (direction === "long") {
        if (candle.low < sarValue) {
          // Reversal to SHORT
          direction = "short";
          sarValue = hp;
          lp = candle.low;
          af = this.INITIAL_AF;
        } else {
          // Update high point and acceleration factor
          if (candle.high > hp) {
            hp = candle.high;
            af = Math.min(af + this.AF_INCREMENT, this.MAX_AF);
          }
        }
      } else {
        if (candle.high > sarValue) {
          // Reversal to LONG
          direction = "long";
          sarValue = lp;
          hp = candle.high;
          af = this.INITIAL_AF;
        } else {
          // Update low point and acceleration factor
          if (candle.low < lp) {
            lp = candle.low;
            af = Math.min(af + this.AF_INCREMENT, this.MAX_AF);
          }
        }
      }
    }

    return {
      sar: sarValue,
      direction,
      af,
      hp,
      lp,
    };
  }

  static getSARDirectionFromPrice(
    sarValue: number,
    closePrice: number
  ): "long" | "short" {
    // Simple SAR interpretation: price above SAR = uptrend (long), below = downtrend (short)
    return closePrice > sarValue ? "long" : "short";
  }
}
