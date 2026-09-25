#!/usr/bin/env python3
import os
import sys
import json
import base64
import time
import urllib.request
import urllib.error

TOKEN = os.getenv("PIXELLAB_API_TOKEN")

# Also check .env file if not in environment
if not TOKEN:
    env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                if line.startswith("PIXELLAB_API_TOKEN="):
                    TOKEN = line.strip().split("=", 1)[1]
                    break

if not TOKEN:
    print("❌ Error: PIXELLAB_API_TOKEN not found in environment or .env!")
    sys.exit(1)

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "assets", "sprites"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

ASSETS = [
    {
        "id": "house_cottage",
        "description": "Isometric 2.5D small single-story suburban cottage house, red pitched roof, front porch, chimney, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "townhouse",
        "description": "Isometric 2.5D 2-story brick townhouse brownstone, black iron balcony, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "apartment_tower",
        "description": "Isometric 2.5D modern apartment building with balconies, rooftop water tank, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "corner_diner",
        "description": "Isometric 2.5D retro corner diner cafe, red and white striped awning, neon signage, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "office_building",
        "description": "Isometric 2.5D 3-story office building, retail ground floor, rooftop billboard, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "skyscraper",
        "description": "Isometric 2.5D corporate glass skyscraper tower, blue reflective windows, rooftop antenna, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "warehouse",
        "description": "Isometric 2.5D industrial corrugated storage warehouse, metal roll-up garage door, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "factory",
        "description": "Isometric 2.5D brick manufacturing plant with two tall smokestacks, industrial piping, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "power_plant",
        "description": "Isometric 2.5D coal-fired power plant with cooling tower and electrical transformers, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "water_pump",
        "description": "Isometric 2.5D water pump station building with blue water reservoir dome, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "city_park",
        "description": "Isometric 2.5D municipal city park with green oak tree, stone fountain and bench, clean 16-bit pixel art",
        "width": 64,
        "height": 64,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "taxi",
        "description": "Isometric 2.5D yellow city taxi cab sedan car, clean 16-bit pixel art",
        "width": 48,
        "height": 48,
        "view": "low top-down",
        "direction": "south-east"
    },
    {
        "id": "semi_truck",
        "description": "Isometric 2.5D freight semi-trailer truck with colorful shipping container, clean 16-bit pixel art",
        "width": 64,
        "height": 48,
        "view": "low top-down",
        "direction": "south-east"
    }
]

def generate_asset(asset):
    out_file = os.path.join(OUTPUT_DIR, f"{asset['id']}.png")
    if os.path.exists(out_file) and os.path.getsize(out_file) > 500:
        print(f"⏩ [{asset['id']}] Already exists ({os.path.getsize(out_file)} bytes), skipping.")
        return True

    print(f"\n🎨 [{asset['id']}] Generating via PixelLab...")
    print(f"   Prompt: \"{asset['description'][:65]}...\"")

    url = "https://api.pixellab.ai/v2/create-image-pixen"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "description": asset["description"],
        "image_size": {
            "width": asset["width"],
            "height": asset["height"]
        },
        "no_background": True,
        "view": asset.get("view", "low top-down"),
        "direction": asset.get("direction", "south-east"),
        "detail": "highly detailed"
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    start_t = time.time()

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - start_t

            b64 = data.get("image", {}).get("base64", "")
            if not b64:
                print(f"   ⚠️ No base64 returned for {asset['id']}")
                return False

            if b64.startswith("data:image"):
                b64 = b64.split(",", 1)[1]

            img_bytes = base64.b64decode(b64)
            with open(out_file, "wb") as f:
                f.write(img_bytes)

            usage = data.get("usage", {})
            print(f"   ✨ Saved {asset['id']}.png ({len(img_bytes)} bytes) in {elapsed:.1f}s | Usage: {usage}")
            return True

    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"   ❌ HTTP Error {e.code} for {asset['id']}: {err_msg}")
        return False
    except Exception as e:
        print(f"   ❌ Error generating {asset['id']}: {e}")
        return False

def main():
    print("=" * 60)
    print("🏙️  PIXEL CITY SIM — PIXELLAB ASSET BATCH GENERATION")
    print("=" * 60)
    print(f"Total assets queued: {len(ASSETS)}")

    success = 0
    for asset in ASSETS:
        if generate_asset(asset):
            success += 1

    print("\n" + "=" * 60)
    print(f"🎉 Batch Complete: {success}/{len(ASSETS)} assets generated and saved!")
    print(f"📁 Destination: public/assets/sprites/")
    print("=" * 60)

if __name__ == "__main__":
    main()
