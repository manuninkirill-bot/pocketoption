export interface MonitoredAsset {
  name: string;
  percentage: number;
  status: "ready" | "trading" | "cooldown";
}
