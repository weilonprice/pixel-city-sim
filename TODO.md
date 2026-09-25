# 📋 Pixel City Sim — Master Development To-Do List

A prioritized development roadmap and feature checklist for expanding **Pixel City Sim** into a full-fledged simulation game matching the depth of *SimCity* and *Cities: Skylines*.

---

## 🚦 Priority 1: Core Simulation & Service Expansion

- [ ] **City Services & Coverage Radii**
  - [ ] **Fire Department**: Fire stations with service radii; random building fire hazards; fire engines dispatched to extinguish flames.
  - [ ] **Police Department**: Police stations; crime generation based on low land value and unemployment; police cars patrolling roads.
  - [ ] **Healthcare**: Clinics and hospitals; citizen health score affecting life expectancy and population growth.
  - [ ] **Education**: Elementary schools, high schools, and universities; education level unlocking clean high-tech industry and corporate offices.
- [ ] **Waterfront Bridges & Overpasses**
  - [ ] Dedicated bridge detection when laying roads across water tiles.
  - [ ] Elevated bridge rendering with suspension cables or concrete piers.
- [ ] **Heatmap Overlays Mode**
  - [ ] Data layers toggle (Power Grid, Water Network, Pollution, Land Value, Traffic Density, Crime, Fire Hazard).

---

## 🚗 Priority 2: Advanced Transportation & Traffic

- [ ] **Road Hierarchy & Types**
  - [ ] Dirt Roads (cheap starter roads for rural/industrial areas).
  - [ ] 2-Lane Paved Streets (standard local road).
  - [ ] 4-Lane Avenues with medians (higher capacity for downtown corridors).
  - [ ] One-way roads and highway on/off ramps.
- [ ] **Microscopic Agent Commutes**
  - [ ] Citizens assigned specific homes (R) and workplaces (C or I).
  - [ ] Morning commute (Home $\to$ Work) and evening commute (Work $\to$ Home).
  - [ ] Road edge capacity and congestion slowdowns (traffic jams forming on bottleneck avenues).
- [ ] **Public Transit**
  - [ ] Bus depots, bus stops, and draggable bus transit lines.
  - [ ] Underground Subway / Metro layer with tunnels and stations.
  - [ ] Train tracks and passenger/freight train stations.

---

## 💰 Priority 3: Economy, Budget & Management Dashboards

- [ ] **Detailed Budget Sheet (Modal UI)**
  - [ ] Independent tax sliders for Residential, Commercial, and Industrial zones ($0\%$ to $20\%$).
  - [ ] Departmental funding sliders (Road Maintenance, Power, Water, Fire, Police, Health, Education).
  - [ ] Municipal bonds & emergency loans with interest rates.
- [ ] **City Ordinances & Policies**
  - [ ] Smoke Detector Ordinance (lowers fire risk).
  - [ ] Free Public Transit (boosts bus/metro usage, reduces car traffic).
  - [ ] Clean Energy Tax Credits (encourages solar/wind, penalizes heavy polluters).
  - [ ] Industrial Recycling Initiative (reduces waste output).

---

## 🌤️ Priority 4: Visual Polish, Atmosphere & Audio

- [ ] **Day / Night Cycle & Dynamic Lighting**
  - [ ] 24-minute or adjustable game day-night clock.
  - [ ] Golden hour sunset tinting, dark blue night atmosphere.
  - [ ] Building window lights glowing warm yellow at night.
  - [ ] Streetlights and vehicle headlights illuminating roads.
- [ ] **Weather & Seasons**
  - [ ] Gentle pixel rain with puddle ripples.
  - [ ] Thunderstorms with flash lightning and thunder audio.
  - [ ] Autumn foliage transitions and winter snow dustings.
- [ ] **Audio Ambience & Music**
  - [ ] Procedural background city hum (birds in parks, traffic hum near avenues, factory clang in industrial zones).
  - [ ] Retro 16-bit chill jazz/synth soundtrack.

---

## 🔍 Priority 5: Inspector & Citizen Life

- [ ] **Tile & Citizen Inspector Panel**
  - [ ] Click any building to view: Name, residents count, jobs filled, land value rating, tax contribution, satisfaction level.
  - [ ] Click any moving pixel car to follow its driver (Home address, Destination, Profession).
- [ ] **Disasters (Optional Sandbox Mode)**
  - [ ] Earthquakes creating ground fissures.
  - [ ] Tornadoes ripping across the grid.
  - [ ] Industrial chemical spills and localized power blackouts.

---

## 💾 Priority 6: Persistence, Saves & Community

- [ ] **Save & Load System**
  - [ ] Auto-saving to browser `LocalStorage`.
  - [ ] Multiple named save slots.
  - [ ] Export city to `.json` file / Import city from `.json`.
- [ ] **City Snapshot / Camera Tool**
  - [ ] One-click high-resolution screenshot export without UI clutter.
