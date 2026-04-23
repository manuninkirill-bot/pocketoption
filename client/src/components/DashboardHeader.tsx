import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, FlaskConical, Banknote, ArrowLeftRight, RotateCcw, Trash2 } from "lucide-react";

interface DashboardHeaderProps {
  botRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  accountMode?: "demo" | "real";
  onModeChange?: (mode: "demo" | "real") => void;
  counterTrade?: boolean;
  onCounterTradeChange?: (enabled: boolean) => void;
  onResetBalance?: () => void;
  onClearHistory?: () => void;
}

export default function DashboardHeader({
  botRunning,
  onStart,
  onStop,
  accountMode = "demo",
  onModeChange,
  counterTrade = false,
  onCounterTradeChange,
  onResetBalance,
  onClearHistory,
}: DashboardHeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* LEFT — Logo + title + mode toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/pocket-option-logo.jpeg"
                  alt="PocketOption"
                  className="h-20 w-20 object-contain rounded-xl ring-2 ring-primary/40"
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-primary/20 pointer-events-none" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight gold-text">Pocketoptionbot_v1.0</h1>
                <p className="text-sm text-muted-foreground">SAR Multi-Timeframe · uid:97498220</p>
              </div>
            </div>

            {/* Demo / Real toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 ml-2">
              <button
                onClick={() => onModeChange?.("demo")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  accountMode === "demo"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Демо
              </button>
              <button
                onClick={() => onModeChange?.("real")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  accountMode === "real"
                    ? "bg-success text-success-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                Реальный
              </button>
            </div>
          </div>

          {/* RIGHT — action buttons */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Counter-trade toggle */}
            <button
              onClick={() => onCounterTradeChange?.(!counterTrade)}
              title="Контртрейд — входить в сделку против сигнала SAR"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
                counterTrade
                  ? "bg-primary text-primary-foreground border-primary shadow-sm gold-glow"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Контртрейд
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                counterTrade
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {counterTrade ? "ВКЛ" : "ВЫКЛ"}
              </span>
            </button>

            {/* Reset demo balance */}
            {accountMode === "demo" && (
              <button
                onClick={onResetBalance}
                title="Сбросить демо-баланс до $100"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                Сброс $100
              </button>
            )}

            {/* Clear trade history */}
            <button
              onClick={onClearHistory}
              title="Очистить историю торгов"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold border-border bg-muted/50 text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-all"
            >
              <Trash2 className="h-4 w-4" />
              История
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-border mx-1" />

            {/* Mode badge */}
            <Badge
              variant="outline"
              className={`px-3 py-1 text-xs font-bold border-2 ${
                accountMode === "real"
                  ? "border-success/60 text-success"
                  : "border-primary/60 text-primary"
              }`}
            >
              {accountMode === "real" ? "💰 РЕАЛЬНЫЙ СЧЁТ" : "✦ ДЕМО СЧЁТ"}
            </Badge>

            <Badge
              variant={botRunning ? "default" : "secondary"}
              className={`px-4 py-1.5 text-sm font-semibold ${
                botRunning
                  ? "bg-primary text-primary-foreground animate-gold-pulse"
                  : ""
              }`}
              data-testid="badge-bot-status"
            >
              {botRunning ? "RUNNING" : "STOPPED"}
            </Badge>

            <div className="flex gap-2">
              <Button
                onClick={onStart}
                disabled={botRunning}
                size="sm"
                className="bg-success hover:bg-success/90 text-success-foreground"
                data-testid="button-start-bot"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Bot
              </Button>
              <Button
                onClick={onStop}
                disabled={!botRunning}
                variant="destructive"
                size="sm"
                data-testid="button-stop-bot"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop Bot
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
