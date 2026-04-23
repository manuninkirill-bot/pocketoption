import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, FlaskConical, Banknote } from "lucide-react";

interface DashboardHeaderProps {
  botRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  accountMode?: "demo" | "real";
  onModeChange?: (mode: "demo" | "real") => void;
}

export default function DashboardHeader({
  botRunning,
  onStart,
  onStop,
  accountMode = "demo",
  onModeChange,
}: DashboardHeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/pocket-option-logo.jpeg" alt="PocketOption" className="h-10 w-10 object-contain rounded-lg" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">Pocketoptionbot_v1.0</h1>
                <p className="text-sm text-muted-foreground">SAR Multi-Timeframe · uid:97498220</p>
              </div>
            </div>

            {/* Account Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 ml-2">
              <button
                onClick={() => onModeChange?.("demo")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  accountMode === "demo"
                    ? "bg-amber-500 text-white shadow-sm"
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
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                Реальный
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Mode badge */}
            <Badge
              variant="outline"
              className={`px-3 py-1 text-xs font-bold border-2 ${
                accountMode === "real"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-amber-500 text-amber-400"
              }`}
            >
              {accountMode === "real" ? "💰 РЕАЛЬНЫЙ СЧЁТ" : "🧪 ДЕМО СЧЁТ"}
            </Badge>

            <Badge
              variant={botRunning ? "default" : "secondary"}
              className={`px-4 py-1.5 text-sm font-semibold ${
                botRunning ? "bg-success text-success-foreground" : ""
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
