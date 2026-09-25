# 🏙️ Pixel City Sim

A modern retro isometric city-building simulation game inspired by **SimCity 2000/3000** and **Cities: Skylines**, crafted with 16-bit pixel art aesthetics, rich systemic depth, multi-modal transit networks, dynamic weather, high-density skyscrapers, and emergency disaster response.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)
[![PixelLab](https://img.shields.io/badge/PixelLab-AI%20Assets-9333ea.svg)](https://www.pixellab.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

### 🏗️ 2.5D Isometric Engine & Construction UX
- **Crisp Procedural & Sprite Rendering**: 60 FPS viewport rendering with diamond-tile coordinate projection, cursor-centered zoom, and fluid panning.
- **Drag-to-Build Controls**:
  - Mass rectangle zoning for Residential, Commercial, Industrial, and Area Demolition.
  - Dominant-axis straight-line dragging for Dirt Roads, Paved Streets, Downtown Avenues, and Heavy Railroad Tracks.
  - Live isometric bounding box highlight with dimension and real-time cost calculator HUD badges.
- **Floating Status Alert Badges**: Animated bobbing icons for 🚫 (no Interstate 10 connection), ⚡ (unpowered), 💧 (unwatered), 🔥 (active fire), and 📉 (abandoned).
- **Radar Mini-Map Navigation**: 128x128 pixel radar widget displaying 64x64 terrain, water bodies, road grids, and zoned structures with an interactive camera viewport box.

---

### 🚗 Multi-Modal Transportation Network
- **Road Hierarchy**:
  - **Country Dirt Roads ($5)**: Budget rural roadways with Timber Trestle Bridges over waterways.
  - **2-Lane Paved Streets ($10)**: Standard suburban roads with Steel Truss Bridges and 16-state autotiling.
  - **4-Lane Downtown Avenues ($25)**: Central boulevards with landscaped medians, Cable-Stayed Concrete Bridges, and a +15 Land Value radial boost.
  - **4-Lane Interstate Highway 10**: Regional freeway border connection with starter off-ramps to import citizens and freight.
- **Public Bus Transit**:
  - **Municipal Bus Depots ($400)**: Fleet maintenance HQ dispatching transit buses citywide.
  - **Roadside Bus Stops ($50)**: Glass passenger shelters with 8-tile radial coverage, scalable by funding and ordinances.
  - **Transit Buses**: Navigating roads dynamically, dwelling at stops with animated passenger boarding badges (`🚏`), and synthesizing pneumatic air-brake sound effects.
- **Heavy Rail & Passenger Trains**:
  - **Passenger Train Stations ($750)**: 14-tile service reach, +30 Land Value boost, and rail ridership demand multipliers.
  - **Railroad Tracks ($15)** & **Steel Trestle Bridges ($45)**: Dedicated rail corridors crossing land and water.
  - **Passenger Locomotives**: Diesel locomotives with passenger coaches cruising tracks with animated steam puffs, headlights, and dual-tone brass chime locomotive horns (`playTrainHorn`).

---

### 🏢 5-Tier Zoning & Modern High-Density Skylines
Buildings evolve dynamically based on land value, utilities, health, education, fire safety, police presence, and transit coverage:

| Zone Type | Tier 1 (Starter) | Tier 2 (Developing) | Tier 3 (Established) | Tier 4 (High-Density) | Tier 5 (Megatower) |
|---|---|---|---|---|---|
| 🏡 **Residential** | Suburban Cottage (5 pop) | Brick Townhouse (25 pop) | Apartment Block (80 pop) | **Horizon Luxury Condominiums** (180 pop) | **Apex Pinnacle Glass Megatower** (350 pop) |
| 🏬 **Commercial** | Corner Diner (4 jobs) | Commercial Office (20 jobs) | Business Skyscraper (60 jobs) | **Corporate Financial Plaza** (150 jobs) | **World Trade Megatower** (320 jobs) |
| 🏭 **Industrial** | Storage Warehouse (8 jobs) | Manufacturing Plant (30 jobs) | Advanced Factory (90 jobs) | **Clean Biotech Campus** (160 jobs, low pollution) | **Aerospace Megafactory** (300 jobs, near-zero pollution) |

---

### 🏛️ Economy, Municipal Budget & Ordinances
- **Detailed Municipal Budget Sheet (`B` key)**:
  - Independent tax sliders for Residential, Commercial, and Industrial sectors ($0\%$ to $20\%$) with reactive demand curves.
  - Departmental funding sliders ($50\%$ to $150\%$) for Road Maintenance, Power, Water, Fire, Police, Healthcare, Education, and Public Transit with dynamic coverage radius scaling.
  - Itemized revenues, expenses, and projected monthly net cash flow.
- **City Ordinances & Policies**:
  - **Smoke Detector Mandate**: Cuts citywide fire hazards by 60%.
  - **Free Public Transit**: Boosts transit ridership, cuts road upkeep expenses by 15%, and elevates commercial demand.
  - **Clean Air & Smog Scrubbers**: Reduces power plant pollution radius and environmental impact by 40%.
  - **Neighborhood Watch Patrols**: Decreases petty crime across residential neighborhoods by 35%.
  - **Pro-Reading Literacy Campaign**: Expands school education coverage radius by 25%.
- **Civic Milestones & Landmark Rewards**:
  - 5-Tier progression: Pioneer Settlement (25 pop) → Developing Village (100 pop) → Booming Town (500 pop) → Prosperous City (1,500 pop) → Grand Metropolis (5,000 pop).
  - Unlockable civic landmarks: **Mayor's Historic Mansion** (+25 Land Value, +10 Demand), **Majestic City Hall** (-10% citywide municipal expenses, +35 Land Value), and **Grand Central Terminal** (+25 Commercial Demand, maximum transit reach).

---

### 🌪️ Natural Disasters & Emergency Response System
- **Category F4 Tornado**:
  - Animated procedural cyclonic funnel that tears through city blocks.
  - Pulverizes buildings, roads, and tracks into smoking ruins and rubble while igniting secondary electrical fires.
  - Spontaneous chance during thunderstorms or on-demand via the emergency control panel.
- **Magnitude 7.2 Earthquake**:
  - Subterranean seismic tremor with real-time intensity-12 camera screen shake.
  - Radiates fault fissures across the terrain, fracturing roadways, collapsing bridges into water, and triggering structural fires.
- **Cosmic Meteor Strike**:
  - Asteroid descending with a blazing smoke trail that detonates on impact with ground-shattering blast waves and creates a scorched crater zone.
- **Emergency Operations Center (`D` key / `🚨 Disasters`)**:
  - Command modal to trigger disasters, monitor active civil defense status, or execute emergency stand-down aborts.
- **Municipal Cleanup Crews & Rubble Mechanics**:
  - Destroyed structures become smoking rubble (`isRubble = true`, `damaged = true`), persistent across save/load.
  - Clearable manually with the Demolish bulldozer tool ($5) or citywide with one click via Municipal Emergency Cleanup Crews ($10/site).
- **Breaking Emergency Bulletins**: Civil defense air-raid sirens, earthquake rumbles, tornado vortex roars, explosion audio, and live breaking alerts on the News Ticker.

---

### 🌤️ Atmosphere, Weather & Dynamic Soundscape
- **24-Hour Day / Night Cycle**: Continuous simulation clock with golden hour sunrise, sunset, and deep midnight blue atmosphere.
- **Dynamic Weather System**: Procedural 4-stage weather cycle (`CLEAR`, `OVERCAST`, `RAIN`, `THUNDERSTORM`) with drifting rain streaks, screen lightning flashes, synth thunder, and top-bar interactive weather badge.
- **Procedural Ambient Soundscape**: Web Audio API synth soundscape scaling with city population, industrial activity, nighttime crickets, emergency sirens, and a master audio mute toggle (`M` key / `🔊`/`🔇`).
- **City Snapshot / Camera Tool (`P` key / `📸 Photo`)**: Instant UI-free PNG export with a vintage camera flash overlay animation and shutter sound effect.

---

### 🎨 33 Official PixelLab 16-Bit Pixel Art Sprites
The game integrates 33 official pixel art sprite assets generated directly via **PixelLab AI**, managed through `AssetManager.ts` with instant procedural canvas fallbacks:
- **Residential**: Cottage, Townhouse, Apartment Tower, Horizon Residences, Apex Pinnacle Megatower
- **Commercial**: Corner Diner, Office Building, Skyscraper, Corporate Financial Plaza, World Trade Megatower
- **Industrial**: Warehouse, Brick Factory, Biotech Clean Campus, Aerospace Robotics Megafactory
- **Utilities & Services**: Coal Power Plant, Water Pump, City Park, Fire Station, Police Station, Hospital, School
- **Transit & Rail**: Bus Depot, Roadside Bus Stop, City Bus, Train Station, Passenger Locomotive
- **Civic Monuments**: Mayor's Mansion, City Hall, Grand Central Terminal
- **Vehicles**: Yellow Taxi, Interstate Semi-Truck, Fire Engine, Police Cruiser

---

## 🕹️ Controls & Shortcuts

| Action | Control / Key |
|---|---|
| **Select Tool** | Click toolbar icon at bottom |
| **Place / Build** | **Left Click** on valid tile |
| **Continuous Build** | **Click & Drag** across tiles (roads, tracks, zones, demolish) |
| **Pan Camera** | **Right Click + Drag**, **Middle Click + Drag**, or **W / A / S / D** / Arrow Keys |
| **Zoom Viewport** | **Mouse Wheel** (centered on cursor) |
| **Simulation Speed** | **1** (1x), **2** (2x), **3** (5x), **Space** (Pause / Resume) |
| **🚨 Disasters & Emergency Ops** | **D** or click `🚨 Disasters` button |
| **🏛️ Municipal Budget & Taxes** | **B** or click `🏛️ Budget` button |
| **🏆 City Milestones & Perks** | Click the Milestone badge in the top bar |
| **📸 Camera Snapshot Photo** | **P** or click `📸 Photo` button |
| **🔊 Sound Mute Toggle** | **M** or click audio icon (`🔊` / `🔇`) |
| **Inspect Tile** | Click **🔍 Inspect** tool and hover over any tile |

---

## 🚀 Quickstart

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### 2. Install & Run Locally

```bash
# Clone the repository
git clone https://github.com/weilonprice/pixel-city-sim.git
cd pixel-city-sim

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Automated Playtest Suite

Run the full headless Chrome end-to-end automated playtest suite (verifying roads, zoning, economy, transit, weather, save/load, skylines, and disasters across 14 deep test sections):

```bash
npm run playtest
```

### 4. Production Build

```bash
npm run build
npm run preview
```

---

## 🎨 Generating PixelLab Assets

To generate or regenerate pixel art sprite assets through the PixelLab API:

1. Add your API token to `.env`:
   ```bash
   PIXELLAB_API_TOKEN=your_pixellab_token_here
   ```
2. Run the asset generator:
   ```bash
   npm run generate-assets
   ```

---

## 🗺️ Master Roadmap

Follow ongoing development in [TODO.md](TODO.md) and [next_steps_todo.md](next_steps_todo.md).

- [x] Core 2.5D Isometric Engine & Auto-tiling Roads
- [x] Municipal Services (Fire, Police, Healthcare, Education)
- [x] Road Hierarchy (Dirt, Paved, Avenues, Interstate 10, Bridges)
- [x] Public Bus Transit & Heavy Rail Train Networks
- [x] Municipal Budget, RCI Tax Rates & City Ordinances
- [x] 5-Tier City Milestones & Civic Reward Buildings
- [x] Dynamic Weather, Day/Night Cycle & Procedural Audio
- [x] High-Density Skylines (Tiers 4 & 5 Megatowers)
- [x] Natural Disasters & Emergency Operations Center
- [x] 33 Official PixelLab 16-Bit Pixel Art Sprites
- [ ] 🚇 Underground Subway / Metro Layer with subterranean tunneling
- [ ] 🎡 Waterfront Marinas, Boardwalks & Metropolitan Sports Stadiums

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
