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

  // Info popup elements
  const hoverCoordsEl = document.getElementById('hover-coords')!;
  const hoverDescEl = document.getElementById('hover-desc')!;

  // Initialize Game Systems
  const grid = new Grid(36);
  const camera = new Camera(window.innerWidth, window.innerHeight - 112, grid.size);
  const renderer = new PixelRenderer(ctx, camera, grid);
  const engine = new SimulationEngine(grid);
  const hud = new HUD(engine);

  let hoverGridX = -1;
  let hoverGridY = -1;
  let isPointerDown = false;
  let pointerButton = 0;

  // Resize canvas to full viewport
  function resize() {
    canvas.width = canvas.parentElement!.clientWidth;
    canvas.height = canvas.parentElement!.clientHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Screen coordinate to canvas offset
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

    // Pan camera if middle button (1) or right button (2) is held
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
      hoverCoordsEl.textContent = `Tile: (${gridX}, ${gridY})`;

      let desc = 'Grassland';
      if (tile.type === TileType.WATER) desc = 'River / Water';
      else if (tile.type === TileType.ROAD) desc = `Paved Road (P:${tile.powered ? '⚡' : '❌'} W:${tile.watered ? '💧' : '❌'})`;
      else if (tile.type === TileType.POWER_PLANT) desc = 'Coal Power Plant (Active)';
      else if (tile.type === TileType.WATER_PUMP) desc = 'Water Pumping Station';
      else if (tile.type === TileType.PARK) desc = 'Public Park (+Land Value)';
      else if (tile.building) {
        const b = tile.building;
        const stage = b.isConstructing ? 'Under Construction' : `Tier ${b.level}`;
        const util = `P:${b.powered ? '⚡' : '❌'} W:${b.watered ? '💧' : '❌'}`;
        desc = `${b.zone} [${stage}] Pop:${b.residents} Jobs:${b.jobs} (${util})`;
      } else if (tile.zone !== ZoneType.NONE) {
        desc = `Zoned ${tile.zone} (Awaiting Construction)`;
      }

      hoverDescEl.textContent = desc;
    } else {
      hoverCoordsEl.textContent = `Tile: (Out of bounds)`;
      hoverDescEl.textContent = 'Uncharted Territory';
    }

    // Continuous painting when left-click dragging
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
      // Middle or Right click: start drag camera
      camera.startDrag(coords.x, coords.y);
    } else if (e.button === 0) {
      // Left click: apply current tool
      const { gridX, gridY } = camera.screenToWorld(coords.x, coords.y);
      applyTool(gridX, gridY);
    }
  });

  // Mouse Up
  window.addEventListener('mouseup', () => {
    isPointerDown = false;
    camera.endDrag();
  });

  // Prevent default context menu so right click can pan freely
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Mouse Wheel Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    camera.zoomAt(zoomFactor, coords.x, coords.y);
  }, { passive: false });

  // Keyboard navigation (WASD or Arrows)
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
      if (tile.type === TileType.WATER) return; // Cannot bulldoze natural river
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

    // Road placement
    if (tool === 'road') {
      if (tile.type === TileType.ROAD || tile.type === TileType.WATER) return;
      if (engine.funds < COSTS.ROAD) {
        sounds.playError();
        hud.showToast("Not enough funds for road!");
        return;
      }

      engine.funds -= COSTS.ROAD;
      sounds.playBuild();
      tile.type = TileType.ROAD;
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
      return;
    }
  }

  // Main Simulation Loop (Fixed Timestep)
  setInterval(() => {
    engine.tick();
  }, 1000);

  // Main Render Loop (60 FPS)
  function loop() {
    renderer.render(hoverGridX, hoverGridY, hud.activeTool);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  hud.showToast("Welcome to Pixel City! Lay roads and zone areas to start.");
});
