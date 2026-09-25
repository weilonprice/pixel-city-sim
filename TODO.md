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

- [x] **Road Hierarchy & Types**
  - [x] Dirt Roads (cheap starter roads for rural/industrial areas with timber bridges).
  - [x] 2-Lane Paved Streets (standard local road with autotiling & steel bridges).
  - [x] 4-Lane Regional Interstate Highway with concrete median barriers.
  - [x] 4-Lane Downtown Avenues with center medians, cable bridges & +15 land value boost.
  - [ ] Highway on/off ramps and one-way streets.
- [x] **Traffic & Emergency Vehicles**
  - [x] Moving vans, commuter cars, and yellow taxis navigating between homes and jobs.
  - [x] Interstate freight semi-trucks transporting cargo from the border.
  - [x] Emergency fire trucks and police cruisers with active flashing beacons.
- [x] **Public Transit**
  - [x] Municipal Bus Depots ($400) and Roadside Bus Stops ($50).
  - [x] Radial transit coverage network (~8 tiles, scaled by funding & Free Transit ordinance).
  - [x] Procedural city transit buses with boarding badges and pneumatic air brake SFX.
  - [x] Transit data heatmap overlay, budget departmental funding slider, and dynamic news bulletins.
  - [x] Heavy Rail / Train tracks ($15/tile), steel trestle bridges ($45/tile), and passenger train stations ($750).
    - [x] Passenger train locomotives & coaches cruising track networks with animated steam puffs and brass horn SFX.
    - [x] Train station radius coverage (14 tiles), +30 land value boost, train ridership demand bonus, and full save/load persistence.
  - [ ] Underground Subway / Metro layer with tunnels and stations.

---

## 💰 Priority 3: Economy, Budget & Management Dashboards

- [x] **Detailed Budget Sheet (Modal UI)**
  - [x] Independent tax sliders for Residential, Commercial, and Industrial zones ($0\%$ to $20\%$).
  - [x] Departmental funding sliders (Road Maintenance, Power, Water, Fire, Police, Health, Education) with dynamic coverage scaling.
  - [x] Itemized revenues, expenses, and projected monthly net cash flow.
- [x] **City Ordinances & Policies**
  - [x] Smoke Detector Ordinance (reduces fire risk by 60%).
  - [x] Free Public Transit (boosts commercial & residential demand, cuts road upkeep by 15%).
  - [x] Clean Air & Smog Scrubbers (cuts power plant pollution spread by 40%).
  - [x] Neighborhood Watch Patrols (cuts residential petty crime by 35%).
  - [x] Pro-Reading Literacy Campaign (boosts school education coverage radius by 25%).
- [x] **City Milestones & Reward Buildings**
  - [x] 5-tier milestone progression: Settlement → Village → Town → City → Metropolis.
  - [x] Mayor's Mansion (Village, 100 pop): +25 land value radial boost.
  - [x] City Hall (Town, 500 pop): 10% expense discount, +35 land value, +60 police coverage.
  - [x] Grand Central (City, 1500 pop): +100 transit, +40 land value boost.
  - [x] Milestone modal with celebration banner, tier cards, progress bars.
  - [x] Full save/load persistence for milestones.

---

## 🌤️ Priority 4: Visual Polish, Atmosphere & Audio

- [x] **Day / Night Cycle & Dynamic Lighting**
  - [x] 24-hour simulation day-night clock with real-time hours and minutes.
  - [x] Golden hour sunrise tinting, orange/purple sunset, and deep midnight blue atmosphere.
- [x] **Dynamic Weather & Seasons**
  - [x] 4-stage procedural weather cycle: Clear, Overcast, Rain, and Thunderstorms.
  - [x] Multi-layer precipitation particle streaks with wind drift and atmospheric lighting.
  - [x] Severe Thunderstorms with full-screen lightning flash illumination and procedural synth thunder audio.
  - [x] Interactive weather status badge in the top bar with click-to-cycle control.
- [x] **Audio SFX & Dynamic Ambient Soundscape**
  - [x] 16-bit Web Audio synth build clicks, demolition crunches, coins, camera shutters, and error buzzers.
  - [x] Dynamic ambient soundscape: breeze/nature loop, traffic hum scaled with population, industrial hum, emergency sirens, and nighttime crickets.
  - [x] Master mute toggle button (`🔊`/`🔇`) with `M` key shortcut and LocalStorage persistence.

---

## 🏙️ Priority 5: High-Density Skylines & Modern Glass Towers

- [x] **High-Density Skylines & Modern Glass Towers (Tier 4 & Tier 5)**
  - [x] **Tier 4 & Tier 5 Residential**: Horizon Residences luxury condominiums with balconies & rooftop infinity pool (~180 pop), and Apex Pinnacle glass megatower with sky lounge and red strobe beacon (~350 pop).
  - [x] **Tier 4 & Tier 5 Commercial**: Corporate Financial Plaza with emerald/navy glass, financial stock ticker & helipad (~150 jobs), and World Trade Megatower with Hancock-style structural X-bracing, golden observation deck, and dual broadcast masts with alternating warning strobes (~320 jobs).
  - [x] **Tier 4 & Tier 5 Industrial**: Clean Biotech & Research Campus with solar arrays, bioreactors & clean white steam (~160 jobs, pollution 18), and Aerospace & Robotics Megafactory with geodesic glass dome, neon core, gantry & satellite dish (~300 jobs, near-zero pollution 8).
  - [x] **Skyscraper Progression Engine**: Multi-service upgrade requirements (land value > 65/80, healthcare, education, fire & police, and transit coverage), synth skyscraper fanfare arpeggio, and news ticker bulletins.

---

## 🔍 Priority 6: Inspector & Citizen Life

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
- [x] **City Snapshot / Camera Tool**
  - [x] One-click high-resolution screenshot export without UI clutter (`📸 Photo` button & `P` shortcut).
  - [x] Vintage camera flash overlay animation with shutter sound effect.
