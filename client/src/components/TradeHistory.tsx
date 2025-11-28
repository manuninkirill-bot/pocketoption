import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, TrendingDown } from "lucide-react";

interface Trade {
  id: string;
  timestamp: string;
  direction: "call" | "put";
  amount: number;
  asset: string;
  duration: number;
  entryPrice?: number;
  exitPrice?: number;
  result?: "win" | "loss";
}

interface TradeHistoryProps {
  trades: Trade[];
}

export default function TradeHistory({ trades }: TradeHistoryProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <Card className="backdrop-blur-sm" data-testid="card-trade-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Trade History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-3 opacity-50" />
              <p>No completed trades</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 rounded-lg hover-elevate border border-border"
                  data-testid={`trade-item-${trade.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      trade.direction === "call" ? "bg-success/20" : "bg-destructive/20"
                    }`}>
                      {trade.direction === "call" ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold font-mono text-sm">
                        {trade.direction.toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(trade.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold">
                        ${trade.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trade.duration}s
                      </p>
                    </div>
                    {trade.result && (
                      <Badge
                        variant={trade.result === "win" ? "default" : "destructive"}
                        className={`w-16 justify-center ${
                          trade.result === "win" ? "bg-success hover:bg-success/90" : ""
                        }`}
                        data-testid={`badge-trade-result-${trade.id}`}
                      >
                        {trade.result.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
