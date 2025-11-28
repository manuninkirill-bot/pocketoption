import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Circle } from "lucide-react";
import { useEffect, useState } from "react";

interface CurrentPositionProps {
  direction: "call" | "put";
  amount: number;
  entryPrice: number;
  currentPrice: number;
  startTime: string;
  duration: number;
}

export default function CurrentPosition({
  direction,
  amount,
  entryPrice,
  currentPrice,
  startTime,
  duration,
}: CurrentPositionProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, duration]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const priceDiff = currentPrice - entryPrice;
  const isWinning = direction === "call" ? priceDiff > 0 : priceDiff < 0;

  const statusText = priceDiff === 0 ? "UNCHANGED" : priceDiff > 0 ? "UP" : "DOWN";
  const statusColor = priceDiff === 0 ? "bg-secondary" : priceDiff > 0 ? "bg-success" : "bg-destructive";

  return (
    <Card className="backdrop-blur-sm" data-testid="card-current-position">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-primary fill-primary" />
          Current Position
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-6 items-center">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Direction</p>
            <Badge
              variant={direction === "call" ? "default" : "destructive"}
              className="text-base px-4 py-1.5"
              data-testid="badge-position-direction"
            >
              {direction === "call" ? (
                <><TrendingUp className="mr-1 h-4 w-4" /> CALL</>
              ) : (
                <><TrendingDown className="mr-1 h-4 w-4" /> PUT</>
              )}
            </Badge>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Amount</p>
            <p className="text-xl font-bold font-mono text-warning" data-testid="text-position-amount">
              ${amount.toFixed(2)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Entry</p>
            <p className="text-xl font-bold font-mono" data-testid="text-position-entry">
              ${entryPrice.toFixed(2)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Current</p>
            <p className="text-xl font-bold font-mono mb-1" data-testid="text-position-current">
              ${currentPrice.toFixed(2)}
            </p>
            <Badge variant="secondary" className={`${statusColor} text-xs`} data-testid="badge-position-status">
              {statusText} {priceDiff !== 0 && `${priceDiff > 0 ? "+" : ""}${priceDiff.toFixed(2)}`}
            </Badge>
          </div>

          <div className="text-center">
            <div className={`text-5xl mb-2 ${isWinning ? "" : "opacity-50"}`}>
              {isWinning ? "🟢" : "🔴"}
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Time Left</p>
            <p className={`text-2xl font-bold font-mono ${timeLeft < 30 ? "animate-countdown-warning" : "text-warning"}`} data-testid="text-position-time">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
