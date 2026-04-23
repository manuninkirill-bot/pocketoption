import { MonitoredAsset } from "@/lib/websocket";
import { useState } from "react";
import { TrendingDown, TrendingUp, Zap, BarChart2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface AssetMonitorProps {
  assets: MonitoredAsset[];
}

export default function AssetMonitor({ assets }: AssetMonitorProps) {
  const [activeTab, setActiveTab] = useState<"all" | "crypto" | "forex">("all");

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">Загрузка данных...</p>
      </div>
    );
  }

  const filtered = activeTab === "all" ? assets : assets.filter(a => a.category === activeTab);

  const withChange = filtered
    .map(a => ({ ...a, change: a.priceDropPercentage ?? 0 }))
    .sort((a, b) => b.change - a.change);

  const gainers = withChange.filter(a => a.change >= 0);
  const losers = withChange.filter(a => a.change < 0);

  const isConfluence = (asset: MonitoredAsset) =>
    asset.sar1m && asset.sar5m && asset.sar15m &&
    asset.sar1m === asset.sar5m && asset.sar5m === asset.sar15m;

  const cryptoCount = assets.filter(a => a.category === "crypto").length;
  const forexCount = assets.filter(a => a.category === "forex").length;

  const AssetRow = ({ asset, index }: { asset: typeof withChange[0]; index: number }) => {
    const up = asset.change >= 0;
    const confluence = isConfluence(asset);
    return (
      <div
        key={asset.name}
        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
          confluence
            ? up
              ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.12)]"
              : "bg-red-500/10 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.12)]"
            : "bg-muted/20 border-border/50 hover:border-border"
        }`}
        data-testid={`card-asset-${asset.name}`}
      >
        {/* Rank + Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`text-xs font-bold w-6 text-center flex-shrink-0 ${up ? "text-emerald-500" : "text-red-500"}`}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-none" data-testid={`text-asset-${asset.name}`}>
              {asset.name}
            </p>
            {confluence && (
              <div className="flex items-center gap-1 mt-0.5">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-400">СИГНАЛ</span>
              </div>
            )}
          </div>
        </div>

        {/* SAR direction + change */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* SAR direction pill */}
          {asset.sar1m && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              asset.sar1m === "long"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}>
              {asset.sar1m === "long" ? "↑ LONG" : "↓ SHORT"}
            </span>
          )}

          {/* % change */}
          <div className={`flex items-center gap-1 min-w-[64px] justify-end`}>
            {up
              ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              : <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            }
            <span className={`text-sm font-bold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
              {up ? "+" : ""}{asset.change.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {(["all", "crypto", "forex"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "all" && <BarChart2 className="w-3 h-3" />}
            {tab === "crypto" && "₿"}
            {tab === "forex" && "💱"}
            {tab === "all" ? "Все" : tab === "crypto" ? `Крипто (${cryptoCount})` : `Форекс (${forexCount})`}
          </button>
        ))}
      </div>

      {/* Gainers section */}
      {gainers.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
              Росли ({gainers.length})
            </span>
            {gainers.length > 0 && (
              <span className="ml-auto text-xs text-emerald-400 font-semibold">
                Лидер: {gainers[0].name} +{gainers[0].change.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="space-y-1">
            {gainers.map((asset, i) => (
              <AssetRow key={asset.name} asset={asset} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {gainers.length > 0 && losers.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium px-1">движение цены</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Losers section */}
      {losers.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
              Падали ({losers.length})
            </span>
            {losers.length > 0 && (
              <span className="ml-auto text-xs text-red-400 font-semibold">
                Лидер: {losers[losers.length - 1].name} {losers[losers.length - 1].change.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="space-y-1">
            {losers.map((asset, i) => (
              <AssetRow key={asset.name} asset={asset} index={i} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Нет активов</p>
        </div>
      )}
    </div>
  );
}
