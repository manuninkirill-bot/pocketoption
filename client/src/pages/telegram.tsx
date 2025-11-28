import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface BotStatus {
  isRunning: boolean;
  balance: number;
  totalTrades: number;
  winRate: number;
  currentTrades: any[];
  recentTrades: any[];
}

// Telegram Web App API
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        close: () => void;
        showAlert: (message: string) => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            is_bot: boolean;
            first_name: string;
            username?: string;
          };
        };
      };
    };
  }
}

export default function TelegramPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.setHeaderColor('#0f172a');
      window.Telegram.WebApp.setBackgroundColor('#000000');
    }

    const params = new URLSearchParams(window.location.search);
    const userIdFromUrl = params.get('user');
    const userIdFromTg = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    setUserId(userIdFromUrl || userIdFromTg || null);

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/bot/status');
        if (response.ok) {
          const data = await response.json();
          const formattedStatus: BotStatus = {
            isRunning: data.running,
            balance: data.balance || 0,
            totalTrades: data.totalTrades || 0,
            winRate: data.stats?.winRate || 0,
            currentTrades: data.currentTrade ? [data.currentTrade] : [],
            recentTrades: data.trades || []
          };
          setStatus(formattedStatus);
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleStartBot = async () => {
    try {
      const response = await fetch('/api/bot/start', { method: 'POST' });
      if (response.ok) {
        window.Telegram?.WebApp?.showAlert?.('✅ Bot started');
      }
    } catch (err) {
      console.error('Failed to start bot:', err);
      window.Telegram?.WebApp?.showAlert?.('❌ Failed to start bot');
    }
  };

  const handleStopBot = async () => {
    try {
      const response = await fetch('/api/bot/stop', { method: 'POST' });
      if (response.ok) {
        window.Telegram?.WebApp?.showAlert?.('✅ Bot stopped');
      }
    } catch (err) {
      console.error('Failed to stop bot:', err);
      window.Telegram?.WebApp?.showAlert?.('❌ Failed to stop bot');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-0 p-4 text-white">
          <h1 className="text-2xl font-bold">🤖 Pocketoptionbot_v1.0</h1>
          <p className="text-sm opacity-90">SAR Multi-Timeframe Strategy</p>
          {userId && <p className="text-xs opacity-75 mt-2">User: {userId}</p>}
        </Card>

        {/* Open Dashboard Button */}
        <Button
          onClick={() => navigate('/')}
          className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 text-white font-bold py-4 text-lg shadow-lg hover:shadow-cyan-500/50"
          data-testid="button-open-dashboard"
        >
          📊 Open Full Dashboard
        </Button>

        {/* Status Card */}
        {status && (
          <Card className="bg-slate-900 border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`font-bold ${status.isRunning ? 'text-green-500' : 'text-red-500'}`}>
                {status.isRunning ? '▶️ Active' : '⏸️ Inactive'}
              </span>
            </div>

            <div className="space-y-2 border-t border-slate-700 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Balance:</span>
                <span className="text-cyan-400 font-mono">${status.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trades:</span>
                <span className="text-white font-mono">{status.totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate:</span>
                <span className={`font-mono ${status.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                  {status.winRate}%
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Active Positions */}
        {status && status.currentTrades.length > 0 && (
          <Card className="bg-slate-900 border-slate-700 p-4 space-y-2">
            <h2 className="text-sm font-bold text-gray-300">Active Positions</h2>
            {status.currentTrades.slice(0, 3).map((trade, i) => (
              <div key={i} className="flex justify-between text-xs p-2 bg-slate-800 rounded">
                <span className="text-gray-400">{trade.asset}</span>
                <span className={trade.direction === 'call' ? 'text-green-500' : 'text-red-500'}>
                  {trade.direction.toUpperCase()}
                </span>
              </div>
            ))}
          </Card>
        )}

        {/* Controls */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleStartBot}
            disabled={status?.isRunning}
            className="flex-1 bg-green-600 hover:bg-green-700"
            data-testid="button-start-bot"
          >
            ▶️ Start
          </Button>
          <Button
            onClick={handleStopBot}
            disabled={!status?.isRunning}
            className="flex-1 bg-red-600 hover:bg-red-700"
            data-testid="button-stop-bot"
          >
            ⏹️ Stop
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex-1"
            data-testid="button-full-dashboard"
          >
            📊 Dashboard
          </Button>
        </div>

        {/* Recent Trades */}
        {status && status.recentTrades.length > 0 && (
          <Card className="bg-slate-900 border-slate-700 p-4 space-y-2">
            <h2 className="text-sm font-bold text-gray-300">Recent Trades</h2>
            {status.recentTrades.slice(0, 5).map((trade, i) => (
              <div key={i} className="flex justify-between text-xs p-2 bg-slate-800 rounded">
                <span className="text-gray-400">{trade.asset}</span>
                <span className={trade.result === 'win' ? 'text-green-500' : 'text-red-500'}>
                  {trade.result === 'win' ? '✅' : '❌'} ${trade.amount}
                </span>
              </div>
            ))}
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4">
          <p>🔄 Auto-refresh: 3s</p>
          <p className="mt-1">Pocketoptionbot_v1.0 on Railway</p>
          {userId && <p className="mt-1 text-gray-600">ID: {userId}</p>}
        </div>
      </div>
    </div>
  );
}
