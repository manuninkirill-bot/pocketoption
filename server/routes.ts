import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { botController } from "./bot-controller";
import { setupWebSocket } from "./websocket";
import { telegramRouter } from "./telegram-webhook";

export async function registerRoutes(app: Express): Promise<Server> {
  // Telegram webhook
  app.use("/api", telegramRouter);
  // Bot control routes
  app.post("/api/bot/start", async (req, res) => {
    try {
      await botController.start();
      res.json({ success: true, message: "Bot started successfully" });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to start bot" 
      });
    }
  });

  app.post("/api/bot/stop", async (req, res) => {
    try {
      await botController.stop();
      res.json({ success: true, message: "Bot stopped successfully" });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to stop bot" 
      });
    }
  });

  app.get("/api/bot/status", async (req, res) => {
    try {
      const status = await botController.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get bot status" 
      });
    }
  });

  // Trade routes
  app.get("/api/trades", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const trades = await storage.getRecentTrades(limit);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch trades" 
      });
    }
  });

  app.get("/api/trades/stats", async (req, res) => {
    try {
      const stats = await storage.getTradeStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch trade stats" 
      });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocket(httpServer);

  return httpServer;
}
