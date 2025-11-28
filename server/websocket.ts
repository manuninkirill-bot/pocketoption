import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { botController } from "./bot-controller";

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws"
  });

  console.log("[WebSocket] Server initialized on path /ws");

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WebSocket] Client connected");

    // Send initial state
    ws.send(JSON.stringify({
      type: "state",
      data: botController.getState(),
    }));

    // Listen for bot state updates
    const stateHandler = (state: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Log first asset SAR for debugging
        if (state.monitoredAssets && state.monitoredAssets.length > 0) {
          const firstAsset = state.monitoredAssets[0];
          console.log(`[WebSocket] Broadcasting - ${firstAsset.name}: sar1m=${firstAsset.sar1m}, sar5m=${firstAsset.sar5m}, sar15m=${firstAsset.sar15m}`);
        }
        ws.send(JSON.stringify({
          type: "state",
          data: state,
        }));
      }
    };

    const tradeStartedHandler = (trade: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "trade-started",
          data: trade,
        }));
      }
    };

    const tradeCompletedHandler = (result: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "trade-completed",
          data: result,
        }));
      }
    };

    botController.on("state-update", stateHandler);
    botController.on("trade-started", tradeStartedHandler);
    botController.on("trade-completed", tradeCompletedHandler);

    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected");
      botController.off("state-update", stateHandler);
      botController.off("trade-started", tradeStartedHandler);
      botController.off("trade-completed", tradeCompletedHandler);
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
    });
  });

  return wss;
}
