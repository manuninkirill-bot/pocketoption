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

export default function Dashboard() {
  const { toast } = useToast();
  const [botState, setBotState] = useState<BotState>({
    running: false,
    connected: false,
    balance: 0,
    currentPrice: 0,
    monitoredAssets: [],
    currentTrade: null,
  });

  // Fetch initial status
  const { data: statusData } = useQuery({
    queryKey: ["/api/bot/status"],
    refetchInterval: 5000,
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

  const handleStartBot = () => {
    startBotMutation.mutate();
  };

  const handleStopBot = () => {
    stopBotMutation.mutate();
  };

  // Extract data from status or use WebSocket state
  const balance = botState.balance || 0;
  const currentPrice = botState.currentPrice || 0;
  const stats = (statusData as any)?.stats || { wins: 0, losses: 0, total: 0, winRate: 0 };
  const trades = (statusData as any)?.trades || [];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        botRunning={botState.running}
        onStart={handleStartBot}
        onStop={handleStopBot}
      />

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Account Info Alert */}
        {botState.accountInfo && !botState.accountInfo.isDemo && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-4 mb-4">
            <p className="text-emerald-500 font-semibold text-sm">✅ REAL ACCOUNT ACTIVE</p>
            <p className="text-slate-400 text-xs mt-1">User ID: {botState.accountInfo.uid}</p>
            <p className="text-slate-400 text-xs mt-1">Trading on real money - all trades will affect real balance</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Balance"
            value={balance > 0 ? `$${balance.toFixed(2)}` : "Syncing..."}
            subtitle={botState.accountInfo?.isDemo ? "Demo Account" : "PocketOption Real"}
            icon={DollarSign}
            variant={botState.accountInfo?.isDemo ? "warning" : "success"}
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
            subtitle="$1 per trade"
            icon={Target}
            variant="default"
          />
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
