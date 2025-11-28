import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface SARIndicatorsProps {
  sar1m: "long" | "short" | null;
  sar5m: "long" | "short" | null;
  sar15m: "long" | "short" | null;
}

export default function SARIndicators({ sar1m, sar5m, sar15m }: SARIndicatorsProps) {
  const allAlign = sar1m && sar5m && sar15m && sar1m === sar5m && sar5m === sar15m;
  const signalDirection = allAlign ? sar1m : null;

  const renderSARBadge = (direction: "long" | "short" | null, timeframe: string) => {
    if (!direction) {
      return <Badge variant="secondary" className="w-20 justify-center" data-testid={`badge-sar-${timeframe}`}>N/A</Badge>;
    }

    return (
      <Badge
        variant={direction === "long" ? "default" : "destructive"}
        className={`w-20 justify-center font-semibold ${
          direction === "long" ? "bg-success hover:bg-success/90" : ""
        }`}
        data-testid={`badge-sar-${timeframe}`}
      >
        {direction.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="backdrop-blur-sm" data-testid="card-sar-indicators">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          SAR Indicators (1m, 5m, 15m)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border-l-4 border-primary/50">
            <span className="font-semibold">1m:</span>
            {renderSARBadge(sar1m, "1m")}
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border-l-4 border-primary/50">
            <span className="font-semibold">5m:</span>
            {renderSARBadge(sar5m, "5m")}
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border-l-4 border-primary/50">
            <span className="font-semibold">15m:</span>
            {renderSARBadge(sar15m, "15m")}
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="text-center">
            {signalDirection ? (
              <Badge
                variant={signalDirection === "long" ? "default" : "destructive"}
                className={`text-lg px-6 py-2 font-bold animate-pulse-glow ${
                  signalDirection === "long" ? "bg-success hover:bg-success/90" : ""
                }`}
                data-testid="badge-signal-status"
              >
                {signalDirection === "long" ? "LONG SIGNAL" : "SHORT SIGNAL"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-lg px-6 py-2 font-bold" data-testid="badge-signal-status">
                NO SIGNAL
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
