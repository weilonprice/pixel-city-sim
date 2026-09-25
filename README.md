# 🏙️ Pixel City Sim

A retro isometric city-building simulation game inspired by **SimCity 2000/3000** and **Cities: Skylines**, crafted with 16-bit pixel art aesthetics and real-time systemic simulation.

---

## 🎮 Features

- **2.5D Isometric Engine**: Custom diamond-tile projection with full 60 FPS viewport rendering, camera panning (WASD / right-click drag), and cursor-centered zoom.
- **Autotiled Road Network**: Dynamic 16-state bitmask autotiling for roads (straights, 90° curves, 3-way T-junctions, 4-way intersections, and dead-ends).
- **RCI Zoning & Growth System**:
  - 🏡 **Residential**: Houses citizens, provides labor, upgrades from single-family cottages to multi-story townhomes and high-density apartments.
  - 🏬 **Commercial**: Provides consumer services and commerce jobs; progresses from corner bakeries to modern high-rise office towers.
  - 🏭 **Industrial**: Provides manufacturing and factory jobs with animated smokestack particles; generates freight traffic.
- **Systemic Infrastructure (BFS Propagation)**:
  - ⚡ **Power Grid**: Coal power plants transmit electricity along connected road networks and adjacent structures. Unpowered buildings flash a lightning warning.
  - 💧 **Water Network**: Pumping stations distribute clean water across adjacent tiles and roads.
- **Traffic Simulation**: Pixel vehicles (taxis, sedans, trucks) navigate roads dynamically between homes and workplaces.
- **Dynamic Economy & Fiscal Cycles**:
  - Monthly tax revenues based on population and jobs.
  - Infrastructure maintenance upkeep (roads, power plants, water pumps, parks).
  - Floating RCI demand meters reflecting job availability and citizen needs.
- **Retro Audio**: Custom Web Audio API synthesizer for 16-bit retro build clicks, demolition crunches, coins, and error buzzers.

---

## 🕹️ Controls

| Action | Control |
| :--- | :--- |
| **Select Tool** | Click toolbar buttons at the bottom (or Inspect) |
| **Place / Build** | **Left Click** on any valid grid tile |
| **Continuous Build** | **Click & Drag** across tiles (for roads and zones) |
| **Pan Camera** | **Right Click + Drag**, **Middle Click + Drag**, or **W / A / S / D** / Arrow Keys |
| **Zoom Viewport** | **Mouse Wheel** |
| **Simulation Speed** | Click **⏸ Pause**, **1x**, **2x**, or **3x** in the top bar |

---

## 🚀 Quickstart

### 1. Install & Run Locally

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Production Build

```bash
npm run build
npm run preview
```

---

## 🎨 PixelLab MCP Integration

This project is configured to integrate with **PixelLab** via the Model Context Protocol (MCP) for generating custom pixel-art tilesets, isometric buildings, and vehicles.

### Adding PixelLab to your MCP configuration:

Add the following to your AI assistant's MCP configuration (e.g. `~/.gemini/config/mcp_config.json`, `.cursor/mcp.json`, or Claude Desktop config):

```json
{
  "mcpServers": {
    "pixellab": {
      "url": "https://api.pixellab.ai/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_PIXELLAB_API_TOKEN"
      }
    }
  }
}
```

Replace `YOUR_PIXELLAB_API_TOKEN` with your token from [PixelLab.ai](https://www.pixellab.ai).

Once active, tools like `create_tileset`, `create_character`, and `animate_character` can be called directly to generate art assets for `src/assets/`.

---

## 📦 GitHub Repository Setup

To push this project to your public GitHub repository:

```bash
# 1. Log in to GitHub CLI if not already authenticated
gh auth login

# 2. Create the public repository on GitHub and push
gh repo create pixel-city-sim --public --source=. --remote=origin --push
```

Or manually:
```bash
git remote add origin https://github.com/weilonprice/pixel-city-sim.git
git branch -M main
git push -u origin main
```
