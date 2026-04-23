import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardHeader from "@/components/DashboardHeader";
import StatCard from "@/components/StatCard";
import CurrentPosition from "@/components/CurrentPosition";
import NoPosition from "@/components/NoPosition";
import TradeHistory from "@/components/TradeHistory";
import AssetMonitor from "@/components/AssetMonitor";
import { DollarSign, TrendingUp, Coins, Target } from "lucide-react";
import { useWebSocket, BotState } from "@/lib/websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePocketOptionBalance } from "@/hooks/usePocketOptionBalance";

export default function Dashboard() {
  const { toast } = useToast();
  const [botState, setBotState] = useState<BotState>({
    running: false,
    connected: false,
    balance: 0,
    currentPrice: 0,
    tradeAmount: 1,
    tradeDuration: 60,
    counterTrade: false,
    monitoredAssets: [],
    currentTrade: null,
    accountMode: "demo",
  });

  // Fetch initial status
  const { data: statusData } = useQuery({
    queryKey: ["/api/bot/status"],
    refetchInterval: 3000,
  });

  // WebSocket connection for real-time updates
  useWebSocket(
    (state: BotState) => {
      setBotState(state);
    },
    (trade) => {
      toast({
        title: "Trade Started",
        description: `${trade.direction.toUpperCase()} position opened at $${trade.entryPrice.toFixed(2)} on ${trade.asset}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
    },
    (result) => {
      toast({
        title: `Trade ${result.result === "win" ? "Won" : "Lost"}`,
        description: `Exit price: $${result.exitPrice.toFixed(2)}`,
        variant: result.result === "win" ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
    }
  );

  // Start bot mutation
  const startBotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bot/start"),
    onSuccess: () => {
      toast({
        title: "Bot Started",
        description: "Trading bot is now running",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start bot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stop bot mutation
  const stopBotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bot/stop"),
    onSuccess: () => {
      toast({
        title: "Bot Stopped",
        description: "Trading bot has been stopped",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop bot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Account mode mutation
  const accountModeMutation = useMutation({
    mutationFn: (mode: "demo" | "real") =>
      apiRequest("POST", "/api/bot/account-mode", { mode }),
    onSuccess: (_, mode) => {
      toast({
        title: mode === "real" ? "Реальный счёт" : "Демо счёт",
        description:
          mode === "real"
            ? "Переключено на реальный счёт"
            : "Переключено на демо счёт",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка переключения режима",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartBot = () => {
    startBotMutation.mutate();
  };

  const handleStopBot = () => {
    stopBotMutation.mutate();
  };

  const stakeMutation = useMutation({
    mutationFn: (amount: number) =>
      apiRequest("POST", "/api/bot/set-stake", { amount }),
    onSuccess: (_, amount) => {
      setBotState((prev) => ({ ...prev, tradeAmount: amount }));
    },
  });

  const durationMutation = useMutation({
    mutationFn: (seconds: number) =>
      apiRequest("POST", "/api/bot/set-duration", { seconds }),
    onSuccess: (_, seconds) => {
      setBotState((prev) => ({ ...prev, tradeDuration: seconds }));
    },
  });

  const counterTradeMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("POST", "/api/bot/set-counter-trade", { enabled }),
    onSuccess: (_, enabled) => {
      setBotState((prev) => ({ ...prev, counterTrade: enabled }));
    },
  });

  const resetBalanceMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bot/reset-balance", {}),
    onSuccess: () => {
      setBotState((prev) => ({ ...prev, balance: 100 }));
      toast({ title: "Баланс сброшен", description: "Демо-баланс восстановлен: $100.00" });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bot/clear-history", {}),
    onSuccess: () => {
      toast({ title: "История очищена", description: "Все записи торгов удалены" });
    },
  });

  const handleModeChange = (mode: "demo" | "real") => {
    accountModeMutation.mutate(mode);
    setBotState((prev) => ({ ...prev, accountMode: mode }));
  };

  const handleStake = (amount: number) => {
    stakeMutation.mutate(amount);
  };

  const handleDuration = (seconds: number) => {
    durationMutation.mutate(seconds);
  };

  // Extract data from status or use WebSocket state
  const isRealAccount = botState.accountMode === "real" && botState.accountInfo && !botState.accountInfo.isDemo && (botState.accountInfo.uid || 0) > 0;

  // Browser-side PocketOption balance (real account only)
  const poBalance = usePocketOptionBalance(!!isRealAccount);

  // Determine displayed balance
  const serverBalance = botState.balance || 0;
  const displayBalance = isRealAccount && poBalance.amount !== null
    ? poBalance.amount
    : serverBalance;

  const currentPrice = botState.currentPrice || 0;
  const stats = (statusData as any)?.stats || { wins: 0, losses: 0, total: 0, winRate: 0 };
  const trades = (statusData as any)?.trades || [];

  // Balance display value
  const balanceValue = isRealAccount
    ? poBalance.connecting
      ? "Подключение..."
      : poBalance.amount !== null
        ? `$${poBalance.amount.toFixed(2)}`
        : poBalance.error
          ? "Ошибка связи"
          : "Реальный счёт"
    : displayBalance > 0
      ? `$${displayBalance.toFixed(2)}`
      : "$0.00";

  const balanceSubtitle = isRealAccount
    ? poBalance.connected
      ? `UID: ${botState.accountInfo?.uid} · Live`
      : poBalance.connecting
        ? "Подключаемся к PocketOption..."
        : `UID: ${botState.accountInfo?.uid}`
    : "Демо счёт · виртуальные деньги";

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        botRunning={botState.running}
        onStart={handleStartBot}
        onStop={handleStopBot}
        accountMode={botState.accountMode ?? "demo"}
        onModeChange={handleModeChange}
        counterTrade={botState.counterTrade ?? false}
        onCounterTradeChange={(v) => counterTradeMutation.mutate(v)}
        onResetBalance={() => resetBalanceMutation.mutate()}
        onClearHistory={() => clearHistoryMutation.mutate()}
      />

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Account Info Alert */}
        {botState.accountMode === "real" && botState.accountInfo && botState.accountInfo.uid > 0 && !botState.accountInfo.isDemo && (
          <div className="bg-success/10 border border-success/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-success font-semibold text-sm">✅ РЕАЛЬНЫЙ СЧЁТ АКТИВЕН</p>
                <p className="text-muted-foreground text-xs mt-1">User ID: {botState.accountInfo.uid}</p>
                <p className="text-muted-foreground text-xs mt-1">Торговля на реальные деньги — все сделки влияют на реальный баланс</p>
              </div>
              <div className="text-right">
                {poBalance.connecting && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Подключаемся к PocketOption...
                  </span>
                )}
                {poBalance.connected && poBalance.amount !== null && (
                  <div>
                    <span className="text-xs text-success flex items-center gap-1 justify-end">
                      <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
                      Подключено · Live
                    </span>
                    <p className="text-success font-bold text-lg mt-1">${poBalance.amount.toFixed(2)}</p>
                  </div>
                )}
                {!poBalance.connecting && !poBalance.connected && poBalance.error && (
                  <span className="text-xs text-destructive">{poBalance.error}</span>
                )}
              </div>
            </div>
          </div>
        )}
        {botState.accountMode === "demo" && (
          <div className="bg-primary/10 border border-primary/40 rounded-lg p-4 mb-4">
            <p className="text-primary font-semibold text-sm">✦ ДЕМО РЕЖИМ</p>
            <p className="text-muted-foreground text-xs mt-1">Торговля на виртуальные деньги — реальный баланс не затрагивается</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Balance"
            value={balanceValue}
            subtitle={balanceSubtitle}
            icon={DollarSign}
            variant={botState.accountMode === "demo" ? "warning" : "success"}
          />
          <StatCard
            title="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            subtitle={`${stats.wins}W / ${stats.losses}L`}
            icon={TrendingUp}
            variant="primary"
          />
          <StatCard
            title="Total Trades"
            value={stats.total.toString()}
            subtitle={`$${botState.tradeAmount ?? 1} за сделку`}
            icon={Target}
            variant="default"
          />
        </div>

        {/* Trade Settings: Stake + Duration */}
        <div className="bg-card border rounded-lg px-5 py-4 space-y-4">
          {/* Stake row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Ставка на сделку</p>
              <p className="text-xs text-muted-foreground mt-0.5">Сумма каждого входа в позицию</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 5, 10, 20].map((amount) => {
                const active = (botState.tradeAmount ?? 1) === amount;
                return (
                  <button
                    key={amount}
                    onClick={() => handleStake(amount)}
                    className={`w-[72px] px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/50 text-foreground border-border hover:border-primary/60 hover:bg-muted"
                    }`}
                  >
                    ${amount}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Duration row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Время сделки</p>
              <p className="text-xs text-muted-foreground mt-0.5">Длительность бинарного опциона</p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: "1 мин", seconds: 60 },
                { label: "3 мин", seconds: 180 },
                { label: "5 мин", seconds: 300 },
                { label: "10 мин", seconds: 600 },
              ].map(({ label, seconds }) => {
                const active = (botState.tradeDuration ?? 60) === seconds;
                return (
                  <button
                    key={seconds}
                    onClick={() => handleDuration(seconds)}
                    className={`w-[72px] px-3 py-2 rounded-lg text-sm font-bold border transition-all whitespace-nowrap ${
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/50 text-foreground border-border hover:border-primary/60 hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Position & Assets */}
          <div className="lg:col-span-2 space-y-6">
            {botState.currentTrade ? (
              <CurrentPosition
                direction={botState.currentTrade.direction}
                amount={botState.currentTrade.amount}
                entryPrice={botState.currentTrade.entryPrice}
                currentPrice={currentPrice}
                startTime={botState.currentTrade.startTime}
                duration={botState.currentTrade.duration}
              />
            ) : (
              <NoPosition />
            )}
            
            {/* Asset Monitor */}
            <div className="bg-card border rounded-lg p-4" data-testid="div-asset-monitor">
              <h2 className="text-lg font-semibold mb-4">Market Monitor</h2>
              <AssetMonitor assets={botState.monitoredAssets} />
            </div>
          </div>
        </div>

        {/* Trade History */}
        <TradeHistory trades={trades} />
      </div>
    </div>
  );
}
