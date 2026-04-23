import { MonitoredAsset } from "@/lib/websocket";
import { useState } from "react";
import { TrendingDown, TrendingUp, BarChart2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface AssetMonitorProps {
  assets: MonitoredAsset[];
  onDirectionChange?: (direction: "losers" | "gainers") => void;
}

type SarValue = "long" | "short" | null;

function SarBadge({ label, value }: { label: string; value: SarValue }) {
  const color =
    value === "long"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
      : value === "short"
      ? "bg-red-500/20 text-red-400 border-red-500/40"
      : "bg-muted/40 text-muted-foreground border-border/50";
  const arrow = value === "long" ? "↑" : value === "short" ? "↓" : "–";

  return (
    <div className={`flex flex-col items-center px-2 py-1 rounded border ${color}`}>
      <span className="text-[11px] font-bold leading-none">{arrow}</span>
      <span className="text-[9px] mt-0.5 font-semibold opacity-80">{label}</span>
    </div>
  );
}

type AssetWithChange = MonitoredAsset & { change: number };

function LeaderCard({ asset, direction }: { asset: AssetWithChange; direction: "up" | "down" }) {
  const isUp = direction === "up";
  return (
    <div className={`rounded-xl border p-3 mb-1 ${
      isUp
        ? "bg-emerald-500/10 border-emerald-500/40"
        : "bg-red-500/10 border-red-500/40"
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {isUp
            ? <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
            : <ArrowDownCircle className="w-4 h-4 text-red-400" />
          }
          <span className={`text-xs font-bold uppercase tracking-wide ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            Лидер {isUp ? "роста" : "падения"}
          </span>
        </div>
        <span className="text-xs font-bold text-primary/80">
          {Math.round(asset.percentage ?? 92)}% выигрыш
        </span>
      </div>

      {/* Name + change */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold truncate">{asset.name}</p>
        <span className={`text-sm font-bold tabular-nums ${isUp ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? "+" : ""}{asset.change.toFixed(2)}%
        </span>
      </div>

      {/* SAR signals row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground font-medium mr-1">SAR:</span>
        <SarBadge label="1m" value={asset.sar1m} />
        <SarBadge label="3m" value={asset.sar3m} />
        <SarBadge label="5m" value={asset.sar5m} />
        <SarBadge label="15m" value={asset.sar15m} />
      </div>
    </div>
  );
}

export default function AssetMonitor({ assets, onDirectionChange }: AssetMonitorProps) {
  const [categoryTab, setCategoryTab] = useState<"all" | "crypto" | "forex">("all");
  const [directionTab, setDirectionTab] = useState<"losers" | "gainers">("losers");

  const handleDirectionTab = (dir: "losers" | "gainers") => {
    setDirectionTab(dir);
    onDirectionChange?.(dir);
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">Загрузка данных...</p>
      </div>
    );
  }

  const highPayout = assets.filter(a => (a.percentage ?? 0) > 85);
  const filtered = categoryTab === "all" ? highPayout : highPayout.filter(a => a.category === categoryTab);
  const withChange = filtered.map(a => ({ ...a, change: a.priceDropPercentage ?? 0 }));

  const losers = withChange.filter(a => a.change < 0).sort((a, b) => a.change - b.change);
  const gainers = withChange.filter(a => a.change >= 0).sort((a, b) => b.change - a.change);

  const cryptoCount = highPayout.filter(a => a.category === "crypto").length;
  const forexCount = highPayout.filter(a => a.category === "forex").length;

  const showLosers = directionTab === "losers";
  const showGainers = directionTab === "gainers";

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
            {index + 2}
          </span>
          <p className="text-sm font-semibold truncate leading-none" data-testid={`text-asset-${asset.name}`}>
            {asset.name}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-sm font-bold text-primary/70 tabular-nums">
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
                ? "bg-primary text-primary-foreground shadow-sm"
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

      {/* Row 2: Direction tabs (no "Все") */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        <button
          onClick={() => handleDirectionTab("losers")}
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
          onClick={() => handleDirectionTab("gainers")}
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

      {/* LOSERS — leader card + rest of list */}
      {showLosers && losers.length > 0 && (
        <div className="space-y-1.5">
          <LeaderCard asset={losers[0]} direction="down" />
          {losers.length > 1 && (
            <div className="space-y-1">
              {losers.slice(1).map((asset, i) => (
                <AssetRow key={asset.name} asset={asset} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* GAINERS — leader card + rest of list */}
      {showGainers && gainers.length > 0 && (
        <div className="space-y-1.5">
          <LeaderCard asset={gainers[0]} direction="up" />
          {gainers.length > 1 && (
            <div className="space-y-1">
              {gainers.slice(1).map((asset, i) => (
                <AssetRow key={asset.name} asset={asset} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty states */}
      {showLosers && losers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ArrowDownCircle className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Нет падающих пар с выигрышем &gt;85%</p>
        </div>
      )}
      {showGainers && gainers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ArrowUpCircle className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Нет растущих пар с выигрышем &gt;85%</p>
        </div>
      )}
    </div>
  );
}
