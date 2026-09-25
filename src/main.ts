import { Camera } from './core/Camera.ts';
import { Grid } from './simulation/Grid.ts';
import { PixelRenderer } from './rendering/PixelRenderer.ts';
import { SimulationEngine } from './simulation/SimulationEngine.ts';
import { HUD } from './ui/HUD.ts';
import { MiniMap } from './ui/MiniMap.ts';
import { SnapshotTool } from './ui/SnapshotTool.ts';
import { TileType, ZoneType, COSTS } from './core/Constants.ts';
import { sounds } from './core/SoundEffects.ts';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const hoverCoordsEl = document.getElementById('hover-coords')!;
  const hoverDescEl = document.getElementById('hover-desc')!;

  // Initialize Game Systems
  const grid = new Grid();
  const engine = new SimulationEngine(grid);
  const camera = new Camera(window.innerWidth, window.innerHeight - 112, grid.size);
  const renderer = new PixelRenderer(ctx, camera, grid, engine);
  const hud = new HUD(engine);

  // Initialize Snapshot Tool
  const snapshotTool = new SnapshotTool(canvas, engine, (msg) => hud.showToast(msg));
  hud.snapshotTool = snapshotTool;

  // Screen shake on disaster start
  engine.onDisasterStarted = (type) => {
    if (type === 'EARTHQUAKE') {
      camera.shake(12, 90);
    } else if (type === 'METEOR') {
      camera.shake(8, 45);
    } else if (type === 'TORNADO') {
      camera.shake(5, 45);
    }
  };

  // Initialize soundscape on first interaction
  const initAudioOnFirstGesture = () => {
    sounds.initCtx();
    sounds.startAmbientLoop();
    window.removeEventListener('pointerdown', initAudioOnFirstGesture);
    window.removeEventListener('keydown', initAudioOnFirstGesture);
  };
  window.addEventListener('pointerdown', initAudioOnFirstGesture);
  window.addEventListener('keydown', initAudioOnFirstGesture);

  // Initialize Radar Mini-Map
  const minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
  const minimapContainer = document.getElementById('minimap-container')!;
  const minimapToggle = document.getElementById('minimap-toggle') as HTMLButtonElement;
  const minimap = new MiniMap(minimapCanvas, minimapContainer, minimapToggle, grid, camera);

  let hoverGridX = -1;
  let hoverGridY = -1;
  let isPointerDown = false;
  let pointerButton = 0;

  // Drag-to-build state
  let isDraggingTool = false;
  let dragStartGridX = -1;
  let dragStartGridY = -1;
  let dragCurrentGridX = -1;
  let dragCurrentGridY = -1;

  function isDragTool(tool: string): boolean {
    return tool.startsWith('zone-') || tool === 'road' || tool === 'dirt-road' || tool === 'avenue' || tool === 'train-track' || tool === 'demolish';
  }

  function resize() {
    canvas.width = canvas.parentElement!.clientWidth;
    canvas.height = canvas.parentElement!.clientHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function getCanvasCoords(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // Mouse Movement
  canvas.addEventListener('mousemove', (e) => {
    const coords = getCanvasCoords(e);

    if (camera.isCurrentlyDragging()) {
      camera.drag(coords.x, coords.y);
      return;
    }

    const { gridX, gridY } = camera.screenToWorld(coords.x, coords.y);
    hoverGridX = gridX;
    hoverGridY = gridY;

    // Update Hover Info Box
    const tile = grid.getTile(gridX, gridY);
    if (tile) {
      hoverCoordsEl.textContent = `Tile: (${gridX}, ${gridY}) • Val:$${tile.landValue}`;

      let desc = 'Grassland';
      if (tile.isRubble) desc = '🏚️ Ruins & Rubble (Use Demolish tool or Emergency Cleanup to clear)';
      else if (tile.damaged) desc = '🚧 Fractured Roadway (Demolish to clear or use Cleanup)';
      else if (tile.type === TileType.WATER) desc = 'River / Deep Water';
      else if (tile.type === TileType.HIGHWAY) desc = 'Interstate 10 (Regional Freeway Connection)';
      else if (tile.type === TileType.DIRT_ROAD) {
        const roadType = tile.isBridge ? 'Timber Trestle Bridge' : 'Country Dirt Road';
        desc = `${roadType} (Hwy:${tile.connectedToHighway ? '✅' : '❌'} P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      }
      else if (tile.type === TileType.AVENUE) {
        const roadType = tile.isBridge ? 'Cable-Stayed Concrete Bridge' : 'Downtown Avenue (4-Lane Boulevard)';
        desc = `${roadType} (Hwy:${tile.connectedToHighway ? '✅' : '❌'} P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      }
      else if (tile.type === TileType.ROAD) {
        const roadType = tile.isBridge ? 'Steel Truss Bridge' : 'Paved Road';
        desc = `${roadType} (Hwy:${tile.connectedToHighway ? '✅' : '❌'} P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      }
      else if (tile.type === TileType.FIRE_STATION) desc = 'Municipal Fire Station (Coverage: 14 tiles)';
      else if (tile.type === TileType.POLICE_STATION) desc = 'Police Precinct Headquarters (Suppresses Crime)';
      else if (tile.type === TileType.HOSPITAL) desc = 'City Hospital & Emergency Clinic (Health Boost)';
      else if (tile.type === TileType.SCHOOL) desc = 'Elementary & High School (Education Boost)';
      else if (tile.type === TileType.POWER_PLANT) desc = 'Coal Power Plant (Active Grid)';
      else if (tile.type === TileType.WATER_PUMP) desc = 'Water Pumping Station';
      else if (tile.type === TileType.PARK) desc = 'Public Park (+30 Land Value)';
      else if (tile.type === TileType.BUS_DEPOT) desc = `Municipal Bus Depot (Fleet Dispatch HQ • Upkeep $15/mo • P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      else if (tile.type === TileType.BUS_STOP) desc = `Roadside Bus Stop (Radius: 8 • Transit Cov: ${tile.transitCoverage}% • Upkeep $1/mo)`;
      else if (tile.type === TileType.TRAIN_STATION) desc = `Passenger Train Station (Radius: 14 • Rail Ridership: ${engine.trainRidership} • Upkeep $25/mo • P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      else if (tile.type === TileType.TRAIN_TRACK) {
        const trackType = tile.isBridge ? 'Steel Railroad Trestle Bridge' : 'Railroad Track';
        desc = `${trackType} (Transit Cov: ${tile.transitCoverage}% • Upkeep $0.15/mo)`;
      }
      else if (tile.type === TileType.MAYORS_MANSION) desc = `Mayor's Historic Mansion (Civic Landmark • +10 City Demand • +25 Land Value • Upkeep $20/mo • P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      else if (tile.type === TileType.CITY_HALL) desc = `Majestic City Hall (Seat of Municipal Govt • -10% All City Upkeeps • +35 Land Value • Upkeep $50/mo • P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      else if (tile.type === TileType.GRAND_CENTRAL) desc = `Grand Central Terminal (Metropolitan Transit Monument • +25 Commercial Demand • Upkeep $100/mo • P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      else if (tile.building) {
        const b = tile.building;
        const fireStatus = b.onFire ? ' 🔥 ON FIRE!' : '';
        const buildingNames: Record<ZoneType, Record<number, string>> = {
          [ZoneType.RESIDENTIAL]: {
            1: 'Suburban Cottage',
            2: 'Brick Townhouse',
            3: 'Apartment Block',
            4: 'Luxury High-Rise Condos',
            5: 'Apex Glass Megatower'
          },
          [ZoneType.COMMERCIAL]: {
            1: 'Corner Diner & Shops',
            2: 'Commercial Office Block',
            3: 'Modern Business Tower',
            4: 'Corporate Financial Plaza',
            5: 'World Trade Megatower'
          },
          [ZoneType.INDUSTRIAL]: {
            1: 'Industrial Warehouse',
            2: 'Assembly Plant & Factory',
            3: 'Heavy Manufacturing Center',
            4: 'Clean High-Tech Research Campus',
            5: 'Aerospace & Robotics Megafactory'
          },
          [ZoneType.NONE]: { 1: '', 2: '', 3: '', 4: '', 5: '' }
        };
        const title = buildingNames[b.zone]?.[b.level] || `${b.zone} Tier ${b.level}`;
        const stage = b.isConstructing ? 'Under Construction' : `Tier ${b.level}: ${title}`;
        const util = `Hwy:${b.hasHighwayAccess ? '✅' : '❌'} P:${b.powered ? '⚡' : '❌'} W:${b.watered ? '💧' : '❌'}`;
        desc = `[${stage}] Pop:${b.residents} Jobs:${b.jobs} (${util})${fireStatus}`;
      } else if (tile.zone !== ZoneType.NONE) {
        desc = `Zoned ${tile.zone} (Awaiting Construction)`;
      }

      hoverDescEl.textContent = desc;
    } else {
      hoverCoordsEl.textContent = `Tile: (Out of bounds)`;
      hoverDescEl.textContent = 'Uncharted Territory';
    }

    if (isDraggingTool) {
      dragCurrentGridX = gridX;
      dragCurrentGridY = gridY;
    } else if (isPointerDown && pointerButton === 0) {
      applyTool(gridX, gridY);
    }
  });

  // Mouse Down
  canvas.addEventListener('mousedown', (e) => {
    isPointerDown = true;
    pointerButton = e.button;
    const coords = getCanvasCoords(e);

    if (e.button === 1 || e.button === 2) {
      camera.startDrag(coords.x, coords.y);
    } else if (e.button === 0) {
      const { gridX, gridY } = camera.screenToWorld(coords.x, coords.y);
      if (isDragTool(hud.activeTool)) {
        isDraggingTool = true;
        dragStartGridX = gridX;
        dragStartGridY = gridY;
        dragCurrentGridX = gridX;
        dragCurrentGridY = gridY;
      } else {
        applyTool(gridX, gridY);
      }
    }
  });

  window.addEventListener('mouseup', () => {
    isPointerDown = false;
    camera.endDrag();

    if (isDraggingTool) {
      const tool = hud.activeTool;

      if (dragStartGridX === dragCurrentGridX && dragStartGridY === dragCurrentGridY) {
        applyTool(dragStartGridX, dragStartGridY);
      } else if (tool === 'road' || tool === 'dirt-road' || tool === 'avenue' || tool === 'train-track') {
        // Line road dragging along dominant axis
        const dx = dragCurrentGridX - dragStartGridX;
        const dy = dragCurrentGridY - dragStartGridY;
        if (Math.abs(dx) >= Math.abs(dy)) {
          const step = dx >= 0 ? 1 : -1;
          for (let x = dragStartGridX; x !== dragCurrentGridX + step; x += step) {
            applyTool(x, dragStartGridY);
          }
        } else {
          const step = dy >= 0 ? 1 : -1;
          for (let y = dragStartGridY; y !== dragCurrentGridY + step; y += step) {
            applyTool(dragStartGridX, y);
          }
        }
      } else if (isDragTool(tool)) {
        // Rectangle mass zoning / mass demolition
        const minX = Math.min(dragStartGridX, dragCurrentGridX);
        const maxX = Math.max(dragStartGridX, dragCurrentGridX);
        const minY = Math.min(dragStartGridY, dragCurrentGridY);
        const maxY = Math.max(dragStartGridY, dragCurrentGridY);

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            applyTool(x, y);
          }
        }
      }

      isDraggingTool = false;
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    camera.zoomAt(zoomFactor, coords.x, coords.y);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const panSpeed = 30;
    if (e.key === 'w' || e.key === 'ArrowUp') camera.y += panSpeed;
    if (e.key === 's' || e.key === 'ArrowDown') camera.y -= panSpeed;
    if (e.key === 'a' || e.key === 'ArrowLeft') camera.x += panSpeed;
    if (e.key === 'd' || e.key === 'ArrowRight') camera.x -= panSpeed;
  });

  // Apply Tool to Tile
  function applyTool(x: number, y: number) {
    const tile = grid.getTile(x, y);
    if (!tile) return;

    const tool = hud.activeTool;

    if (tool === 'inspect') {
      return;
    }

    // Bulldozer
    if (tool === 'demolish') {
      if (tile.type === TileType.HIGHWAY) {
        sounds.playError();
        hud.showToast("Cannot bulldoze Interstate 10! It's state property.");
        return;
      }

      // Demolishing Bridge over river reverts to Water
      if (tile.isBridge) {
        if (engine.funds < COSTS.DEMOLISH) {
          sounds.playError();
          return;
        }
        engine.funds -= COSTS.DEMOLISH;
        sounds.playDemolish();
        tile.type = TileType.WATER;
        tile.elevation = -1;
        tile.isBridge = false;
        tile.building = undefined;
        tile.isRubble = false;
        tile.damaged = false;
        grid.updateRoadAndNeighbors(x, y);
        engine.updateUtilities();
        grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
        return;
      }

      if (tile.type !== TileType.GRASS || tile.zone !== ZoneType.NONE || tile.building || tile.isRubble || tile.damaged) {
        if (engine.funds < COSTS.DEMOLISH) {
          sounds.playError();
          hud.showToast("Not enough funds to bulldoze!");
          return;
        }
        engine.funds -= COSTS.DEMOLISH;
        sounds.playDemolish();

        tile.type = TileType.GRASS;
        tile.zone = ZoneType.NONE;
        tile.building = undefined;
        tile.isRubble = false;
        tile.damaged = false;
        grid.updateRoadAndNeighbors(x, y);
        engine.updateUtilities();
        engine.updateRewardMetrics();
        engine.updateTransitMetrics();
        grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      }
      return;
    }

    // Dirt Road & Timber Bridge placement
    if (tool === 'dirt-road') {
      if (tile.type === TileType.DIRT_ROAD || tile.type === TileType.HIGHWAY) return;

      const isWater = tile.type === TileType.WATER;
      const cost = isWater ? COSTS.DIRT_BRIDGE : COSTS.DIRT_ROAD;

      if (engine.funds < cost) {
        sounds.playError();
        hud.showToast(isWater ? "Not enough funds for Timber Bridge ($25)!" : "Not enough funds for Dirt Road ($5)!");
        return;
      }

      engine.funds -= cost;
      sounds.playBuild();
      tile.type = TileType.DIRT_ROAD;
      tile.isBridge = isWater;
      tile.elevation = 0;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.updateRoadAndNeighbors(x, y);
      engine.updateUtilities();
      return;
    }

    // Road & Bridge placement
    if (tool === 'road') {
      if (tile.type === TileType.ROAD || tile.type === TileType.HIGHWAY) return;

      const isWater = tile.type === TileType.WATER;
      const cost = isWater ? COSTS.BRIDGE : COSTS.ROAD;

      if (engine.funds < cost) {
        sounds.playError();
        hud.showToast(isWater ? "Not enough funds for Bridge ($50)!" : "Not enough funds for Road ($10)!");
        return;
      }

      engine.funds -= cost;
      sounds.playBuild();
      tile.type = TileType.ROAD;
      tile.isBridge = isWater;
      tile.elevation = 0;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.updateRoadAndNeighbors(x, y);
      engine.updateUtilities();
      return;
    }

    // Downtown Avenue & Cable Bridge placement
    if (tool === 'avenue') {
      if (tile.type === TileType.AVENUE || tile.type === TileType.HIGHWAY) return;

      const isWater = tile.type === TileType.WATER;
      const cost = isWater ? COSTS.AVENUE_BRIDGE : COSTS.AVENUE;

      if (engine.funds < cost) {
        sounds.playError();
        hud.showToast(isWater ? "Not enough funds for Cable Bridge ($100)!" : "Not enough funds for Avenue ($25)!");
        return;
      }

      engine.funds -= cost;
      sounds.playBuild();
      tile.type = TileType.AVENUE;
      tile.isBridge = isWater;
      tile.elevation = 0;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.updateRoadAndNeighbors(x, y);
      engine.updateUtilities();
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // Residential Zone
    if (tool === 'zone-r') {
      if (tile.type !== TileType.GRASS || tile.zone === ZoneType.RESIDENTIAL) return;
      if (engine.funds < COSTS.ZONE) {
        sounds.playError();
        hud.showToast("Not enough funds to zone!");
        return;
      }
      engine.funds -= COSTS.ZONE;
      sounds.playBuild();
      tile.zone = ZoneType.RESIDENTIAL;
      return;
    }

    // Commercial Zone
    if (tool === 'zone-c') {
      if (tile.type !== TileType.GRASS || tile.zone === ZoneType.COMMERCIAL) return;
      if (engine.funds < COSTS.ZONE) {
        sounds.playError();
        hud.showToast("Not enough funds to zone!");
        return;
      }
      engine.funds -= COSTS.ZONE;
      sounds.playBuild();
      tile.zone = ZoneType.COMMERCIAL;
      return;
    }

    // Industrial Zone
    if (tool === 'zone-i') {
      if (tile.type !== TileType.GRASS || tile.zone === ZoneType.INDUSTRIAL) return;
      if (engine.funds < COSTS.ZONE) {
        sounds.playError();
        hud.showToast("Not enough funds to zone!");
        return;
      }
      engine.funds -= COSTS.ZONE;
      sounds.playBuild();
      tile.zone = ZoneType.INDUSTRIAL;
      return;
    }

    // Power Plant
    if (tool === 'power-plant') {
      if (tile.type !== TileType.GRASS) return;
      if (engine.funds < COSTS.POWER_PLANT) {
        sounds.playError();
        hud.showToast("Not enough funds for Power Plant!");
        return;
      }
      engine.funds -= COSTS.POWER_PLANT;
      sounds.playBuild();
      tile.type = TileType.POWER_PLANT;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      engine.updateUtilities();
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // Water Pump
    if (tool === 'water-pump') {
      if (tile.type !== TileType.GRASS) return;
      if (engine.funds < COSTS.WATER_PUMP) {
        sounds.playError();
        hud.showToast("Not enough funds for Water Pump!");
        return;
      }
      engine.funds -= COSTS.WATER_PUMP;
      sounds.playBuild();
      tile.type = TileType.WATER_PUMP;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      engine.updateUtilities();
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // Fire Station
    if (tool === 'fire-station') {
      if (tile.type !== TileType.GRASS) return;
      if (engine.funds < COSTS.FIRE_STATION) {
        sounds.playError();
        hud.showToast("Not enough funds for Fire Station!");
        return;
      }
      engine.funds -= COSTS.FIRE_STATION;
      sounds.playBuild();
      tile.type = TileType.FIRE_STATION;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // Police Station
    if (tool === 'police-station') {
      if (tile.type !== TileType.GRASS) return;
      if (engine.funds < COSTS.POLICE_STATION) {
        sounds.playError();
        hud.showToast("Not enough funds for Police Station!");
        return;
      }
      engine.funds -= COSTS.POLICE_STATION;
      sounds.playBuild();
      tile.type = TileType.POLICE_STATION;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // Hospital / Clinic
    if (tool === 'hospital') {
      if (tile.type !== TileType.GRASS) return;
      if (engine.funds < COSTS.HOSPITAL) {
        sounds.playError();
        hud.showToast("Not enough funds for Clinic/Hospital!");
        return;
      }
      engine.funds -= COSTS.HOSPITAL;
      sounds.playBuild();
      tile.type = TileType.HOSPITAL;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // School
    if (tool === 'school') {
      if (tile.type !== TileType.GRASS) return;
      if (engine.funds < COSTS.SCHOOL) {
        sounds.playError();
        hud.showToast("Not enough funds for School!");
        return;
      }
      engine.funds -= COSTS.SCHOOL;
      sounds.playBuild();
      tile.type = TileType.SCHOOL;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // Public Park
    if (tool === 'park') {
      if (tile.type !== TileType.GRASS) return;
      if (engine.funds < COSTS.PARK) {
        sounds.playError();
        hud.showToast("Not enough funds for Park!");
        return;
      }
      engine.funds -= COSTS.PARK;
      sounds.playBuild();
      tile.type = TileType.PARK;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // Municipal Bus Depot
    if (tool === 'bus-depot') {
      if (tile.type !== TileType.GRASS) return;
      if (engine.funds < COSTS.BUS_DEPOT) {
        sounds.playError();
        hud.showToast("Not enough funds for Bus Depot ($400)!");
        return;
      }
      engine.funds -= COSTS.BUS_DEPOT;
      sounds.playBuild();
      tile.type = TileType.BUS_DEPOT;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      engine.updateUtilities();
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      return;
    }

    // Roadside Bus Stop
    if (tool === 'bus-stop') {
      if (tile.type !== TileType.GRASS && tile.type !== TileType.DIRT) return;
      if (engine.funds < COSTS.BUS_STOP) {
        sounds.playError();
        hud.showToast("Not enough funds for Bus Stop ($50)!");
        return;
      }
      engine.funds -= COSTS.BUS_STOP;
      sounds.playBuild();
      tile.type = TileType.BUS_STOP;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      engine.updateTransitMetrics();
      return;
    }

    // Passenger Train Station
    if (tool === 'train-station') {
      if (tile.type !== TileType.GRASS && tile.type !== TileType.DIRT) return;
      if (engine.funds < COSTS.TRAIN_STATION) {
        sounds.playError();
        hud.showToast("Not enough funds for Train Station ($750)!");
        return;
      }
      engine.funds -= COSTS.TRAIN_STATION;
      sounds.playBuild();
      sounds.playTrainHorn();
      tile.type = TileType.TRAIN_STATION;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      engine.updateUtilities();
      grid.updateRoadAndNeighbors(x, y);
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      engine.updateTransitMetrics();
      return;
    }

    // Heavy Railroad Track
    if (tool === 'train-track') {
      // Over water -> Railroad bridge
      if (tile.type === TileType.WATER) {
        const bridgeCost = 45; // railroad trestle bridge
        if (engine.funds < bridgeCost) {
          sounds.playError();
          hud.showToast("Not enough funds for Railroad Bridge ($45)!");
          return;
        }
        engine.funds -= bridgeCost;
        sounds.playBuild();
        sounds.playTrainChug();
        tile.type = TileType.TRAIN_TRACK;
        tile.isBridge = true;
        tile.elevation = 0;
        tile.zone = ZoneType.NONE;
        tile.building = undefined;
        grid.updateRoadAndNeighbors(x, y);
        engine.updateUtilities();
        grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
        engine.updateTransitMetrics();
        return;
      }

      if (tile.type !== TileType.GRASS && tile.type !== TileType.DIRT) return;
      if (engine.funds < COSTS.TRAIN_TRACK) {
        sounds.playError();
        hud.showToast("Not enough funds for Railroad Track ($15)!");
        return;
      }
      engine.funds -= COSTS.TRAIN_TRACK;
      sounds.playBuild();
      tile.type = TileType.TRAIN_TRACK;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      grid.updateRoadAndNeighbors(x, y);
      engine.updateUtilities();
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      engine.updateTransitMetrics();
      return;
    }

    // Mayor's Historic Mansion
    if (tool === 'mayors-mansion') {
      if (tile.type !== TileType.GRASS) return;
      if (!engine.unlockedMilestones.includes('town')) {
        sounds.playError();
        hud.showToast("🔒 Mayor's Mansion requires Booming Town (500 Pop) to unlock!");
        return;
      }
      if (engine.funds < COSTS.MAYORS_MANSION) {
        sounds.playError();
        hud.showToast("Not enough funds for Mayor's Mansion ($1,000)!");
        return;
      }
      engine.funds -= COSTS.MAYORS_MANSION;
      sounds.playBuild();
      sounds.playCivicCheer();
      tile.type = TileType.MAYORS_MANSION;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      engine.updateUtilities();
      engine.updateRewardMetrics();
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      hud.showToast("🏛️ The Mayor's Historic Mansion has been inaugurated! (+10 Demand, +25 Land Value)");
      return;
    }

    // Majestic City Hall
    if (tool === 'city-hall') {
      if (tile.type !== TileType.GRASS) return;
      if (!engine.unlockedMilestones.includes('city')) {
        sounds.playError();
        hud.showToast("🔒 City Hall requires Prosperous City (1,500 Pop) to unlock!");
        return;
      }
      if (engine.funds < COSTS.CITY_HALL) {
        sounds.playError();
        hud.showToast("Not enough funds for City Hall ($2,500)!");
        return;
      }
      engine.funds -= COSTS.CITY_HALL;
      sounds.playBuild();
      sounds.playCivicCheer();
      tile.type = TileType.CITY_HALL;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      engine.updateUtilities();
      engine.updateRewardMetrics();
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      hud.showToast("🏛️ Majestic City Hall established! (-10% Municipal Department Expenses)");
      return;
    }

    // Grand Central Terminal
    if (tool === 'grand-central') {
      if (tile.type !== TileType.GRASS) return;
      if (!engine.unlockedMilestones.includes('metropolis')) {
        sounds.playError();
        hud.showToast("🔒 Grand Central requires Grand Metropolis (5,000 Pop) to unlock!");
        return;
      }
      if (engine.funds < COSTS.GRAND_CENTRAL) {
        sounds.playError();
        hud.showToast("Not enough funds for Grand Central Terminal ($5,000)!");
        return;
      }
      engine.funds -= COSTS.GRAND_CENTRAL;
      sounds.playBuild();
      sounds.playCivicCheer();
      tile.type = TileType.GRAND_CENTRAL;
      tile.zone = ZoneType.NONE;
      tile.building = undefined;
      engine.updateUtilities();
      engine.updateRewardMetrics();
      engine.updateTransitMetrics();
      grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
      hud.showToast("🚉 Grand Central Terminal opened! (+25 Commercial Demand, Max Transit Reach)");
      return;
    }
  }

  // Main Simulation Loop (1 Tick per second)
  setInterval(() => {
    engine.tick();

    // Dynamically update procedural city ambient soundscape
    let activeFires = 0;
    for (let x = 0; x < grid.size; x++) {
      for (let y = 0; y < grid.size; y++) {
        if (grid.tiles[x][y].building?.onFire) activeFires++;
      }
    }
    sounds.updateAmbient(engine.population, engine.totalIndustrialJobs, engine.gameHour, activeFires, engine.weather);
  }, 1000);

  // Auto-Save every 60 seconds
  setInterval(() => {
    engine.saveToLocalStorage();
  }, 60000);

  // Main Render Loop (60 FPS)
  function loop() {
    const dragPreview = isDraggingTool && isDragTool(hud.activeTool) ? {
      tool: hud.activeTool,
      startX: dragStartGridX,
      startY: dragStartGridY,
      endX: dragCurrentGridX,
      endY: dragCurrentGridY
    } : undefined;

    renderer.render(hoverGridX, hoverGridY, hud.activeTool, dragPreview);
    minimap.render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Expose for testing and debugging
  (window as unknown as { game: unknown }).game = { engine, grid, camera, hud, applyTool, snapshotTool, sounds, renderer };

  hud.showToast("Connect your roads to the Interstate 10 interchange to bring citizens in!");
});
