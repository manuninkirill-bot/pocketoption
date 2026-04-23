import { MonitoredAsset } from "@/lib/websocket";
import { useState } from "react";
import { TrendingDown, TrendingUp, BarChart2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface AssetMonitorProps {
  assets: MonitoredAsset[];
}

export default function AssetMonitor({ assets }: AssetMonitorProps) {
  const [categoryTab, setCategoryTab] = useState<"all" | "crypto" | "forex">("all");
  const [directionTab, setDirectionTab] = useState<"losers" | "all" | "gainers">("losers");

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">Загрузка данных...</p>
      </div>
    );
  }

  const highPayout = assets.filter(a => (a.percentage ?? 0) > 85);
  const filtered = (categoryTab === "all" ? highPayout : highPayout.filter(a => a.category === categoryTab));
  const withChange = filtered.map(a => ({ ...a, change: a.priceDropPercentage ?? 0 }));

  // Losers: most negative first
  const losers = withChange.filter(a => a.change < 0).sort((a, b) => a.change - b.change);
  // Gainers: highest first
  const gainers = withChange.filter(a => a.change >= 0).sort((a, b) => b.change - a.change);

  const cryptoCount = highPayout.filter(a => a.category === "crypto").length;
  const forexCount = highPayout.filter(a => a.category === "forex").length;

  const showLosers = directionTab === "losers" || directionTab === "all";
  const showGainers = directionTab === "gainers" || directionTab === "all";

  const AssetRow = ({ asset, index }: { asset: typeof withChange[0]; index: number }) => {
    const up = asset.change >= 0;
    return (
      <div
        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
          up
            ? "bg-emerald-500/8 border-emerald-500/30 hover:border-emerald-500/50"
            : "bg-red-500/8 border-red-500/30 hover:border-red-500/50"
        }`}
        data-testid={`card-asset-${asset.name}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${up ? "text-emerald-500" : "text-red-400"}`}>
            {index + 1}
          </span>
          <p className="text-sm font-semibold truncate leading-none" data-testid={`text-asset-${asset.name}`}>
            {asset.name}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-sm font-bold text-slate-300 tabular-nums">
            {Math.round(asset.percentage ?? 92)}%
          </span>
          <div className="flex items-center gap-1 min-w-[72px] justify-end">
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
    <div className="space-y-3">
      {/* Row 1: Category tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {(["all", "crypto", "forex"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setCategoryTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
              categoryTab === tab
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

      {/* Row 2: Direction tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        <button
          onClick={() => setDirectionTab("losers")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
            directionTab === "losers"
              ? "bg-red-500/20 text-red-400 shadow-sm"
              : "text-muted-foreground hover:text-red-400"
          }`}
        >
          <ArrowDownCircle className="w-3 h-3" />
          Падали ({losers.length})
        </button>
        <button
          onClick={() => setDirectionTab("all")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
            directionTab === "all"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart2 className="w-3 h-3" />
          Все ({withChange.length})
        </button>
        <button
          onClick={() => setDirectionTab("gainers")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
            directionTab === "gainers"
              ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
              : "text-muted-foreground hover:text-emerald-400"
          }`}
        >
          <ArrowUpCircle className="w-3 h-3" />
          Росли ({gainers.length})
        </button>
      </div>

      {/* LOSERS */}
      {showLosers && losers.length > 0 && (
        <div className="space-y-1.5">
          {directionTab === "all" && (
            <div className="flex items-center gap-2 px-1">
              <ArrowDownCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                Падали ({losers.length})
              </span>
              <span className="ml-auto text-xs text-red-400 font-semibold truncate max-w-[180px]">
                Лидер: {losers[0].name} {losers[0].change.toFixed(2)}%
              </span>
            </div>
          )}
          {directionTab === "losers" && losers.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-red-400 font-semibold truncate">
                Лидер: {losers[0].name} {losers[0].change.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="space-y-1">
            {losers.map((asset, i) => (
              <AssetRow key={asset.name} asset={asset} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Divider when showing both */}
      {directionTab === "all" && losers.length > 0 && gainers.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium px-1">движение цены</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* GAINERS */}
      {showGainers && gainers.length > 0 && (
        <div className="space-y-1.5">
          {directionTab === "all" && (
            <div className="flex items-center gap-2 px-1">
              <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                Росли ({gainers.length})
              </span>
              <span className="ml-auto text-xs text-emerald-400 font-semibold truncate max-w-[180px]">
                Лидер: {gainers[0].name} +{gainers[0].change.toFixed(2)}%
              </span>
            </div>
          )}
          {directionTab === "gainers" && gainers.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-emerald-400 font-semibold truncate">
                Лидер: {gainers[0].name} +{gainers[0].change.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="space-y-1">
            {gainers.map((asset, i) => (
              <AssetRow key={asset.name} asset={asset} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {showLosers && !showGainers && losers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <ArrowDownCircle className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Нет падающих пар с выигрышем &gt;85%</p>
        </div>
      )}
      {showGainers && !showLosers && gainers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <ArrowUpCircle className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Нет растущих пар с выигрышем &gt;85%</p>
        </div>
      )}
      {directionTab === "all" && withChange.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Нет пар с выигрышем &gt;85%</p>
        </div>
      )}
    </div>
  );
}
