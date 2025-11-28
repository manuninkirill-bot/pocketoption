import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Zap } from "lucide-react";
import { MonitoredAsset } from "@/lib/websocket";
import { useState, useEffect } from "react";

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
      <div className="text-center py-8 text-slate-500">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Loading asset data...</p>
      </div>
    );
  }

  // Filter assets by category
  const filteredAssets = assets.filter(a => a.category === activeTab);
  
  const readyAssets = filteredAssets
    .filter(a => a.status === "ready" && a.percentage === 92)
    .sort((a, b) => (b.priceDropPercentage ?? 0) - (a.priceDropPercentage ?? 0));
  
  const highPercentageAssets = filteredAssets.filter(a => a.percentage >= 92 && !(a.status === "ready" && a.percentage === 92));
  const otherAssets = filteredAssets.filter(a => a.percentage < 92);

  const getStatusIcon = (status: string, percentage: number) => {
    if (status === "ready" && percentage === 92) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }
    if (status === "trading") {
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    }
    return <Clock className="w-5 h-5 text-slate-400" />;
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage === 92) return "text-emerald-500";
    if (percentage >= 85) return "text-amber-500";
    return "text-slate-400";
  };

  const getStatusBadgeVariant = (status: string, percentage: number): any => {
    if (status === "ready" && percentage === 92) return "default";
    if (status === "trading") return "secondary";
    return "outline";
  };

  const getSARColor = (signal: "long" | "short" | null) => {
    if (signal === "long") return "bg-emerald-500";
    if (signal === "short") return "bg-red-500";
    return "bg-slate-400";
  };

  const isConfluence = (asset: MonitoredAsset) => {
    return asset.sar1m && asset.sar5m && asset.sar15m &&
           asset.sar1m === asset.sar5m && asset.sar5m === asset.sar15m;
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("crypto")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "crypto" 
              ? "border-emerald-500 text-emerald-500" 
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
          data-testid="button-tab-cryptocurrencies"
        >
          CRYPTOCURRENCIES ({assets.filter(a => a.category === "crypto").length})
        </button>
        <button
          onClick={() => setActiveTab("forex")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "forex" 
              ? "border-emerald-500 text-emerald-500" 
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
          data-testid="button-tab-currencies"
        >
          CURRENCIES ({assets.filter(a => a.category === "forex").length})
        </button>
      </div>

      {/* Ready to Trade Section */}
      {readyAssets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" data-testid="icon-ready" />
              Ready to Trade (92%)
            </h3>
            {readyAssets.length > 0 && (
              <div className="text-xs">
                {(() => {
                  const maxDropAsset = readyAssets.reduce((prev, current) => 
                    (current.priceDropPercentage ?? 0) > (prev.priceDropPercentage ?? 0) ? current : prev
                  );
                  return (
                    <span className="text-red-500 font-semibold" data-testid="text-strongest-drop">
                      {maxDropAsset.name}: -{Math.abs(maxDropAsset.priceDropPercentage ?? 0).toFixed(2)}%
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {readyAssets.map((asset) => {
              const confluenceSignal = isConfluence(asset);
              return (
                <Card 
                  key={asset.name} 
                  className={`p-3 ${confluenceSignal ? "bg-emerald-500/10 border-emerald-500/50 border-2" : "bg-emerald-500/5 border-emerald-500/20"}`} 
                  data-testid={`card-asset-${asset.name}`}
                >
                  <div className="space-y-2">
                    {/* Header - Asset Name & Rank */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm font-medium" data-testid={`text-asset-${asset.name}`}>{asset.name}</span>
                        {asset.rank && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-rank-${asset.name}`}>
                            #{asset.rank}
                          </Badge>
                        )}
                      </div>
                      <span className={`text-sm font-semibold whitespace-nowrap ${getPercentageColor(asset.percentage)}`} data-testid={`text-percentage-${asset.name}`}>
                        +{asset.percentage}%
                      </span>
                    </div>

                    {/* SAR Indicators - Below Asset Name */}
                    <div className="flex items-center gap-3 pl-6">
                      {/* 1m SAR */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div 
                          className={`w-3 h-3 rounded-full ${getSARColor(asset.sar1m)}`}
                          title={`1m: ${asset.sar1m || "—"}`}
                          data-testid={`indicator-sar1m-${asset.name}`}
                        />
                        <span className="text-xs text-slate-400">1m</span>
                      </div>

                      {/* 5m SAR */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div 
                          className={`w-3 h-3 rounded-full ${getSARColor(asset.sar5m)}`}
                          title={`5m: ${asset.sar5m || "—"}`}
                          data-testid={`indicator-sar5m-${asset.name}`}
                        />
                        <span className="text-xs text-slate-400">5m</span>
                      </div>

                      {/* 15m SAR */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div 
                          className={`w-3 h-3 rounded-full ${getSARColor(asset.sar15m)}`}
                          title={`15m: ${asset.sar15m || "—"}`}
                          data-testid={`indicator-sar15m-${asset.name}`}
                        />
                        <span className="text-xs text-slate-400">15m</span>
                      </div>

                      {/* Confluence indicator */}
                      {confluenceSignal && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-emerald-500/50">
                          <Zap className="w-3 h-3 text-amber-400 animate-pulse" data-testid={`icon-confluence-${asset.name}`} />
                          <span className="text-xs font-semibold text-amber-500">MATCH</span>
                        </div>
                      )}
                    </div>

                    {/* Price Drop */}
                    {asset.priceDropPercentage !== undefined && (
                      <div className="pl-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500/60"></div>
                        <span className="text-sm font-bold text-red-500" data-testid={`text-drop-${asset.name}`}>
                          ↓ {Math.abs(asset.priceDropPercentage).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* High Percentage Assets */}
      {highPercentageAssets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            High Percentage ({highPercentageAssets.length})
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {highPercentageAssets.map((asset) => (
              <Card key={asset.name} className="p-3" data-testid={`card-high-${asset.name}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(asset.status, asset.percentage)}
                    <span className="text-sm font-medium">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getPercentageColor(asset.percentage)}`}>
                      +{asset.percentage}%
                    </span>
                    <Badge variant={getStatusBadgeVariant(asset.status, asset.percentage)} className="text-xs">
                      {asset.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Assets */}
      {otherAssets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">
            Monitoring ({otherAssets.length})
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {otherAssets.map((asset) => (
              <Card key={asset.name} className="p-2" data-testid={`card-monitor-${asset.name}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate">{asset.name}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">+{asset.percentage}%</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
