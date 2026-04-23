#!/usr/bin/env python3
"""
PocketOption Data Microservice
Connects to real PocketOption API using SSID for live balance and market data
"""

import asyncio
import json
import os
from aiohttp import web
import logging
import random
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache
candles_cache = {}
balance_cache = {"amount": None, "currency": "USD", "updated_at": None}
po_client = None
client_connected = False

SSID = os.environ.get("POCKET_OPTION_SSID", "")

async def init_po_client():
    """Initialize real PocketOption client with SSID"""
    global po_client, client_connected
    if not SSID:
        logger.warning("[PO_SERVICE] No SSID found — balance will be unavailable")
        return

    try:
        from pocketoptionapi_async import AsyncPocketOptionClient

        # Parse SSID to get uid and isDemo
        ssid_str = SSID.strip()
        uid = 0
        is_demo = True

        try:
            parsed = json.loads(ssid_str)
            if isinstance(parsed, list) and len(parsed) >= 2 and parsed[0] == "auth":
                uid = parsed[1].get("uid", 0)
                is_demo = parsed[1].get("isDemo", 1) == 1
                logger.info(f"[PO_SERVICE] SSID parsed: uid={uid}, isDemo={is_demo}")
        except Exception as e:
            logger.warning(f"[PO_SERVICE] Could not parse SSID JSON: {e}")

        po_client = AsyncPocketOptionClient(
            ssid=ssid_str,
            is_demo=is_demo,
            uid=uid,
            platform=29,
            is_fast_history=True,
            auto_reconnect=True,
            enable_logging=False
        )

        logger.info("[PO_SERVICE] Connecting to PocketOption...")
        connected = await asyncio.wait_for(po_client.connect(), timeout=20)
        if connected:
            client_connected = True
            logger.info("[PO_SERVICE] ✅ Connected to PocketOption!")
            # Fetch initial balance
            await refresh_balance()
        else:
            logger.warning("[PO_SERVICE] ⚠️ Could not connect to PocketOption — using offline mode")
    except asyncio.TimeoutError:
        logger.warning("[PO_SERVICE] ⚠️ Connection timeout — using offline mode")
    except Exception as e:
        logger.warning(f"[PO_SERVICE] ⚠️ PocketOption init failed: {e} — using offline mode")

async def refresh_balance():
    """Fetch balance from PocketOption"""
    global balance_cache
    if not po_client or not client_connected:
        return
    try:
        bal = await asyncio.wait_for(po_client.get_balance(), timeout=10)
        if bal:
            balance_cache["amount"] = float(bal.amount) if hasattr(bal, 'amount') else float(bal)
            balance_cache["updated_at"] = datetime.utcnow().isoformat()
            logger.info(f"[PO_SERVICE] Balance: ${balance_cache['amount']:.2f}")
    except Exception as e:
        logger.warning(f"[PO_SERVICE] Balance fetch error: {e}")

async def balance_refresh_loop():
    """Refresh balance every 30 seconds"""
    while True:
        await asyncio.sleep(30)
        await refresh_balance()


async def handle_balance(request):
    """Return real account balance"""
    return web.json_response({
        "success": True,
        "connected": client_connected,
        "balance": balance_cache["amount"],
        "currency": balance_cache["currency"],
        "updated_at": balance_cache["updated_at"]
    })

async def handle_candles(request):
    """HTTP endpoint to fetch candles"""
    try:
        data = await request.json()
        asset = data.get("asset")
        timeframe = data.get("timeframe", "1m")
        count = data.get("count", 50)

        if not asset:
            return web.json_response({"error": "asset required"}, status=400)

        cache_key = f"{asset}/{timeframe}"
        if cache_key in candles_cache:
            logger.info(f"[PO_SERVICE] Returning cached candles for {asset}/{timeframe}")
            return web.json_response({"success": True, "candles": candles_cache[cache_key]})

        # Try real data if connected
        if po_client and client_connected:
            try:
                real_candles = await asyncio.wait_for(
                    po_client.get_candles(asset, timeframe, count),
                    timeout=10
                )
                if real_candles and len(real_candles) > 0:
                    formatted = []
                    for c in real_candles:
                        formatted.append({
                            "time": int(c.time.timestamp() * 1000) if hasattr(c.time, 'timestamp') else int(c.time),
                            "open": float(c.open),
                            "high": float(c.high),
                            "low": float(c.low),
                            "close": float(c.close),
                            "volume": float(c.volume) if hasattr(c, 'volume') else 1000.0
                        })
                    candles_cache[cache_key] = formatted
                    logger.info(f"[PO_SERVICE] Real candles fetched for {asset}/{timeframe}")
                    return web.json_response({"success": True, "candles": formatted})
            except Exception as e:
                logger.warning(f"[PO_SERVICE] Real candle fetch failed for {asset}: {e}")

        # No fake fallback — only real exchange data is served
        logger.warning(f"[PO_SERVICE] No real candles available for {asset}/{timeframe} — exchange not connected")
        return web.json_response({"success": False, "candles": [], "reason": "exchange_unavailable"})

    except Exception as e:
        logger.error(f"[PO_SERVICE] Handler error: {e}")
        return web.json_response({"error": str(e)}, status=500)

async def handle_status(request):
    """HTTP endpoint for service status"""
    return web.json_response({
        "status": "ready",
        "connected": client_connected,
        "cache_size": len(candles_cache),
        "balance": balance_cache["amount"]
    })

async def main():
    """Main service runner"""
    # Init PocketOption client in background
    asyncio.create_task(init_po_client())

    app = web.Application()
    app.router.add_post('/api/candles', handle_candles)
    app.router.add_get('/api/balance', handle_balance)
    app.router.add_get('/api/status', handle_status)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '127.0.0.1', 5001)
    await site.start()

    logger.info("[PO_SERVICE] 🚀 Microservice running on http://127.0.0.1:5001")
    logger.info("[PO_SERVICE] POST /api/candles - Fetch market candles")
    logger.info("[PO_SERVICE] GET /api/balance  - Fetch real account balance")
    logger.info("[PO_SERVICE] GET /api/status   - Service status")

    # Start balance refresh loop
    asyncio.create_task(balance_refresh_loop())

    try:
        await asyncio.Event().wait()
    except KeyboardInterrupt:
        logger.info("[PO_SERVICE] Shutting down...")
        if po_client:
            await po_client.disconnect()
        await runner.cleanup()

if __name__ == '__main__':
    asyncio.run(main())
