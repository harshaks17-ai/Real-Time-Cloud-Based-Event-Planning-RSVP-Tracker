import asyncio
import json
import httpx

try:
    import websockets
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "websockets"])
    import websockets

BASE = "http://127.0.0.1:8000"
PROXY = "http://localhost:5173"


async def test_direct():
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{BASE}/api/login", json={"email": "alice@example.com", "password": "Demo@123"})
        h = {"Authorization": f"Bearer {r.json()['access_token']}"}
        evs = (await c.get(f"{BASE}/api/events/mine", headers=h)).json()
        if not evs:
            print("no events")
            return
        eid = evs[0]["id"]
        print("event:", evs[0]["name"], eid)

        async with websockets.connect(f"ws://127.0.0.1:8000/ws/events/{eid}") as ws:
            first = await asyncio.wait_for(ws.recv(), 5)
            print("WS direct first:", first[:160])

            r2 = await c.post(f"{BASE}/api/login", json={"email": "bob@example.com", "password": "Demo@123"})
            h2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}
            await c.delete(f"{BASE}/api/events/{eid}/rsvp", headers=h2)
            resp = await c.post(f"{BASE}/api/events/{eid}/rsvp", json={"status": "GOING"}, headers=h2)
            print("rsvp:", resp.status_code, resp.text[:200])
            try:
                msg = await asyncio.wait_for(ws.recv(), 5)
                print("WS direct update:", msg[:250])
            except Exception as e:
                print("WS direct NO UPDATE:", type(e).__name__, e)


async def test_proxy():
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{PROXY}/api/login", json={"email": "alice@example.com", "password": "Demo@123"})
            h = {"Authorization": f"Bearer {r.json()['access_token']}"}
            evs = (await c.get(f"{PROXY}/api/events/mine", headers=h)).json()
            eid = evs[0]["id"]
        print("proxy event:", eid)
        async with websockets.connect(f"ws://localhost:5173/ws/events/{eid}") as ws:
            print("WS proxy first:", (await asyncio.wait_for(ws.recv(), 5))[:160])
            # trigger from direct API
            async with httpx.AsyncClient() as c:
                r2 = await c.post(f"{BASE}/api/login", json={"email": "carol@example.com", "password": "Demo@123"})
                h2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}
                await c.delete(f"{BASE}/api/events/{eid}/rsvp", headers=h2)
                resp = await c.post(f"{BASE}/api/events/{eid}/rsvp", json={"status": "MAYBE"}, headers=h2)
                print("rsvp via direct:", resp.status_code)
            try:
                msg = await asyncio.wait_for(ws.recv(), 5)
                print("WS proxy update:", msg[:250])
            except Exception as e:
                print("WS proxy NO UPDATE:", type(e).__name__, e)
    except Exception as e:
        print("PROXY WS FAIL:", type(e).__name__, e)


async def main():
    print("=== DIRECT WS ===")
    await test_direct()
    print("=== PROXY WS ===")
    await test_proxy()


asyncio.run(main())
