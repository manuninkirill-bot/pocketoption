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

  app.post("/api/bot/account-mode", async (req, res) => {
    try {
      const { mode } = req.body;
      if (mode !== "demo" && mode !== "real") {
        return res.status(400).json({ success: false, error: "Mode must be 'demo' or 'real'" });
      }
      botController.setAccountMode(mode);
      res.json({ success: true, mode });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to switch account mode"
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

  // Account config — exposes session info for client-side PocketOption connection
  app.get("/api/bot/account-config", (req, res) => {
    const ssid = process.env.POCKET_OPTION_SSID || "";
    if (!ssid) return res.json({ configured: false });
    try {
      const parsed = JSON.parse(ssid);
      if (Array.isArray(parsed) && parsed[0] === "auth") {
        const { sessionToken, uid, isDemo, platform, isFastHistory } = parsed[1];
        return res.json({
          configured: true,
          sessionToken,
          uid,
          isDemo: isDemo === 1,
          platform: platform || 29,
          isFastHistory: isFastHistory ?? true,
          wsUrls: [
            "wss://api-l.po.market/socket.io/?EIO=4&transport=websocket",
            "wss://api-in.po.market/socket.io/?EIO=4&transport=websocket",
            "wss://api-fr.po.market/socket.io/?EIO=4&transport=websocket",
            "wss://api-asia.po.market/socket.io/?EIO=4&transport=websocket",
          ]
        });
      }
    } catch {}
    res.json({ configured: false });
  });

  // Allow server to receive real balance reported by browser client
  app.post("/api/bot/real-balance", (req, res) => {
    const { balance } = req.body;
    if (typeof balance === "number" && balance >= 0) {
      botController.updateRealBalance(balance);
      res.json({ success: true, balance });
    } else {
      res.status(400).json({ success: false, error: "Invalid balance" });
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
