# 🎨 Pixel City Sim — Asset Manifest & PixelLab Generation Guide

This catalog lists all pixel-art assets needed for the game, formatted with specifications and prompt suggestions optimized for **PixelLab** generation (`create_tileset`, isometric sprites, and vehicles).

---

## 📐 Isometric Specification Standards
- **Projection**: Classic 2.5D Isometric (2:1 pixel ratio).
- **Base Grid Tile Size**: $64 \times 32\text{px}$ diamond footprint.
- **Multi-tile footprints**:
  - Small buildings / houses: $1 \times 1$ ($64 \times 32\text{px}$ base)
  - Medium buildings / schools / clinics: $2 \times 2$ ($128 \times 64\text{px}$ base)
  - Large facilities / Power plants: $3 \times 3$ ($192 \times 96\text{px}$ base)
- **Palette**: Clean 16-bit retro palette (vibrant tones with distinct shadow/highlight contrast).

---

## 1. Terrain & Water Tilesets

| Asset ID | Description | Size | PixelLab Prompt Idea |
| :--- | :--- | :--- | :--- |
| `terrain_grass_base` | Lush green grass diamond, subtle blade texture | $64 \times 32$ | *"Isometric 2.5D grass tile, top-down angled, clean 16-bit pixel art, vibrant green, seamless"* |
| `terrain_grass_variations` | 3 grass variants (flowers, small rocks, dirt patch) | $64 \times 32$ | *"Isometric pixel grass tile with small wildflowers and pebbles, 16-bit retro"* |
| `terrain_water_animated` | Deep river/lake water with bright cyan shore foam (3-4 frame shimmer) | $64 \times 32$ | *"Isometric river water tile, subtle wave shimmer, deep blue with bright cyan highlights, pixel art"* |
| `terrain_cliff_edges` | Vertical rock/dirt cliff faces for map boundaries and elevation drops | $64 \times 48$ | *"Isometric cliff edge tile, exposed stone and brown earth strata, pixel art"* |

---

## 2. Highway & Road Network

| Asset ID | Description | Size | PixelLab Prompt Idea |
| :--- | :--- | :--- | :--- |
| `highway_straight_ne_sw` | 4-lane divided highway with concrete median barrier (NE-SW) | $64 \times 32$ | *"Isometric 4-lane interstate highway tile with yellow double stripes and concrete barrier, pixel art"* |
| `highway_straight_nw_se` | 4-lane divided highway with concrete median barrier (NW-SE) | $64 \times 32$ | *"Isometric 4-lane highway running diagonal NW to SE, dark asphalt, white dashed lines, pixel art"* |
| `highway_onramp_offramp` | Highway off-ramp merging into local road | $64 \times 32$ | *"Isometric highway off-ramp merge tile, curved asphalt lane joining main road, pixel art"* |
| `highway_overpass` | Elevated highway overpass bridge with concrete pillars | $64 \times 64$ | *"Isometric elevated highway bridge section with supporting concrete pillars underneath, pixel art"* |
| `road_local_autotile` | 2-lane local asphalt road set (straight, curves, 3-way, 4-way, cul-de-sac) | $64 \times 32$ (sheet) | *"16-state isometric 2-lane road tileset, dark gray asphalt, yellow center stripe, curbs, pixel art"* |
| `bridge_suspension` | Road bridge over water with steel trusses | $64 \times 64$ | *"Isometric steel truss road bridge tile crossing over water, pixel art"* |

---

## 3. RCI Zone Buildings

### Residential (R)
| Asset ID | Description | Footprint | Height | PixelLab Prompt Idea |
| :--- | :--- | :--- | :--- | :--- |
| `resi_l1_cottage_a` | Cozy suburban bungalow, red shingle pitched roof, porch | $1 \times 1$ | $48\text{px}$ | *"Isometric 2.5D small single-story suburban house, red pitched roof, front porch, chimney, pixel art"* |
| `resi_l1_cottage_b` | Craftsman house with stone foundation and front garden | $1 \times 1$ | $48\text{px}$ | *"Isometric 2.5D wooden craftsman home, blue shingles, small garden flowerbed, pixel art"* |
| `resi_l2_townhouse` | 2-story brick townhouse with dormer windows & balcony | $1 \times 1$ | $64\text{px}$ | *"Isometric 2.5D 2-story brick townhouse, brownstone facade, black iron balcony railing, pixel art"* |
| `resi_l3_apartment` | 4-5 story modern apartment block with rooftop patio & AC units | $2 \times 2$ | $110\text{px}$ | *"Isometric 2.5D 5-story apartment building, glass balconies, rooftop water tank and AC fans, pixel art"* |

