import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square } from "lucide-react";
import logoUrl from "@assets/logo.png";

interface DashboardHeaderProps {
  botRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function DashboardHeader({ botRunning, onStart, onStop }: DashboardHeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="Pocketoptionbot" className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">Pocketoptionbot_v1.0</h1>
                <p className="text-sm text-muted-foreground">SAR Multi-Timeframe · Real Account · uid:97498220</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
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
