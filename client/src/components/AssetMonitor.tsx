import { MonitoredAsset } from "@/lib/websocket";
import { useState, useEffect } from "react";
import { TrendingDown, TrendingUp, Zap, CheckCircle2, Clock, BarChart2 } from "lucide-react";

interface AssetMonitorProps {
  assets: MonitoredAsset[];
}

export default function AssetMonitor({ assets }: AssetMonitorProps) {
  const [activeTab, setActiveTab] = useState<"crypto" | "forex">("crypto");

  useEffect(() => {
    const readyAssets = assets.filter(a => a.status === "ready" && a.percentage === 92);
    if (readyAssets.length > 0) {
      console.log("[AssetMonitor] Ready Assets with 92%:", readyAssets.map(a => ({
        name: a.name,
        sar1m: a.sar1m,
        sar5m: a.sar5m,
        sar15m: a.sar15m,
        percentage: a.percentage,
        status: a.status
      })));
    }
  }, [assets]);

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Clock className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">Загрузка данных...</p>
      </div>
    );
  }

  const filteredAssets = assets.filter(a => a.category === activeTab);

  const readyAssets = filteredAssets
    .filter(a => a.status === "ready" && a.percentage === 92)
    .sort((a, b) => (b.priceDropPercentage ?? 0) - (a.priceDropPercentage ?? 0));

  const otherAssets = filteredAssets.filter(a => a.percentage < 92);

  const isConfluence = (asset: MonitoredAsset) =>
    asset.sar1m && asset.sar5m && asset.sar15m &&
    asset.sar1m === asset.sar5m && asset.sar5m === asset.sar15m;

  const cryptoCount = assets.filter(a => a.category === "crypto").length;
  const forexCount = assets.filter(a => a.category === "forex").length;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("crypto")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === "crypto"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="button-tab-cryptocurrencies"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Крипто
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "crypto" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {cryptoCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("forex")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === "forex"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="button-tab-currencies"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Форекс
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "forex" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {forexCount}
          </span>
        </button>
      </div>

      {/* Ready to Trade */}
      {readyAssets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" data-testid="icon-ready" />
              <span className="text-sm font-semibold text-emerald-400">Готово к торговле</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{readyAssets.length}</span>
            </div>
            {readyAssets.length > 0 && (() => {
              const maxDropAsset = readyAssets.reduce((prev, current) =>
                (current.priceDropPercentage ?? 0) > (prev.priceDropPercentage ?? 0) ? current : prev
              );
              return (
                <span className="text-xs text-red-400 font-medium" data-testid="text-strongest-drop">
                  Лидер: {maxDropAsset.name} ↓{Math.abs(maxDropAsset.priceDropPercentage ?? 0).toFixed(2)}%
                </span>
              );
            })()}
          </div>

          <div className="space-y-2">
            {readyAssets.map((asset) => {
              const confluence = isConfluence(asset);
              const drop = asset.priceDropPercentage ?? 0;
              const isPositive = drop <= 0;
              return (
                <div
                  key={asset.name}
                  className={`relative flex items-center justify-between p-3 rounded-xl border transition-all ${
                    confluence
                      ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      : "bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30"
                  }`}
                  data-testid={`card-asset-${asset.name}`}
                >
                  {/* Left: rank + name */}
                  <div className="flex items-center gap-3">
                    {asset.rank ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-400" data-testid={`badge-rank-${asset.name}`}>#{asset.rank}</span>
                      </div>
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-semibold leading-none" data-testid={`text-asset-${asset.name}`}>{asset.name}</p>
                      {confluence && (
                        <div className="flex items-center gap-1 mt-1">
                          <Zap className="w-3 h-3 text-amber-400 animate-pulse" data-testid={`icon-confluence-${asset.name}`} />
                          <span className="text-xs font-semibold text-amber-400">СИГНАЛ СОВПАДАЕТ</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: drop + percentage */}
                  <div className="flex items-center gap-4">
                    {asset.priceDropPercentage !== undefined && (
                      <div className="flex items-center gap-1" data-testid={`text-drop-${asset.name}`}>
                        {isPositive
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                        }
                        <span className={`text-sm font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {isPositive ? "+" : "−"}{Math.abs(drop).toFixed(2)}%
                        </span>
                      </div>
                    )}
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400" data-testid={`text-percentage-${asset.name}`}>
                        {asset.percentage}%
                      </span>
                      <p className="text-xs text-muted-foreground">уверен.</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other assets — compact grid */}
      {otherAssets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-muted-foreground">Мониторинг</span>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{otherAssets.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
            {otherAssets.map((asset) => {
              const pct = asset.percentage;
              const barWidth = Math.max(4, (pct / 92) * 100);
              return (
                <div
                  key={asset.name}
                  className="relative bg-muted/30 border border-border rounded-lg p-2.5 overflow-hidden"
                  data-testid={`card-monitor-${asset.name}`}
                >
                  {/* progress bar */}
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-slate-600 to-slate-400 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                  <p className="text-xs font-medium truncate mb-1">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {readyAssets.length === 0 && otherAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <Clock className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Нет активов в данной категории</p>
        </div>
      )}
    </div>
  );
}