### Commercial (C)
| Asset ID | Description | Footprint | Height | PixelLab Prompt Idea |
| :--- | :--- | :--- | :--- | :--- |
| `comm_l1_diner` | 1-story retro diner / convenience store with red awning | $1 \times 1$ | $42\text{px}$ | *"Isometric 2.5D retro diner, striped awning, glass display window, neon sign, pixel art"* |
| `comm_l2_office` | 3-story boutique office / retail store with billboard | $1 \times 1$ | $70\text{px}$ | *"Isometric 2.5D 3-story office building, retail ground floor, rooftop billboard, pixel art"* |
| `comm_l3_skyscraper` | Corporate glass skyscraper with illuminated windows & antenna | $2 \times 2$ | $140\text{px}$ | *"Isometric 2.5D sleek corporate glass skyscraper, blue-tinted windows, rooftop communications tower, pixel art"* |

### Industrial (I)
| Asset ID | Description | Footprint | Height | PixelLab Prompt Idea |
| :--- | :--- | :--- | :--- | :--- |
| `ind_l1_warehouse` | Corrugated metal workshop with large roll-up cargo bay | $1 \times 1$ | $40\text{px}$ | *"Isometric 2.5D industrial storage warehouse, metal roll-up door, loading bay, pixel art"* |
| `ind_l2_factory` | Brick manufacturing plant with dual smokestacks | $2 \times 2$ | $80\text{px}$ | *"Isometric 2.5D brick factory with two tall brick smokestacks, industrial piping, pixel art"* |
| `ind_l3_refinery` | Chemical refinery with spherical tanks, steel catwalks | $2 \times 2$ | $100\text{px}$ | *"Isometric 2.5D oil and chemical refinery, silver spherical pressure tanks, steel catwalks, pixel art"* |

---

## 4. Utilities & Municipal Services

| Asset ID | Description | Footprint | Height | PixelLab Prompt Idea |
| :--- | :--- | :--- | :--- | :--- |
| `util_power_coal` | Coal power plant with large cooling tower & coal depot | $2 \times 2$ | $90\text{px}$ | *"Isometric 2.5D coal-fired power plant with wide concrete cooling tower, pixel art"* |
| `util_power_solar` | Field of angled photovoltaic solar panels | $1 \times 1$ | $32\text{px}$ | *"Isometric solar panel array, blue reflective photovoltaic cells, steel frame, pixel art"* |
| `util_water_pump` | Water pump station with large pipes entering water | $1 \times 1$ | $48\text{px}$ | *"Isometric water pumping station, blue reservoir tank, large intake pipes, pixel art"* |
| `service_fire_dept` | Fire station with red garage doors & fire bell tower | $2 \times 2$ | $65\text{px}$ | *"Isometric 2.5D municipal fire station, two red truck bays, clock tower, pixel art"* |
| `service_police` | Police department headquarters with blue beacon light | $2 \times 2$ | $65\text{px}$ | *"Isometric police precinct headquarters, patrol car parking, blue beacon, pixel art"* |
| `service_hospital` | Hospital clinic with emergency ambulance bay & red cross | $2 \times 2$ | $80\text{px}$ | *"Isometric hospital building with emergency entrance, helipad on roof, red cross sign, pixel art"* |
| `service_park_large` | City central park with paved fountain, benches & pine trees | $2 \times 2$ | $50\text{px}$ | *"Isometric city park, stone fountain in center, paved walkway, oak trees and park benches, pixel art"* |

---

## 5. Vehicles (Animated Traffic)

| Asset ID | Description | Views | PixelLab Tool |
| :--- | :--- | :--- | :--- |
| `veh_taxi` | Yellow city cab sedan | 4 diagonal directions | `create_character` (Isometric vehicle) |
| `veh_commuter_sedan` | Compact commuter car (multiple color variations) | 4 diagonal directions | `create_character` |
| `veh_semi_truck` | Highway freight semi-trailer truck with shipping container | 4 diagonal directions | `create_character` |
| `veh_delivery_van` | White delivery parcel van | 4 diagonal directions | `create_character` |
| `veh_police_cruiser` | Police car with flashing blue/red rooftop siren | 4 diagonal directions | `create_character` |
| `veh_fire_engine` | Red emergency ladder fire truck | 4 diagonal directions | `create_character` |

---

## 6. UI & Status Badges
- Floating Alert Icons ($16 \times 16\text{px}$):
  - ⚡ `icon_no_power`: Flashing yellow lightning bolt
  - 💧 `icon_no_water`: Flashing cyan water droplet
  - 🚫 `icon_no_road`: Flashing red road warning
  - 🗑️ `icon_garbage_full`: Trash bin alert
- Retro HUD Icons ($24 \times 24\text{px}$):
  - Bulldozer, Road, Highway, Zone R, Zone C, Zone I, Power, Water, Emergency Services, Park, Inspect.
