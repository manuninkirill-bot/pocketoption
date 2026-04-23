import { type User, type InsertUser, type Trade, type InsertTrade, trades } from "@shared/schema";
import { randomUUID } from "crypto";
import { desc, sql } from "drizzle-orm";

let db: any = null;

// Try to initialize database connection
try {
  const module = require("./db");
  db = module.db;
} catch (error) {
  console.warn("[Storage] Database initialization failed, using in-memory storage:", error instanceof Error ? error.message : String(error));
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trade operations
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, updates: Partial<InsertTrade>): Promise<Trade | undefined>;
  getTrade(id: string): Promise<Trade | undefined>;
  getRecentTrades(limit: number): Promise<Trade[]>;
  getTradeStats(): Promise<{ wins: number; losses: number; total: number; winRate: number }>;
  clearAllTrades(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tradesMap: Map<string, Trade>;

  constructor() {
    this.users = new Map();
    this.tradesMap = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    if (db) {
      try {
        const [newTrade] = await db.insert(trades).values(trade).returning();
        this.tradesMap.set(newTrade.id, newTrade);
        return newTrade;
      } catch (error) {
        console.warn("[Storage] Database write failed, using in-memory storage");
      }
    }
    
    // Fallback to in-memory storage
    const id = randomUUID();
    const newTrade: Trade = {
      id,
      occurredAt: new Date(),
      direction: trade.direction,
      amount: typeof trade.amount === 'string' ? trade.amount : String(trade.amount),
      asset: trade.asset,
      durationSeconds: trade.durationSeconds,
      entryPrice: trade.entryPrice ? typeof trade.entryPrice === 'string' ? trade.entryPrice : String(trade.entryPrice) : null,
      exitPrice: trade.exitPrice ? typeof trade.exitPrice === 'string' ? trade.exitPrice : String(trade.exitPrice) : null,
      result: trade.result || 'pending',
      sarSignal: trade.sarSignal || null,
    };
    this.tradesMap.set(id, newTrade);
    return newTrade;
  }

  async updateTrade(id: string, updates: Partial<InsertTrade>): Promise<Trade | undefined> {
    if (db) {
      try {
        const [updated] = await db
          .update(trades)
          .set(updates)
          .where(sql`${trades.id} = ${id}`)
          .returning();
        if (updated) {
          this.tradesMap.set(id, updated);
        }
        return updated;
      } catch (error) {
        console.warn("[Storage] Database update failed, using in-memory storage");
      }
    }

    // Fallback to in-memory storage
    const trade = this.tradesMap.get(id);
    if (trade) {
      const updated = { ...trade, ...updates };
      this.tradesMap.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async getTrade(id: string): Promise<Trade | undefined> {
    if (db) {
      try {
        const [trade] = await db
          .select()
          .from(trades)
          .where(sql`${trades.id} = ${id}`)
          .limit(1);
        if (trade) {
          this.tradesMap.set(id, trade);
        }
        return trade;
      } catch (error) {
        console.warn("[Storage] Database query failed, using in-memory storage");
      }
    }

    return this.tradesMap.get(id);
  }

  async getRecentTrades(limit: number = 50): Promise<Trade[]> {
    if (db) {
      try {
        const dbTrades = await db
          .select()
          .from(trades)
          .orderBy(desc(trades.occurredAt))
          .limit(limit);
        dbTrades.forEach((trade: Trade) => {
          this.tradesMap.set(trade.id, trade);
        });
        return dbTrades;
      } catch (error) {
        console.warn("[Storage] Database query failed, using in-memory storage");
      }
    }

    // Return in-memory trades sorted by date
    return Array.from(this.tradesMap.values()).sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    ).slice(0, limit);
  }

  async getTradeStats(): Promise<{ wins: number; losses: number; total: number; winRate: number }> {
    if (db) {
      try {
        const [stats] = await db
          .select({
            wins: sql<number>`count(*) filter (where ${trades.result} = 'win')`,
            losses: sql<number>`count(*) filter (where ${trades.result} = 'loss')`,
            total: sql<number>`count(*)`,
          })
          .from(trades);

        const winRate = stats.total > 0 ? (Number(stats.wins) / stats.total) * 100 : 0;

        return {
          wins: Number(stats.wins),
          losses: Number(stats.losses),
          total: Number(stats.total),
          winRate: Math.round(winRate * 10) / 10,
        };
      } catch (error) {
        console.warn("[Storage] Database query failed, using in-memory storage");
      }
    }

    // Calculate stats from in-memory trades
    const allTrades = Array.from(this.tradesMap.values());
    const wins = allTrades.filter(t => t.result === 'win').length;
    const losses = allTrades.filter(t => t.result === 'loss').length;
    const total = allTrades.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    return {
      wins,
      losses,
      total,
      winRate: Math.round(winRate * 10) / 10,
    };
  }

  async clearAllTrades(): Promise<void> {
    this.tradesMap.clear();
  }
}

export const storage = new MemStorage();
