import { useEffect, useRef } from "react";

export interface MonitoredAsset {
  name: string;
  percentage: number;
  status: "ready" | "trading" | "cooldown";
  sar1m: "long" | "short" | null;
  sar3m: "long" | "short" | null;
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
  tradeAmount: number;
  tradeDuration: number;
  counterTrade: boolean;
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
  stats?: { wins: number; losses: number; total: number; winRate: number };
  accountInfo?: {
    uid: number;
    isDemo: boolean;
  };
  accountMode?: "demo" | "real";
}

interface WebSocketMessage {
  type: "state" | "trade-started" | "trade-completed";
  data: any;
}

export function useWebSocket(
  onStateUpdate: (state: BotState) => void,
  onTradeStarted?: (trade: any) => void,
  onTradeCompleted?: (result: any) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isUnmountedRef = useRef(false);
  
  // Store callbacks in refs to avoid reconnecting on every render
  const onStateUpdateRef = useRef(onStateUpdate);
  const onTradeStartedRef = useRef(onTradeStarted);
  const onTradeCompletedRef = useRef(onTradeCompleted);

  // Update refs when callbacks change
  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate;
    onTradeStartedRef.current = onTradeStarted;
    onTradeCompletedRef.current = onTradeCompleted;
  }, [onStateUpdate, onTradeStarted, onTradeCompleted]);

  useEffect(() => {
    isUnmountedRef.current = false;

    const connect = () => {
      if (isUnmountedRef.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host || `${window.location.hostname}:${window.location.port || (protocol === "wss:" ? "443" : "80")}`;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log("[WebSocket] Connecting to", wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case "state":
              onStateUpdateRef.current(message.data);
              break;
            case "trade-started":
              onTradeStartedRef.current?.(message.data);
              break;
            case "trade-completed":
              onTradeCompletedRef.current?.(message.data);
              break;
          }
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected, attempting to reconnect...");
        wsRef.current = null;
        
        if (!isUnmountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); // Only connect once on mount

  return wsRef;
}
