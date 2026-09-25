import { Camera } from './core/Camera.ts';
import { Grid } from './simulation/Grid.ts';
import { PixelRenderer } from './rendering/PixelRenderer.ts';
import { SimulationEngine } from './simulation/SimulationEngine.ts';
import { HUD } from './ui/HUD.ts';
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

  let hoverGridX = -1;
  let hoverGridY = -1;
  let isPointerDown = false;
  let pointerButton = 0;

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
      if (tile.type === TileType.WATER) desc = 'River / Deep Water';
      else if (tile.type === TileType.HIGHWAY) desc = 'Interstate 10 (Regional Freeway Connection)';
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
      else if (tile.building) {
        const b = tile.building;
        const fireStatus = b.onFire ? ' 🔥 ON FIRE!' : '';
        const stage = b.isConstructing ? 'Under Construction' : `Tier ${b.level}`;
        const util = `Hwy:${b.hasHighwayAccess ? '✅' : '❌'} P:${b.powered ? '⚡' : '❌'} W:${b.watered ? '💧' : '❌'}`;
        desc = `${b.zone} [${stage}] Pop:${b.residents} Jobs:${b.jobs} (${util})${fireStatus}`;
      } else if (tile.zone !== ZoneType.NONE) {
        desc = `Zoned ${tile.zone} (Awaiting Construction)`;
      }

      hoverDescEl.textContent = desc;
    } else {
      hoverCoordsEl.textContent = `Tile: (Out of bounds)`;
      hoverDescEl.textContent = 'Uncharted Territory';
    }

    if (isPointerDown && pointerButton === 0) {
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
      applyTool(gridX, gridY);
    }
  });

  window.addEventListener('mouseup', () => {
    isPointerDown = false;
    camera.endDrag();
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
        grid.updateRoadAndNeighbors(x, y);
        return;
      }

      if (tile.type !== TileType.GRASS || tile.zone !== ZoneType.NONE || tile.building) {
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
        grid.updateRoadAndNeighbors(x, y);
      }
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
      grid.recalculateServiceCoverages();
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
      grid.recalculateServiceCoverages();
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
      grid.recalculateServiceCoverages();
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
      grid.recalculateServiceCoverages();
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
      grid.recalculateServiceCoverages();
      return;
    }
  }

  // Main Simulation Loop (1 Tick per second)
  setInterval(() => {
    engine.tick();
  }, 1000);

  // Auto-Save every 60 seconds
  setInterval(() => {
    engine.saveToLocalStorage();
  }, 60000);

  // Main Render Loop (60 FPS)
  function loop() {
    renderer.render(hoverGridX, hoverGridY, hud.activeTool);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  hud.showToast("Connect your roads to the Interstate 10 interchange to bring citizens in!");
});
