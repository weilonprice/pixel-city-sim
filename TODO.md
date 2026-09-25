# 📋 Pixel City Sim — Master Development To-Do List

A prioritized development roadmap and feature checklist for expanding **Pixel City Sim** into a full-fledged simulation game matching the depth of *SimCity* and *Cities: Skylines*.

---

## 🚦 Priority 1: Core Simulation & Service Expansion

- [x] **City Services & Coverage Radii**
  - [x] **Fire Department**: Fire stations with 14-tile service radii; building fire hazards; active fire particles & smoke; emergency response.
  - [x] **Police Department**: Police precincts; crime generation based on land value and police presence; patrolling police cruisers with flashing sirens.
  - [x] **Healthcare**: Hospital & emergency clinics with 16-tile health coverage boosting land value and growth.
  - [x] **Education**: Schools with 14-tile education coverage unlocking high-density skyscrapers.
- [x] **PixelLab Municipal & Emergency Sprites (Batch 2)**
  - [x] Generated & integrated `fire_station.png`, `police_station.png`, `hospital.png`, `school.png`.
  - [x] Generated & integrated `fire_truck.png` and `police_car.png` with dynamic emergency sirens.
- [x] **Drag-to-Build & Rectangle Zoning UX**
  - [x] Drag-to-zone bounding box for residential, commercial, industrial, and mass demolish.
  - [x] Straight-line dominant-axis road dragging.
  - [x] Live isometric highlight polygon and dimension/cost badge HUD.
- [x] **Floating Status Alert Badges**
  - [x] Bobbing animated badges for 🚫 (no road access to I-10), ⚡ (no power), 💧 (no water), and 🔥 (fire).
- [x] **Radar Mini-Map Navigation**
  - [x] 128x128 pixel radar widget in bottom-right corner displaying 64x64 terrain, roads, water, and zones.
  - [x] Interactive camera viewport frustum box with click/drag panning and collapse toggle.
- [x] **Waterfront Bridges & Overpasses**
  - [x] Dedicated bridge detection when laying roads across river tiles.
  - [x] Elevated bridge rendering with concrete river pylons and red safety trusses.
- [x] **Heatmap Overlays Mode**
  - [x] Data layers toggle in top bar (Power Grid, Water Network, Fire Safety, Police/Crime, Land Value, Pollution).

---

## 🚗 Priority 2: Advanced Transportation & Traffic

- [ ] **Road Hierarchy & Types**
  - [ ] Dirt Roads (cheap starter roads for rural/industrial areas).
  - [x] 2-Lane Paved Streets (standard local road with autotiling).
  - [x] 4-Lane Regional Interstate Highway with concrete median barriers.
  - [ ] 4-Lane Downtown Avenues with center medians.
  - [ ] One-way roads and highway on/off ramps.
- [x] **Traffic & Emergency Vehicles**
  - [x] Moving vans, commuter cars, and yellow taxis navigating between homes and jobs.
  - [x] Interstate freight semi-trucks transporting cargo from the border.
  - [x] Emergency fire trucks and police cruisers with active flashing beacons.
- [ ] **Public Transit**
  - [ ] Bus depots, bus stops, and draggable bus transit lines.
  - [ ] Underground Subway / Metro layer with tunnels and stations.
  - [ ] Train tracks and passenger/freight train stations.

---

## 💰 Priority 3: Economy, Budget & Management Dashboards

- [x] **Detailed Budget Sheet (Modal UI)**
  - [x] Independent tax sliders for Residential, Commercial, and Industrial zones ($0\%$ to $20\%$).
  - [x] Departmental funding sliders (Road Maintenance, Power, Water, Fire, Police, Health, Education) with dynamic coverage scaling.
  - [x] Itemized revenues, expenses, and projected monthly net cash flow.
- [ ] **City Ordinances & Policies**
  - [ ] Smoke Detector Ordinance (lowers fire risk).
  - [ ] Free Public Transit (boosts bus/metro usage, reduces car traffic).
  - [ ] Clean Energy Tax Credits (encourages solar/wind, penalizes heavy polluters).

---

## 🌤️ Priority 4: Visual Polish, Atmosphere & Audio

- [x] **Day / Night Cycle & Dynamic Lighting**
  - [x] 24-hour simulation day-night clock with real-time hours and minutes.
  - [x] Golden hour sunrise tinting, orange/purple sunset, and deep midnight blue atmosphere.
- [ ] **Dynamic Weather & Seasons**
  - [ ] Gentle pixel rain with puddle ripples.
  - [ ] Thunderstorms with flash lightning and thunder audio.
  - [ ] Winter snow dustings on rooftops.
- [x] **Audio SFX**
  - [x] 16-bit Web Audio synth build clicks, demolition crunches, coins, and error buzzers.

---

## 🔍 Priority 5: Inspector & Citizen Life

- [x] **Tile & Citizen Inspector Panel**
  - [x] Click any building to view: Stage, residents, jobs, utilities, highway link, and land value.
- [x] **Disasters & Emergencies**
  - [x] Random building fire outbreaks with burning flame animations and smoke plume particles.
  - [x] Fire spread / burnout to rubble if unprotected by fire stations.

---

## 💾 Priority 6: Persistence, Saves & Community

- [x] **Save & Load System**
  - [x] Auto-saving to browser `LocalStorage` every 60 seconds.
  - [x] Manual 💾 **Save** and 📂 **Load** buttons in the top navigation bar.
- [x] **Automated Playtest & Verification Suite**
  - [x] End-to-end headless Chrome playtest runner (`scripts/playtest.ts` / `npm run playtest`).
  - [x] Automated layout generation, road and highway connectivity verification, RCI zoning growth, and tax assertions.
  - [x] Full visual verification and regression detection across all 7 heatmap overlays.
  - [x] Deterministic save and cold-boot load verification.
- [ ] **City Snapshot / Camera Tool**
  - [ ] One-click high-resolution screenshot export without UI clutter.
