import { useEffect, useRef, useState, useCallback } from "react";

interface AccountConfig {
  configured: boolean;
  sessionToken?: string;
  uid?: number;
  isDemo?: boolean;
  platform?: number;
  isFastHistory?: boolean;
  wsUrls?: string[];
}

interface BalanceState {
  amount: number | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

const PO_WS_URLS = [
  "wss://api-l.po.market/socket.io/?EIO=4&transport=websocket",
  "wss://api-in.po.market/socket.io/?EIO=4&transport=websocket",
  "wss://api-fr.po.market/socket.io/?EIO=4&transport=websocket",
  "wss://api-asia.po.market/socket.io/?EIO=4&transport=websocket",
  "wss://api-c.po.market/socket.io/?EIO=4&transport=websocket",
];

export function usePocketOptionBalance(enabled: boolean) {
  const [state, setState] = useState<BalanceState>({
    amount: null,
    connected: false,
    connecting: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef<AccountConfig | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlIndexRef = useRef(0);
  const mountedRef = useRef(true);

  const clearTimers = () => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
  };

  const reportBalance = useCallback(async (amount: number) => {
    try {
      await fetch("/api/bot/real-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: amount }),
      });
    } catch {}
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;

    // Fetch config if needed
    if (!configRef.current) {
      try {
        const res = await fetch("/api/bot/account-config");
        const cfg: AccountConfig = await res.json();
        configRef.current = cfg;
      } catch {
        setState(s => ({ ...s, connecting: false, error: "Не удалось получить конфигурацию" }));
        return;
      }
    }

    const cfg = configRef.current;
    if (!cfg?.configured || !cfg.sessionToken) {
      setState(s => ({ ...s, connecting: false, error: "SSID не настроен" }));
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    clearTimers();

    const urls = cfg.wsUrls || PO_WS_URLS;
    const url = urls[urlIndexRef.current % urls.length];

    setState(s => ({ ...s, connecting: true, error: null }));
    console.log(`[PO-Balance] Connecting to ${url}`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    let handshakeDone = false;

    ws.onopen = () => {
      console.log("[PO-Balance] WebSocket open");
    };

    ws.onmessage = (event) => {
      const msg = event.data as string;

      // Socket.IO handshake: 0{...}
      if (msg.startsWith("0") && !handshakeDone) {
        handshakeDone = true;
        ws.send("40"); // Socket.IO connect packet
        return;
      }

      // Socket.IO connected: 40 or 40{...}
      if (msg.startsWith("40") && handshakeDone) {
        // Now authenticate
        const authPayload = JSON.stringify([
          "auth",
          {
            sessionToken: cfg.sessionToken,
            uid: cfg.uid,
            platform: cfg.platform || 29,
            isDemo: cfg.isDemo ? 1 : 0,
            isFastHistory: cfg.isFastHistory ?? true,
          }
        ]);
        ws.send(`42${authPayload}`);
        console.log("[PO-Balance] Auth sent");

        // Start ping to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("2");
        }, 25000);
        return;
      }

      // Ping from server: 2
      if (msg === "2") { ws.send("3"); return; }
      // Pong: 3
      if (msg === "3") return;

      // Socket.IO event: 42[...]
      if (msg.startsWith("42")) {
        try {
          const payload = JSON.parse(msg.slice(2));
          if (!Array.isArray(payload)) return;

          const [event, data] = payload;
          const evLower = String(event).toLowerCase();

          // Balance update events
          if (evLower.includes("balance") || evLower.includes("updatebalance")) {
            const amount = data?.amount ?? data?.balance ?? data?.demo ?? data?.real;
            if (typeof amount === "number" && mountedRef.current) {
              console.log(`[PO-Balance] Balance received: $${amount}`);
              setState(s => ({ ...s, amount, connected: true, connecting: false, error: null }));
              reportBalance(amount);
            }
          }

          // Auth success — mark connected
          if (evLower.includes("auth") || evLower.includes("successauth") || evLower.includes("login")) {
            if (!mountedRef.current) return;
            setState(s => ({ ...s, connected: true, connecting: false }));
            console.log("[PO-Balance] Auth success:", JSON.stringify(data).slice(0, 100));
            // Balance might be in the auth response
            const amount = data?.balance ?? data?.amount;
            if (typeof amount === "number") {
              setState(s => ({ ...s, amount }));
              reportBalance(amount);
            }
          }
        } catch {}
      }
    };

    ws.onerror = () => {
      console.warn(`[PO-Balance] Error on ${url}`);
    };

    ws.onclose = () => {
      clearTimers();
      if (!mountedRef.current) return;
      console.warn(`[PO-Balance] Disconnected from ${url}`);
      setState(s => ({ ...s, connected: false, connecting: false }));

      // Try next URL on failure
      urlIndexRef.current++;
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && enabled) connect();
      }, 3000);
    };
  }, [enabled, reportBalance]);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    } else {
      // Disconnect when switching to demo
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setState({ amount: null, connected: false, connecting: false, error: null });
    }

    return () => {
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [enabled, connect]);

  return state;
}
