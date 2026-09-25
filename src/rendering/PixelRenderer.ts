import { TILE_WIDTH, TILE_HEIGHT, TileType, ZoneType, Tile, OverlayMode, WeatherType, isAnyRoad } from '../core/Constants.ts';
import { Camera } from '../core/Camera.ts';
import { Grid } from '../simulation/Grid.ts';
import { SimulationEngine } from '../simulation/SimulationEngine.ts';
import { assetManager } from './AssetManager.ts';
import { sounds } from '../core/SoundEffects.ts';

export interface DragPreview {
  tool: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Vehicle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  speed: number;
  isTruck?: boolean;
  isEmergency?: 'fire' | 'police';
}

export class PixelRenderer {
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private grid: Grid;
  private engine: SimulationEngine;
  private animFrame: number = 0;
  private particles: Particle[] = [];
  private vehicles: Vehicle[] = [];
  private rainDrops: { x: number; y: number; speed: number; len: number }[] = [];
  private lightningFlash: number = 0;

  constructor(ctx: CanvasRenderingContext2D, camera: Camera, grid: Grid, engine: SimulationEngine) {
    this.ctx = ctx;
    this.camera = camera;
    this.grid = grid;
    this.engine = engine;
  }

  public render(hoverGridX: number, hoverGridY: number, activeTool: string, dragPreview?: DragPreview) {
    this.animFrame++;
    const { width, height } = this.ctx.canvas;

    // Background color
    this.ctx.fillStyle = '#14141e';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.imageSmoothingEnabled = false;

    // Depth Sorting: Render tiles in order of (x + y) from back to front
    const totalTiles = this.grid.size;
    for (let sum = 0; sum <= (totalTiles - 1) * 2; sum++) {
      for (let x = 0; x < totalTiles; x++) {
        const y = sum - x;
        if (y < 0 || y >= totalTiles) continue;

        const tile = this.grid.getTile(x, y);
        if (!tile) continue;

        this.renderTile(tile);

        if (!dragPreview && x === hoverGridX && y === hoverGridY) {
          this.renderHoverHighlight(tile, activeTool);
        }
      }
    }

    // Render Drag-to-build highlight preview and dimension badge
    if (dragPreview) {
      this.renderDragPreview(dragPreview);
    }

    // Render vehicles on roads and highway
    this.updateAndRenderVehicles();

    // Render fire & smoke particles
    this.updateAndRenderParticles();

    // Apply Day / Night lighting atmosphere & glowing street lights
    this.applyDayNightLighting(width, height);

    // Apply Weather atmosphere & rain / lightning effects
    this.renderWeatherAtmosphere(width, height);
  }

  private renderTile(tile: Tile) {
    const { x: sx, y: sy } = this.camera.worldToScreen(tile.x, tile.y, tile.elevation);
    const halfW = (TILE_WIDTH / 2) * this.camera.zoom;
    const halfH = (TILE_HEIGHT / 2) * this.camera.zoom;

    const margin = 140 * this.camera.zoom;
    if (
      sx + halfW < -margin ||
      sx - halfW > this.ctx.canvas.width + margin ||
      sy + halfH < -margin ||
      sy - halfH > this.ctx.canvas.height + margin
    ) {
      return;
    }

    // 1. Render Base Ground / Water
    if (tile.type === TileType.WATER || tile.isBridge) {
      this.drawWaterTile(sx, sy, halfW, halfH, tile.variant);
    } else {
      this.drawGrassTile(sx, sy, halfW, halfH, tile.variant);
    }

    // 2. Data Heatmap Overlays
    if (this.engine.overlayMode !== OverlayMode.NORMAL) {
      this.drawOverlayHeatmap(sx, sy, halfW, halfH, tile);
    }

    // 3. Render Zone Overlays
    if (tile.zone !== ZoneType.NONE && !tile.building) {
      this.drawZoneOverlay(sx, sy, halfW, halfH, tile.zone);

      // Warning badge if disconnected!
      const hasRoad = this.grid.isAdjacentToRoad(tile.x, tile.y);
      const hasHwy = this.grid.isAdjacentToHighwayConnectedRoad(tile.x, tile.y);
      if (!hasRoad && (this.animFrame % 60 < 40)) {
        this.drawWarningIcon(sx, sy - 15 * this.camera.zoom, '🚫', '#ef4444');
      } else if (!hasHwy && (this.animFrame % 60 < 40)) {
        this.drawWarningIcon(sx, sy - 15 * this.camera.zoom, '⚠️', '#f59e0b');
      }
    }

    // 4. Render Highway & Bridges & Roads
    if (tile.type === TileType.HIGHWAY) {
      this.drawHighwayTile(sx, sy, halfW, halfH, tile);
    } else if (tile.type === TileType.ROAD || tile.type === TileType.DIRT_ROAD || tile.type === TileType.AVENUE) {
      if (tile.isBridge) {
        this.drawBridgeTile(sx, sy, halfW, halfH, tile.roadMask, tile.type);
      } else {
        this.drawRoadTile(sx, sy, halfW, halfH, tile.roadMask, tile.connectedToHighway, tile.type);
      }
    }

    // 5. Render Structures & Municipal Services
    if (tile.type === TileType.PARK) {
      this.drawPark(sx, sy, halfW, halfH, tile.variant);
    } else if (tile.type === TileType.POWER_PLANT) {
      this.drawPowerPlant(sx, sy, halfW, halfH);
    } else if (tile.type === TileType.WATER_PUMP) {
      this.drawWaterPump(sx, sy, halfW, halfH);
    } else if (tile.type === TileType.FIRE_STATION) {
      this.drawFireStation(sx, sy, halfW, halfH);
    } else if (tile.type === TileType.POLICE_STATION) {
      this.drawPoliceStation(sx, sy, halfW, halfH);
    } else if (tile.type === TileType.HOSPITAL) {
      this.drawHospital(sx, sy, halfW, halfH);
    } else if (tile.type === TileType.SCHOOL) {
      this.drawSchool(sx, sy, halfW, halfH);
    } else if (tile.building) {
      this.drawBuilding(sx, sy, halfW, halfH, tile);
    }
  }

  /**
   * Heatmap Overlay Layer
   */
  private drawOverlayHeatmap(sx: number, sy: number, hw: number, hh: number, tile: Tile) {
    const ctx = this.ctx;
    let color: string | null = null;
    const mode = this.engine.overlayMode;

    if (mode === OverlayMode.POWER) {
      color = tile.powered ? 'rgba(56, 189, 248, 0.45)' : 'rgba(239, 68, 68, 0.35)';
    } else if (mode === OverlayMode.WATER) {
      color = tile.watered ? 'rgba(59, 130, 246, 0.45)' : 'rgba(107, 114, 128, 0.35)';
    } else if (mode === OverlayMode.FIRE) {
      const cov = tile.fireCoverage / 100;
      color = cov > 0.4 ? `rgba(34, 197, 94, ${cov * 0.5})` : `rgba(239, 68, 68, ${(1 - cov) * 0.45})`;
    } else if (mode === OverlayMode.CRIME) {
      const c = tile.crime / 100;
      color = c > 0.1 ? `rgba(220, 38, 38, ${c * 0.6})` : `rgba(34, 197, 94, 0.2)`;
    } else if (mode === OverlayMode.LAND_VALUE) {
      const lv = Math.min(1, tile.landValue / 80);
      color = `rgba(234, 179, 8, ${lv * 0.6})`;
    } else if (mode === OverlayMode.POLLUTION) {
      const pol = tile.pollution / 100;
      color = pol > 0.05 ? `rgba(168, 85, 247, ${pol * 0.65})` : null;
    }

    if (color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh);
      ctx.lineTo(sx + hw, sy);
      ctx.lineTo(sx, sy + hh);
      ctx.lineTo(sx - hw, sy);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawGrassTile(sx: number, sy: number, hw: number, hh: number, variant: number) {
    const ctx = this.ctx;
    const slabHeight = 8 * this.camera.zoom;

    ctx.fillStyle = '#2d5a27';
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx, sy + hh + slabHeight);
    ctx.lineTo(sx - hw, sy + slabHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e3f1a';
    ctx.beginPath();
    ctx.moveTo(sx, sy + hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx + hw, sy + slabHeight);
    ctx.lineTo(sx, sy + hh + slabHeight);
    ctx.closePath();
    ctx.fill();

    const grassColors = ['#448937', '#4b963d', '#3f8033', '#478f39'];
    ctx.fillStyle = grassColors[variant % grassColors.length];
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#38732e';
    ctx.lineWidth = Math.max(1, 1 * this.camera.zoom);
    ctx.stroke();

    if (this.camera.zoom >= 0.8) {
      ctx.fillStyle = '#57ac47';
      const speckX = sx + ((variant * 7) % 15 - 7) * this.camera.zoom;
      const speckY = sy + ((variant * 11) % 7 - 3) * this.camera.zoom;
      ctx.fillRect(speckX, speckY, 2 * this.camera.zoom, 2 * this.camera.zoom);
    }
  }

  private drawWaterTile(sx: number, sy: number, hw: number, hh: number, variant: number) {
    const ctx = this.ctx;

    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = Math.max(1, 1 * this.camera.zoom);
    ctx.stroke();

    const waveShift = ((this.animFrame / 15 + variant) % 1);
    ctx.fillStyle = '#60a5fa';
    const waveY = sy - hh / 2 + waveShift * hh;
    ctx.fillRect(sx - hw / 3, waveY, (hw * 2) / 3, 2 * this.camera.zoom);
  }

  /**
   * Steel Truss Bridge over Water
  /**
   * Bridges over Water (Timber Trestle, Steel Truss, or Cable-Stayed Concrete)
   */
  private drawBridgeTile(sx: number, sy: number, hw: number, hh: number, mask: number, roadType: TileType = TileType.ROAD) {
    const ctx = this.ctx;
    const z = this.camera.zoom;

    if (roadType === TileType.DIRT_ROAD) {
      // 1. Timber Trestle Bridge (Rustic wooden pilings, timber deck, log railings)
      ctx.fillStyle = '#452b11';
      ctx.fillRect(sx - 5 * z, sy + hh * 0.4, 3 * z, 14 * z);
      ctx.fillRect(sx + 2 * z, sy + hh * 0.4, 3 * z, 14 * z);

      // Wooden cross braces
      ctx.strokeStyle = '#38220d';
      ctx.lineWidth = 1.5 * z;
      ctx.beginPath();
      ctx.moveTo(sx - 5 * z, sy + hh * 0.4);
      ctx.lineTo(sx + 5 * z, sy + hh * 0.4 + 14 * z);
      ctx.moveTo(sx + 5 * z, sy + hh * 0.4);
      ctx.lineTo(sx - 5 * z, sy + hh * 0.4 + 14 * z);
      ctx.stroke();

      // Wooden Plank Deck
      ctx.fillStyle = '#785028';
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh * 0.75);
      ctx.lineTo(sx + hw * 0.75, sy);
      ctx.lineTo(sx, sy + hh * 0.75);
      ctx.lineTo(sx - hw * 0.75, sy);
      ctx.closePath();
      ctx.fill();

      // Rustic Timber Railings
      ctx.strokeStyle = '#5c3d1e';
      ctx.lineWidth = 2 * z;
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.65, sy - 6 * z);
      ctx.lineTo(sx, sy + hh * 0.65 - 6 * z);
      ctx.moveTo(sx, sy - hh * 0.65 - 6 * z);
      ctx.lineTo(sx + hw * 0.65, sy - 6 * z);
      ctx.stroke();
      return;
    }

    if (roadType === TileType.AVENUE) {
      // 2. Cable-Stayed Concrete Bridge (White concrete piers, wide deck, blue guardrails, suspension tower)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(sx - 6 * z, sy + hh * 0.5, 12 * z, 16 * z);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx - 3 * z, sy + hh * 0.5, 6 * z, 16 * z);

      // Elevated Wide Asphalt Deck
      ctx.fillStyle = '#1e1e24';
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh * 0.85);
      ctx.lineTo(sx + hw * 0.85, sy);
      ctx.lineTo(sx, sy + hh * 0.85);
      ctx.lineTo(sx - hw * 0.85, sy);
      ctx.closePath();
      ctx.fill();

      // Blue steel safety barriers
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5 * z;
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.75, sy - 8 * z);
      ctx.lineTo(sx, sy + hh * 0.75 - 8 * z);
      ctx.moveTo(sx, sy - hh * 0.75 - 8 * z);
      ctx.lineTo(sx + hw * 0.75, sy - 8 * z);
      ctx.stroke();

      // Tall central white suspension pylon
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(sx - 2.5 * z, sy - 28 * z, 5 * z, 28 * z);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx - 1 * z, sy - 28 * z, 2 * z, 28 * z);

      // Angled silver tension cables
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1 * z;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 26 * z);
      ctx.lineTo(sx - hw * 0.65, sy - 4 * z);
      ctx.moveTo(sx, sy - 20 * z);
      ctx.lineTo(sx - hw * 0.45, sy - 4 * z);
      ctx.moveTo(sx, sy - 26 * z);
      ctx.lineTo(sx + hw * 0.65, sy - 4 * z);
      ctx.moveTo(sx, sy - 20 * z);
      ctx.lineTo(sx + hw * 0.45, sy - 4 * z);
      ctx.stroke();

      // Center double yellow line on bridge
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2 * z;
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh * 0.5);
      ctx.lineTo(sx, sy + hh * 0.5);
      ctx.stroke();
      return;
    }

    // 3. Steel Truss Bridge over Water
    ctx.fillStyle = '#475569';
    ctx.fillRect(sx - 4 * z, sy + hh * 0.5, 8 * z, 14 * z);
    ctx.fillStyle = '#334155';
    ctx.fillRect(sx - 2 * z, sy + hh * 0.5, 4 * z, 14 * z);

    // Elevated Asphalt Deck
    ctx.fillStyle = '#33333e';
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh * 0.8);
    ctx.lineTo(sx + hw * 0.8, sy);
    ctx.lineTo(sx, sy + hh * 0.8);
    ctx.lineTo(sx - hw * 0.8, sy);
    ctx.closePath();
    ctx.fill();

    // Red safety guardrails / trusses
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2 * z;

    // Left railing
    ctx.beginPath();
    ctx.moveTo(sx - hw * 0.7, sy - 8 * z);
    ctx.lineTo(sx, sy + hh * 0.7 - 8 * z);
    ctx.stroke();

    // Right railing
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh * 0.7 - 8 * z);
    ctx.lineTo(sx + hw * 0.7, sy - 8 * z);
    ctx.stroke();

    // Yellow center road stripe
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5 * z;
    if ((mask & 5) === 5 || mask === 0) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh * 0.5);
      ctx.lineTo(sx, sy + hh * 0.5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.5, sy);
      ctx.lineTo(sx + hw * 0.5, sy);
      ctx.stroke();
    }
  }

  private drawZoneOverlay(sx: number, sy: number, hw: number, hh: number, zone: ZoneType) {
    const ctx = this.ctx;
    let fillColor = 'rgba(74, 222, 128, 0.35)';
    let strokeColor = '#22c55e';

    if (zone === ZoneType.COMMERCIAL) {
      fillColor = 'rgba(96, 165, 250, 0.35)';
      strokeColor = '#3b82f6';
    } else if (zone === ZoneType.INDUSTRIAL) {
      fillColor = 'rgba(250, 204, 21, 0.35)';
      strokeColor = '#eab308';
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(1.5, 1.5 * this.camera.zoom);

    ctx.beginPath();
    ctx.moveTo(sx, sy - hh * 0.85);
    ctx.lineTo(sx + hw * 0.85, sy);
    ctx.lineTo(sx, sy + hh * 0.85);
    ctx.lineTo(sx - hw * 0.85, sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawHighwayTile(sx: number, sy: number, hw: number, hh: number, tile: Tile) {
    const ctx = this.ctx;
    const z = this.camera.zoom;

    if (tile.elevation >= 0 && this.isNearWater(tile.x, tile.y)) {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx - 4 * z, sy + hh, 8 * z, 14 * z);
    }

    ctx.fillStyle = '#22222a';
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2 * z;
    ctx.stroke();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2 * z;
    ctx.beginPath();
    ctx.moveTo(sx - hw * 0.7, sy);
    ctx.lineTo(sx + hw * 0.7, sy);
    ctx.stroke();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1 * z;
    ctx.setLineDash([4 * z, 4 * z]);

    ctx.beginPath();
    ctx.moveTo(sx - hw * 0.6, sy - hh * 0.35);
    ctx.lineTo(sx + hw * 0.6, sy - hh * 0.35);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx - hw * 0.6, sy + hh * 0.35);
    ctx.lineTo(sx + hw * 0.6, sy + hh * 0.35);
    ctx.stroke();

    ctx.setLineDash([]);

    if (tile.isRamp) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx - 3 * z, sy, 6 * z, 4 * z);
    }

    if (tile.x === 30 && tile.y === 14) {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(sx - 18 * z, sy - 28 * z, 36 * z, 14 * z);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 * z;
      ctx.strokeRect(sx - 18 * z, sy - 28 * z, 36 * z, 14 * z);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(6, Math.floor(7 * z))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('I-10 METRO', sx, sy - 18 * z);
    }
  }

  private isNearWater(x: number, y: number): boolean {
    const neighbors = this.grid.getNeighbors(x, y);
    return neighbors.some(n => n.tile.type === TileType.WATER);
  }

  private drawRoadTile(sx: number, sy: number, hw: number, hh: number, mask: number, connectedToHighway: boolean, roadType: TileType = TileType.ROAD) {
    const ctx = this.ctx;
    const z = this.camera.zoom;

    if (roadType === TileType.DIRT_ROAD) {
      // 1. Country Dirt Road (Packed earth & clay with rough rut tracks)
      const dirtColor = connectedToHighway ? '#7c5328' : '#6b4623';
      const dirtBorder = '#4a2f14';
      const rutColor = '#452b11';

      ctx.fillStyle = dirtColor;
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh);
      ctx.lineTo(sx + hw, sy);
      ctx.lineTo(sx, sy + hh);
      ctx.lineTo(sx - hw, sy);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = dirtBorder;
      ctx.lineWidth = Math.max(1, 1 * z);
      ctx.stroke();

      // Parallel wheel ruts along road directions
      ctx.strokeStyle = rutColor;
      ctx.lineWidth = Math.max(1, 1.2 * z);

      if ((mask & 5) === 5 || mask === 0) {
        ctx.beginPath();
        ctx.moveTo(sx - 3 * z, sy - hh * 0.6);
        ctx.lineTo(sx - 3 * z, sy + hh * 0.6);
        ctx.moveTo(sx + 3 * z, sy - hh * 0.6);
        ctx.lineTo(sx + 3 * z, sy + hh * 0.6);
        ctx.stroke();
      } else if ((mask & 10) === 10) {
        ctx.beginPath();
        ctx.moveTo(sx - hw * 0.6, sy - 2 * z);
        ctx.lineTo(sx + hw * 0.6, sy - 2 * z);
        ctx.moveTo(sx - hw * 0.6, sy + 2 * z);
        ctx.lineTo(sx + hw * 0.6, sy + 2 * z);
        ctx.stroke();
      } else {
        if (mask & 1) {
          ctx.beginPath();
          ctx.moveTo(sx - 2 * z, sy);
          ctx.lineTo(sx - 2 * z, sy - hh * 0.6);
          ctx.moveTo(sx + 2 * z, sy);
          ctx.lineTo(sx + 2 * z, sy - hh * 0.6);
          ctx.stroke();
        }
        if (mask & 2) {
          ctx.beginPath();
          ctx.moveTo(sx, sy - 2 * z);
          ctx.lineTo(sx + hw * 0.6, sy - 2 * z);
          ctx.moveTo(sx, sy + 2 * z);
          ctx.lineTo(sx + hw * 0.6, sy + 2 * z);
          ctx.stroke();
        }
        if (mask & 4) {
          ctx.beginPath();
          ctx.moveTo(sx - 2 * z, sy);
          ctx.lineTo(sx - 2 * z, sy + hh * 0.6);
          ctx.moveTo(sx + 2 * z, sy);
          ctx.lineTo(sx + 2 * z, sy + hh * 0.6);
          ctx.stroke();
        }
        if (mask & 8) {
          ctx.beginPath();
          ctx.moveTo(sx, sy - 2 * z);
          ctx.lineTo(sx - hw * 0.6, sy - 2 * z);
          ctx.moveTo(sx, sy + 2 * z);
          ctx.lineTo(sx - hw * 0.6, sy + 2 * z);
          ctx.stroke();
        }
      }

      if (z >= 0.8) {
        ctx.fillStyle = '#9c6c39';
        ctx.fillRect(sx - 4 * z, sy - 2 * z, 1.5 * z, 1.5 * z);
        ctx.fillRect(sx + 5 * z, sy + 3 * z, 1.5 * z, 1.5 * z);
      }
      return;
    }

    if (roadType === TileType.AVENUE) {
      // 2. Downtown 4-Lane Avenue (Deep charcoal asphalt, concrete curbs, double yellow center line, white lane dashes)
      const aveColor = connectedToHighway ? '#1b1b22' : '#2b2b35';
      const curbColor = '#64748b';
      const doubleYellow = '#facc15';
      const whiteLane = '#f8fafc';

      ctx.fillStyle = aveColor;
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh);
      ctx.lineTo(sx + hw, sy);
      ctx.lineTo(sx, sy + hh);
      ctx.lineTo(sx - hw, sy);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = curbColor;
      ctx.lineWidth = Math.max(1.5, 2 * z);
      ctx.stroke();

      if ((mask & 5) === 5 || mask === 0) {
        ctx.strokeStyle = doubleYellow;
        ctx.lineWidth = Math.max(1, 1.2 * z);
        ctx.beginPath();
        ctx.moveTo(sx - 1.5 * z, sy - hh * 0.65);
        ctx.lineTo(sx - 1.5 * z, sy + hh * 0.65);
        ctx.moveTo(sx + 1.5 * z, sy - hh * 0.65);
        ctx.lineTo(sx + 1.5 * z, sy + hh * 0.65);
        ctx.stroke();

        ctx.strokeStyle = whiteLane;
        ctx.lineWidth = Math.max(1, 1 * z);
        ctx.setLineDash([3 * z, 3 * z]);
        ctx.beginPath();
        ctx.moveTo(sx - hw * 0.35, sy - hh * 0.5);
        ctx.lineTo(sx - hw * 0.35, sy + hh * 0.5);
        ctx.moveTo(sx + hw * 0.35, sy - hh * 0.5);
        ctx.lineTo(sx + hw * 0.35, sy + hh * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if ((mask & 10) === 10) {
        ctx.strokeStyle = doubleYellow;
        ctx.lineWidth = Math.max(1, 1.2 * z);
        ctx.beginPath();
        ctx.moveTo(sx - hw * 0.65, sy - 1.5 * z);
        ctx.lineTo(sx + hw * 0.65, sy - 1.5 * z);
        ctx.moveTo(sx - hw * 0.65, sy + 1.5 * z);
        ctx.lineTo(sx + hw * 0.65, sy + 1.5 * z);
        ctx.stroke();

        ctx.strokeStyle = whiteLane;
        ctx.lineWidth = Math.max(1, 1 * z);
        ctx.setLineDash([3 * z, 3 * z]);
        ctx.beginPath();
        ctx.moveTo(sx - hw * 0.5, sy - hh * 0.35);
        ctx.lineTo(sx + hw * 0.5, sy - hh * 0.35);
        ctx.moveTo(sx - hw * 0.5, sy + hh * 0.35);
        ctx.lineTo(sx + hw * 0.5, sy + hh * 0.35);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx - 4 * z, sy - 4 * z, 8 * z, 8 * z);

        ctx.strokeStyle = doubleYellow;
        ctx.lineWidth = Math.max(1, 1.2 * z);

        if (mask & 1) {
          ctx.beginPath();
          ctx.moveTo(sx - 1.5 * z, sy);
          ctx.lineTo(sx - 1.5 * z, sy - hh * 0.65);
          ctx.moveTo(sx + 1.5 * z, sy);
          ctx.lineTo(sx + 1.5 * z, sy - hh * 0.65);
          ctx.stroke();
        }
        if (mask & 2) {
          ctx.beginPath();
          ctx.moveTo(sx, sy - 1.5 * z);
          ctx.lineTo(sx + hw * 0.65, sy - 1.5 * z);
          ctx.moveTo(sx, sy + 1.5 * z);
          ctx.lineTo(sx + hw * 0.65, sy + 1.5 * z);
          ctx.stroke();
        }
        if (mask & 4) {
          ctx.beginPath();
          ctx.moveTo(sx - 1.5 * z, sy);
          ctx.lineTo(sx - 1.5 * z, sy + hh * 0.65);
          ctx.moveTo(sx + 1.5 * z, sy);
          ctx.lineTo(sx + 1.5 * z, sy + hh * 0.65);
          ctx.stroke();
        }
        if (mask & 8) {
          ctx.beginPath();
          ctx.moveTo(sx, sy - 1.5 * z);
          ctx.lineTo(sx - hw * 0.65, sy - 1.5 * z);
          ctx.moveTo(sx, sy + 1.5 * z);
          ctx.lineTo(sx - hw * 0.65, sy + 1.5 * z);
          ctx.stroke();
        }
      }
      return;
    }

    const roadColor = connectedToHighway ? '#33333e' : '#454552';
    const roadBorder = '#1c1c24';
    const stripeColor = connectedToHighway ? '#fbbf24' : '#9ca3af';

    ctx.fillStyle = roadColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = roadBorder;
    ctx.lineWidth = Math.max(1, 1 * z);
    ctx.stroke();

    ctx.fillStyle = stripeColor;

    if ((mask & 5) === 5 || mask === 0) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh * 0.6);
      ctx.lineTo(sx, sy + hh * 0.6);
      ctx.lineWidth = 2 * z;
      ctx.strokeStyle = stripeColor;
      ctx.stroke();
    } else if ((mask & 10) === 10) {
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.6, sy);
      ctx.lineTo(sx + hw * 0.6, sy);
      ctx.lineWidth = 2 * z;
      ctx.strokeStyle = stripeColor;
      ctx.stroke();
    } else {
      ctx.fillRect(sx - 2 * z, sy - 2 * z, 4 * z, 4 * z);
      ctx.strokeStyle = stripeColor;
      ctx.lineWidth = 2 * z;

      if (mask & 1) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - hh * 0.6);
        ctx.stroke();
      }
      if (mask & 2) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + hw * 0.6, sy);
        ctx.stroke();
      }
      if (mask & 4) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + hh * 0.6);
        ctx.stroke();
      }
      if (mask & 8) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - hw * 0.6, sy);
        ctx.stroke();
      }
    }
  }

  // --- SERVICE BUILDINGS ---

  private drawFireStation(sx: number, sy: number, hw: number, hh: number) {
    const z = this.camera.zoom;
    if (assetManager.hasSprite('fire_station')) {
      const img = assetManager.getSprite('fire_station')!;
      const w = img.naturalWidth * z;
      const h = img.naturalHeight * z;
      this.ctx.drawImage(img, sx - w / 2, sy + hh - h, w, h);
      return;
    }
    const height = 34 * z;
    this.drawIsometricBox(sx, sy, hw * 0.75, hh * 0.75, height, '#b91c1c', '#991b1b', '#7f1d1d');

    // Red truck garage door
    this.ctx.fillStyle = '#450a0a';
    this.ctx.fillRect(sx - 8 * z, sy - 12 * z, 16 * z, 10 * z);

    // Alarm bell / siren on roof
    this.ctx.fillStyle = '#eab308';
    this.ctx.fillRect(sx - 2 * z, sy - height - 6 * z, 4 * z, 6 * z);
  }

  private drawPoliceStation(sx: number, sy: number, hw: number, hh: number) {
    const z = this.camera.zoom;
    if (assetManager.hasSprite('police_station')) {
      const img = assetManager.getSprite('police_station')!;
      const w = img.naturalWidth * z;
      const h = img.naturalHeight * z;
      this.ctx.drawImage(img, sx - w / 2, sy + hh - h, w, h);
      return;
    }
    const height = 34 * z;
    this.drawIsometricBox(sx, sy, hw * 0.75, hh * 0.75, height, '#1e3a8a', '#1e40af', '#172554');

    // Police star badge
    this.ctx.fillStyle = '#facc15';
    this.ctx.fillRect(sx - 3 * z, sy - height * 0.6, 6 * z, 6 * z);

    // Flashing blue rooftop emergency light
    if (this.animFrame % 30 < 15) {
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.beginPath();
      this.ctx.arc(sx, sy - height - 4 * z, 3.5 * z, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawHospital(sx: number, sy: number, hw: number, hh: number) {
    const z = this.camera.zoom;
    if (assetManager.hasSprite('hospital')) {
      const img = assetManager.getSprite('hospital')!;
      const w = img.naturalWidth * z;
      const h = img.naturalHeight * z;
      this.ctx.drawImage(img, sx - w / 2, sy + hh - h, w, h);
      return;
    }
    const height = 44 * z;
    this.drawIsometricBox(sx, sy, hw * 0.8, hh * 0.8, height, '#f8fafc', '#e2e8f0', '#cbd5e1');

    // Red Cross emblem
    this.ctx.fillStyle = '#dc2626';
    this.ctx.fillRect(sx - 6 * z, sy - height * 0.65, 12 * z, 4 * z);
    this.ctx.fillRect(sx - 2 * z, sy - height * 0.65 - 4 * z, 4 * z, 12 * z);

    // Rooftop Helipad 'H'
    this.ctx.strokeStyle = '#facc15';
    this.ctx.lineWidth = 1.5 * z;
    this.ctx.strokeRect(sx - 6 * z, sy - height - 2 * z, 12 * z, 6 * z);
  }

  private drawSchool(sx: number, sy: number, hw: number, hh: number) {
    const z = this.camera.zoom;
    if (assetManager.hasSprite('school')) {
      const img = assetManager.getSprite('school')!;
      const w = img.naturalWidth * z;
      const h = img.naturalHeight * z;
      this.ctx.drawImage(img, sx - w / 2, sy + hh - h, w, h);
      return;
    }
    const height = 30 * z;
    this.drawIsometricBox(sx, sy, hw * 0.75, hh * 0.75, height, '#c2410c', '#9a3412', '#7c2d12');

    // School clock tower
    this.ctx.fillStyle = '#fef08a';
    this.ctx.beginPath();
    this.ctx.arc(sx, sy - height - 6 * z, 4 * z, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#78350f';
    this.ctx.stroke();
  }

  /**
   * Procedural or PixelLab Sprite Buildings
   */
  private drawBuilding(sx: number, sy: number, hw: number, hh: number, tile: Tile) {
    const b = tile.building;
    if (!b) return;

    const z = this.camera.zoom;

    if (b.isConstructing) {
      this.drawConstructionSite(sx, sy, hw, hh);
      if (!b.hasHighwayAccess && (this.animFrame % 60 < 35)) {
        this.drawWarningIcon(sx, sy - 30 * z, '🚫', '#ef4444');
      }
      return;
    }

    const level = b.level;
    const style = b.style;

    const spriteKey = b.zone === ZoneType.RESIDENTIAL
      ? (level === 1 ? 'house_cottage' : (level === 2 ? 'townhouse' : 'apartment_tower'))
      : (b.zone === ZoneType.COMMERCIAL
        ? (level === 1 ? 'corner_diner' : (level === 2 ? 'office_building' : 'skyscraper'))
        : (level === 1 ? 'warehouse' : 'factory'));

    if (assetManager.hasSprite(spriteKey)) {
      const img = assetManager.getSprite(spriteKey)!;
      const w = img.naturalWidth * z;
      const h = img.naturalHeight * z;
      this.ctx.drawImage(img, sx - w / 2, sy + hh - h, w, h);
    } else {
      if (b.zone === ZoneType.RESIDENTIAL) {
        this.drawResidentialBuilding(sx, sy, hw, hh, level, style, z);
      } else if (b.zone === ZoneType.COMMERCIAL) {
        this.drawCommercialBuilding(sx, sy, hw, hh, level, style, z);
      } else if (b.zone === ZoneType.INDUSTRIAL) {
        this.drawIndustrialBuilding(sx, sy, hw, hh, level, style, z);
      }
    }

    // Active Fire outbreak
    if (b.onFire) {
      this.drawActiveFire(sx, sy, z);
    }

    // Power / Water / Highway Warning Icons
    if (!b.hasHighwayAccess && (this.animFrame % 60 < 35)) {
      this.drawWarningIcon(sx, sy - 40 * z, '🚫', '#ef4444');
    } else if (!b.powered && (this.animFrame % 60 < 35)) {
      this.drawWarningIcon(sx, sy - 40 * z, '⚡', '#facc15');
    } else if (!b.watered && (this.animFrame % 60 < 35)) {
      this.drawWarningIcon(sx, sy - 40 * z, '💧', '#38bdf8');
    }
  }

  private drawActiveFire(sx: number, sy: number, z: number) {
    const ctx = this.ctx;
    const flameH = (15 + (this.animFrame % 10)) * z;

    // Glowing flame tongues
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(sx - 12 * z, sy);
    ctx.lineTo(sx - 4 * z, sy - flameH);
    ctx.lineTo(sx + 4 * z, sy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(sx - 4 * z, sy);
    ctx.lineTo(sx + 4 * z, sy - flameH * 1.2);
    ctx.lineTo(sx + 12 * z, sy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(sx - 3 * z, sy);
    ctx.lineTo(sx, sy - flameH * 0.7);
    ctx.lineTo(sx + 3 * z, sy);
    ctx.closePath();
    ctx.fill();

    // Billowing smoke particles
    if (this.animFrame % 4 === 0) {
      this.particles.push({
        x: sx + (Math.random() - 0.5) * 10 * z,
        y: sy - flameH * 0.8,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1.2 - Math.random() * 0.6,
        life: 0,
        maxLife: 40,
        color: 'rgba(30, 30, 30, 0.75)',
        size: (5 + Math.random() * 4) * z
      });
    }
  }

  private drawConstructionSite(sx: number, sy: number, hw: number, hh: number) {
    const ctx = this.ctx;
    const z = this.camera.zoom;

    ctx.fillStyle = '#785230';
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh * 0.8);
    ctx.lineTo(sx + hw * 0.8, sy);
    ctx.lineTo(sx, sy + hh * 0.8);
    ctx.lineTo(sx - hw * 0.8, sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2 * z;
    ctx.beginPath();
    ctx.moveTo(sx - 10 * z, sy);
    ctx.lineTo(sx - 10 * z, sy - 20 * z);
    ctx.moveTo(sx + 10 * z, sy);
    ctx.lineTo(sx + 10 * z, sy - 20 * z);
    ctx.moveTo(sx - 10 * z, sy - 15 * z);
    ctx.lineTo(sx + 10 * z, sy - 15 * z);
    ctx.stroke();
  }

  private drawResidentialBuilding(sx: number, sy: number, hw: number, hh: number, level: number, style: number, z: number) {
    const ctx = this.ctx;

    if (level === 1) {
      const roofH = 22 * z;
      const wallH = 16 * z;
      const roofColors = ['#dc2626', '#b45309', '#047857'];
      const roofColor = roofColors[style % roofColors.length];

      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.6, sy);
      ctx.lineTo(sx, sy + hh * 0.6);
      ctx.lineTo(sx, sy + hh * 0.6 - wallH);
      ctx.lineTo(sx - hw * 0.6, sy - wallH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(sx, sy + hh * 0.6);
      ctx.lineTo(sx + hw * 0.6, sy);
      ctx.lineTo(sx + hw * 0.6, sy - wallH);
      ctx.lineTo(sx, sy + hh * 0.6 - wallH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.6, sy - wallH);
      ctx.lineTo(sx, sy + hh * 0.6 - wallH);
      ctx.lineTo(sx, sy - wallH - roofH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(sx, sy + hh * 0.6 - wallH);
      ctx.lineTo(sx + hw * 0.6, sy - wallH);
      ctx.lineTo(sx, sy - wallH - roofH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#78350f';
      ctx.fillRect(sx - 4 * z, sy + 2 * z - wallH * 0.4, 6 * z, 8 * z);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx + 8 * z, sy - 2 * z - wallH * 0.4, 4 * z, 4 * z);
    } else if (level === 2) {
      const height = 36 * z;
      this.drawIsometricBox(sx, sy, hw * 0.7, hh * 0.7, height, '#b91c1c', '#991b1b', '#7f1d1d');
      ctx.fillStyle = '#bae6fd';
      for (let floor = 0; floor < 2; floor++) {
        const fy = sy - 10 * z - floor * 14 * z;
        ctx.fillRect(sx - 10 * z, fy, 4 * z, 6 * z);
        ctx.fillRect(sx + 4 * z, fy + 2 * z, 4 * z, 6 * z);
      }
    } else {
      const height = 64 * z;
      this.drawIsometricBox(sx, sy, hw * 0.75, hh * 0.75, height, '#e2e8f0', '#cbd5e1', '#94a3b8');
      ctx.fillStyle = '#0284c7';
      for (let floor = 0; floor < 4; floor++) {
        const fy = sy - 12 * z - floor * 13 * z;
        ctx.fillRect(sx - 12 * z, fy, 6 * z, 5 * z);
        ctx.fillRect(sx + 5 * z, fy + 3 * z, 6 * z, 5 * z);
      }
      ctx.fillStyle = '#78350f';
      ctx.fillRect(sx - 4 * z, sy - height - 10 * z, 8 * z, 10 * z);
    }
  }

  private drawCommercialBuilding(sx: number, sy: number, hw: number, hh: number, level: number, _style: number, z: number) {
    const ctx = this.ctx;

    if (level === 1) {
      const height = 24 * z;
      this.drawIsometricBox(sx, sy, hw * 0.7, hh * 0.7, height, '#38bdf8', '#0284c7', '#0369a1');

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx - 12 * z, sy - 8 * z, 12 * z, 4 * z);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 6 * z, sy - 8 * z, 3 * z, 4 * z);
    } else if (level === 2) {
      const height = 48 * z;
      this.drawIsometricBox(sx, sy, hw * 0.75, hh * 0.75, height, '#64748b', '#475569', '#334155');

      ctx.fillStyle = '#7dd3fc';
      for (let floor = 0; floor < 3; floor++) {
        const fy = sy - 12 * z - floor * 11 * z;
        ctx.fillRect(sx - 12 * z, fy, 8 * z, 5 * z);
        ctx.fillRect(sx + 4 * z, fy + 3 * z, 8 * z, 5 * z);
      }
    } else {
      const height = 75 * z;
      this.drawIsometricBox(sx, sy, hw * 0.8, hh * 0.8, height, '#06b6d4', '#0891b2', '#0e7490');

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 * z;
      ctx.beginPath();
      ctx.moveTo(sx, sy - height);
      ctx.lineTo(sx, sy - height - 16 * z);
      ctx.stroke();

      if (this.animFrame % 40 < 20) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(sx, sy - height - 16 * z, 2.5 * z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawIndustrialBuilding(sx: number, sy: number, hw: number, hh: number, level: number, _style: number, z: number) {
    const ctx = this.ctx;

    if (level === 1) {
      const height = 20 * z;
      this.drawIsometricBox(sx, sy, hw * 0.75, hh * 0.75, height, '#d97706', '#b45309', '#78350f');
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(sx - 6 * z, sy - 8 * z, 10 * z, 10 * z);
    } else if (level === 2) {
      const height = 30 * z;
      this.drawIsometricBox(sx, sy, hw * 0.75, hh * 0.75, height, '#475569', '#334155', '#1e293b');

      const stackX = sx + 8 * z;
      const stackY = sy - height - 14 * z;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(stackX - 3 * z, stackY, 6 * z, 16 * z);

      if (this.animFrame % 10 === 0) {
        this.particles.push({
          x: stackX,
          y: stackY,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.8 - Math.random() * 0.5,
          life: 0,
          maxLife: 45,
          color: 'rgba(156, 163, 175, 0.7)',
          size: 4 * z
        });
      }
    } else {
      const height = 45 * z;
      this.drawIsometricBox(sx, sy, hw * 0.8, hh * 0.8, height, '#374151', '#1f2937', '#111827');

      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(sx - 12 * z, sy - height - 8 * z, 7 * z, 12 * z);
      ctx.fillRect(sx + 5 * z, sy - height - 8 * z, 7 * z, 12 * z);

      if (this.animFrame % 6 === 0) {
        this.particles.push({
          x: sx - 9 * z,
          y: sy - height - 8 * z,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -1.0,
          life: 0,
          maxLife: 50,
          color: 'rgba(209, 213, 219, 0.6)',
          size: 5 * z
        });
      }
    }
  }

  private drawPowerPlant(sx: number, sy: number, hw: number, hh: number) {
    const z = this.camera.zoom;
    if (assetManager.hasSprite('power_plant')) {
      const img = assetManager.getSprite('power_plant')!;
      const w = img.naturalWidth * z;
      const h = img.naturalHeight * z;
      this.ctx.drawImage(img, sx - w / 2, sy + hh - h, w, h);
      return;
    }
    const height = 40 * z;
    this.drawIsometricBox(sx, sy, hw * 0.8, hh * 0.8, height, '#475569', '#334155', '#1e293b');
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillRect(sx - 8 * z, sy - height - 4 * z, 16 * z, 6 * z);
  }

  private drawWaterPump(sx: number, sy: number, hw: number, hh: number) {
    const z = this.camera.zoom;
    if (assetManager.hasSprite('water_pump')) {
      const img = assetManager.getSprite('water_pump')!;
      const w = img.naturalWidth * z;
      const h = img.naturalHeight * z;
      this.ctx.drawImage(img, sx - w / 2, sy + hh - h, w, h);
      return;
    }
    const height = 26 * z;
    this.drawIsometricBox(sx, sy, hw * 0.75, hh * 0.75, height, '#0284c7', '#0369a1', '#075985');
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.beginPath();
    this.ctx.arc(sx, sy - height - 3 * z, 7 * z, Math.PI, 0);
    this.ctx.fill();
  }

  private drawPark(sx: number, sy: number, hw: number, hh: number, variant: number) {
    const z = this.camera.zoom;
    if (assetManager.hasSprite('city_park')) {
      const img = assetManager.getSprite('city_park')!;
      const w = img.naturalWidth * z;
      const h = img.naturalHeight * z;
      this.ctx.drawImage(img, sx - w / 2, sy + hh - h, w, h);
      return;
    }
    const ctx = this.ctx;
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh * 0.4);
    ctx.lineTo(sx + hw * 0.4, sy);
    ctx.lineTo(sx, sy + hh * 0.4);
    ctx.lineTo(sx - hw * 0.4, sy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx - 2 * z, sy - 14 * z, 4 * z, 14 * z);

    const foliageColors = ['#15803d', '#16a34a', '#22c55e'];
    ctx.fillStyle = foliageColors[variant % foliageColors.length];
    ctx.beginPath();
    ctx.arc(sx, sy - 20 * z, 12 * z, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawIsometricBox(
    sx: number,
    sy: number,
    hw: number,
    hh: number,
    height: number,
    leftColor: string,
    rightColor: string,
    topColor: string
  ) {
    const ctx = this.ctx;

    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx, sy + hh - height);
    ctx.lineTo(sx - hw, sy - height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy + hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx + hw, sy - height);
    ctx.lineTo(sx, sy + hh - height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh - height);
    ctx.lineTo(sx + hw, sy - height);
    ctx.lineTo(sx, sy + hh - height);
    ctx.lineTo(sx - hw, sy - height);
    ctx.closePath();
    ctx.fill();
  }

  private drawWarningIcon(sx: number, sy: number, symbol: string, color: string) {
    const ctx = this.ctx;
    const z = this.camera.zoom;
    const bob = Math.sin(this.animFrame / 8) * 3 * z;
    const y = sy + bob;

    ctx.save();
    // Pill / circle badge background
    const radius = 10 * z;
    ctx.fillStyle = 'rgba(20, 20, 32, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, 1.5 * z);
    ctx.beginPath();
    ctx.arc(sx, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${Math.max(10, Math.floor(11 * z))}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, sx, y);
    ctx.restore();
  }

  private renderDragPreview(preview: DragPreview) {
    const { tool, startX, startY, endX, endY } = preview;
    const ctx = this.ctx;
    const z = this.camera.zoom;
    const halfW = (TILE_WIDTH / 2) * z;
    const halfH = (TILE_HEIGHT / 2) * z;

    const affectedTiles: { x: number; y: number }[] = [];

    if (tool === 'road' || tool === 'dirt-road' || tool === 'avenue') {
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) >= Math.abs(dy)) {
        const step = dx >= 0 ? 1 : -1;
        for (let x = startX; x !== endX + step; x += step) {
          if (this.grid.isValidCoord(x, startY)) {
            affectedTiles.push({ x, y: startY });
          }
        }
      } else {
        const step = dy >= 0 ? 1 : -1;
        for (let y = startY; y !== endY + step; y += step) {
          if (this.grid.isValidCoord(startX, y)) {
            affectedTiles.push({ x: startX, y });
          }
        }
      }
    } else {
      // Rectangle drag for zones and demolish
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          if (this.grid.isValidCoord(x, y)) {
            affectedTiles.push({ x, y });
          }
        }
      }
    }

    if (affectedTiles.length === 0) return;

    let strokeColor = '#3b82f6';
    let fillColor = 'rgba(59, 130, 246, 0.4)';
    let toolName = 'Zoning';
    let unitCost = 50;

    if (tool === 'zone-r') {
      strokeColor = '#22c55e';
      fillColor = 'rgba(34, 197, 94, 0.45)';
      toolName = 'Residential Zone';
      unitCost = 50;
    } else if (tool === 'zone-c') {
      strokeColor = '#3b82f6';
      fillColor = 'rgba(59, 130, 246, 0.45)';
      toolName = 'Commercial Zone';
      unitCost = 50;
    } else if (tool === 'zone-i') {
      strokeColor = '#eab308';
      fillColor = 'rgba(234, 179, 8, 0.45)';
      toolName = 'Industrial Zone';
      unitCost = 50;
    } else if (tool === 'dirt-road') {
      strokeColor = '#a16207';
      fillColor = 'rgba(161, 98, 7, 0.45)';
      toolName = 'Country Dirt Road';
      unitCost = 5;
    } else if (tool === 'road') {
      strokeColor = '#f59e0b';
      fillColor = 'rgba(245, 158, 11, 0.45)';
      toolName = 'Paved Street';
      unitCost = 10;
    } else if (tool === 'avenue') {
      strokeColor = '#818cf8';
      fillColor = 'rgba(129, 140, 248, 0.45)';
      toolName = 'Downtown Avenue';
      unitCost = 25;
    } else if (tool === 'demolish') {
      strokeColor = '#ef4444';
      fillColor = 'rgba(239, 68, 68, 0.45)';
      toolName = 'Bulldozer';
      unitCost = 5;
    }

    // Highlight each affected tile diamond
    for (const t of affectedTiles) {
      const tile = this.grid.getTile(t.x, t.y);
      const elevation = tile ? tile.elevation : 0;
      const { x: sx, y: sy } = this.camera.worldToScreen(t.x, t.y, elevation);

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(2, 2 * z);
      ctx.fillStyle = fillColor;

      ctx.beginPath();
      ctx.moveTo(sx, sy - halfH);
      ctx.lineTo(sx + halfW, sy);
      ctx.lineTo(sx, sy + halfH);
      ctx.lineTo(sx - halfW, sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Floating Tooltip Badge near endpoint
    const endTile = this.grid.getTile(endX, endY);
    const endElev = endTile ? endTile.elevation : 0;
    const { x: tooltipX, y: tooltipY } = this.camera.worldToScreen(endX, endY, endElev);

    const count = affectedTiles.length;
    const totalCost = count * unitCost;
    const w = Math.abs(endX - startX) + 1;
    const h = Math.abs(endY - startY) + 1;
    const isLineTool = tool === 'road' || tool === 'dirt-road' || tool === 'avenue';
    const dimText = isLineTool ? `${count} tiles` : `${w}×${h} (${count} tiles)`;
    const text = `${toolName} • ${dimText} • $${totalCost.toLocaleString()}`;

    ctx.save();
    ctx.font = `bold ${Math.max(10, Math.floor(11 * z))}px 'Press Start 2P', monospace`;
    const textWidth = ctx.measureText(text).width;
    const badgeW = textWidth + 24 * z;
    const badgeH = 26 * z;
    const badgeX = tooltipX - badgeW / 2;
    const badgeY = tooltipY - 32 * z;

    ctx.fillStyle = 'rgba(20, 20, 32, 0.92)';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(2, 2 * z);
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6 * z);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tooltipX, badgeY + badgeH / 2);
    ctx.restore();
  }

  private renderHoverHighlight(tile: Tile, activeTool: string) {
    const { x: sx, y: sy } = this.camera.worldToScreen(tile.x, tile.y, tile.elevation);
    const halfW = (TILE_WIDTH / 2) * this.camera.zoom;
    const halfH = (TILE_HEIGHT / 2) * this.camera.zoom;
    const ctx = this.ctx;

    let strokeColor = '#60a5fa';
    let fillColor = 'rgba(96, 165, 250, 0.25)';

    if (activeTool === 'demolish') {
      strokeColor = '#ef4444';
      fillColor = 'rgba(239, 68, 68, 0.35)';
    } else if (activeTool.startsWith('zone-')) {
      strokeColor = '#22c55e';
      fillColor = 'rgba(34, 197, 94, 0.25)';
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(2, 2 * this.camera.zoom);
    ctx.fillStyle = fillColor;

    ctx.beginPath();
    ctx.moveTo(sx, sy - halfH);
    ctx.lineTo(sx + halfW, sy);
    ctx.lineTo(sx, sy + halfH);
    ctx.lineTo(sx - halfW, sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private updateAndRenderParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateAndRenderVehicles() {
    const highwayY = 14;

    // 1. Interstate traffic
    if (this.vehicles.filter(v => v.y === highwayY).length < 6 && Math.random() < 0.08) {
      const isEastbound = Math.random() > 0.5;
      const startX = isEastbound ? 0 : this.grid.size - 1;
      const targetX = isEastbound ? 1 : this.grid.size - 2;

      this.vehicles.push({
        id: Math.random().toString(),
        x: startX,
        y: highwayY,
        targetX: targetX,
        targetY: highwayY,
        color: ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea'][Math.floor(Math.random() * 5)],
        speed: 0.08,
        isTruck: Math.random() > 0.4
      });
    }

    // 2. Local City traffic (including Fire Trucks and Police Cruisers)
    if (this.vehicles.length < 25 && Math.random() < 0.06) {
      const roadTiles: Tile[] = [];
      for (let x = 0; x < this.grid.size; x++) {
        for (let y = 0; y < this.grid.size; y++) {
          const t = this.grid.getTile(x, y);
          if (t && isAnyRoad(t.type) && t.type !== TileType.HIGHWAY && t.connectedToHighway) roadTiles.push(t);
        }
      }

      if (roadTiles.length > 2) {
        const start = roadTiles[Math.floor(Math.random() * roadTiles.length)];
        const neighbors = this.grid.getNeighbors(start.x, start.y).filter(n => isAnyRoad(n.tile.type));
        if (neighbors.length > 0) {
          const target = neighbors[Math.floor(Math.random() * neighbors.length)].tile;
          const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#f3f4f6'];

          // Emergency vehicle chance
          let isEmergency: 'fire' | 'police' | undefined;
          if (Math.random() < 0.15) {
            isEmergency = Math.random() < 0.5 ? 'fire' : 'police';
          }

          this.vehicles.push({
            id: Math.random().toString(),
            x: start.x,
            y: start.y,
            targetX: target.x,
            targetY: target.y,
            color: isEmergency === 'fire' ? '#dc2626' : (isEmergency === 'police' ? '#1e3a8a' : colors[Math.floor(Math.random() * colors.length)]),
            speed: isEmergency ? 0.055 : 0.035,
            isEmergency
          });
        }
      }
    }

    // Update & draw vehicles
    const z = this.camera.zoom;
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const dx = v.targetX - v.x;
      const dy = v.targetY - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist < v.speed) {
        v.x = v.targetX;
        v.y = v.targetY;

        if (v.y === highwayY) {
          const nextX = v.x + (dx >= 0 ? 1 : -1);
          if (nextX >= 0 && nextX < this.grid.size) {
            v.targetX = nextX;
            v.targetY = highwayY;
          } else {
            this.vehicles.splice(i, 1);
            continue;
          }
        } else {
          const neighbors = this.grid.getNeighbors(v.targetX, v.targetY).filter(n => isAnyRoad(n.tile.type));
          if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)].tile;
            v.targetX = next.x;
            v.targetY = next.y;
            // Dynamically scale vehicle speed based on road type
            if (next.type === TileType.AVENUE) {
              v.speed = v.isEmergency ? 0.07 : 0.05;
            } else if (next.type === TileType.DIRT_ROAD) {
              v.speed = v.isEmergency ? 0.045 : 0.025;
            } else {
              v.speed = v.isEmergency ? 0.055 : 0.035;
            }
          } else {
            this.vehicles.splice(i, 1);
            continue;
          }
        }
      } else {
        v.x += (dx / dist) * v.speed;
        v.y += (dy / dist) * v.speed;
      }

      const { x: sx, y: sy } = this.camera.worldToScreen(v.x, v.y, 0);

      // Emergency flashing siren
      if (v.isEmergency) {
        const spriteKey = v.isEmergency === 'fire' ? 'fire_truck' : 'police_car';
        if (assetManager.hasSprite(spriteKey)) {
          const img = assetManager.getSprite(spriteKey)!;
          const w = 22 * z;
          const h = 22 * z;
          this.ctx.drawImage(img, sx - w / 2, sy - h * 0.7, w, h);
        } else {
          this.ctx.fillStyle = v.color;
          this.ctx.fillRect(sx - 3 * z, sy - 2 * z, 6 * z, 4 * z);
        }

        const sirenColor = (this.animFrame % 16 < 8) ? '#ef4444' : '#38bdf8';
        this.ctx.fillStyle = sirenColor;
        this.ctx.fillRect(sx - 1 * z, sy - 4 * z, 2 * z, 2 * z);
        continue;
      }

      if (v.isTruck) {
        if (assetManager.hasSprite('semi_truck')) {
          const img = assetManager.getSprite('semi_truck')!;
          const w = 28 * z;
          const h = 21 * z;
          this.ctx.drawImage(img, sx - w / 2, sy - h * 0.7, w, h);
        } else {
          this.ctx.fillStyle = '#e2e8f0';
          this.ctx.fillRect(sx - 6 * z, sy - 3 * z, 5 * z, 5 * z);
          this.ctx.fillStyle = v.color;
          this.ctx.fillRect(sx - 1 * z, sy - 4 * z, 10 * z, 6 * z);
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(sx - 5 * z, sy + 2 * z, 3 * z, 2 * z);
          this.ctx.fillRect(sx + 4 * z, sy + 2 * z, 4 * z, 2 * z);
        }
      } else {
        if (assetManager.hasSprite('taxi')) {
          const img = assetManager.getSprite('taxi')!;
          const w = 18 * z;
          const h = 18 * z;
          this.ctx.drawImage(img, sx - w / 2, sy - h * 0.7, w, h);
        } else {
          this.ctx.fillStyle = v.color;
          this.ctx.fillRect(sx - 3 * z, sy - 2 * z, 6 * z, 4 * z);
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(sx - 2 * z, sy - 1 * z, 2 * z, 2 * z);
        }
      }
    }
  }

  /**
   * Day / Night Atmosphere tinting
   */
  private applyDayNightLighting(width: number, height: number) {
    const hour = this.engine.gameHour;
    let tintColor: string | null = null;

    // Midnight / Deep Night
    if (hour >= 21 || hour < 5) {
      tintColor = 'rgba(10, 16, 45, 0.48)';
    }
    // Dawn / Sunrise (5:00 - 7:00)
    else if (hour >= 5 && hour < 7) {
      tintColor = 'rgba(251, 146, 60, 0.22)';
    }
    // Sunset / Dusk (18:00 - 21:00)
    else if (hour >= 18 && hour < 21) {
      tintColor = 'rgba(147, 51, 234, 0.25)';
    }

    if (tintColor) {
      this.ctx.fillStyle = tintColor;
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  /**
   * Atmospheric Weather Effects (Overcast tint, pixel rain particles, thunderstorm lightning)
   */
  private renderWeatherAtmosphere(width: number, height: number) {
    const weather = this.engine.weather;
    if (weather === WeatherType.CLEAR) {
      this.lightningFlash = 0;
      return;
    }

    // 1. Atmospheric Overcast/Storm Ambient Tint
    if (weather === WeatherType.OVERCAST) {
      this.ctx.fillStyle = 'rgba(75, 85, 100, 0.16)';
      this.ctx.fillRect(0, 0, width, height);
      return;
    }

    if (weather === WeatherType.RAIN) {
      this.ctx.fillStyle = 'rgba(30, 45, 70, 0.25)';
      this.ctx.fillRect(0, 0, width, height);
    } else if (weather === WeatherType.THUNDERSTORM) {
      this.ctx.fillStyle = 'rgba(15, 25, 50, 0.40)';
      this.ctx.fillRect(0, 0, width, height);
    }

    // 2. Initialize rain particles lazily if needed
    const dropCount = weather === WeatherType.THUNDERSTORM ? 220 : 130;
    while (this.rainDrops.length < dropCount) {
      this.rainDrops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 12 + Math.random() * 8,
        len: 8 + Math.random() * 6
      });
    }

    // 3. Render falling rain streaks
    this.ctx.strokeStyle = weather === WeatherType.THUNDERSTORM ? 'rgba(215, 235, 255, 0.7)' : 'rgba(186, 230, 253, 0.55)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    for (let i = 0; i < dropCount; i++) {
      const drop = this.rainDrops[i];
      // Wind drift to the left-down
      this.ctx.moveTo(drop.x, drop.y);
      this.ctx.lineTo(drop.x - 2, drop.y + drop.len);

      drop.x -= 2;
      drop.y += drop.speed;

      // Wrap around
      if (drop.y > height) {
        drop.y = -10;
        drop.x = Math.random() * (width + 50);
      }
      if (drop.x < -10) {
        drop.x = width + 10;
      }
    }
    this.ctx.stroke();

    // 4. Thunderstorm Lightning Flash
    if (weather === WeatherType.THUNDERSTORM) {
      if (this.lightningFlash > 0) {
        this.lightningFlash--;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.45 + Math.random() * 0.25})`;
        this.ctx.fillRect(0, 0, width, height);
      } else if (Math.random() < 0.003) {
        // Trigger sudden flash
        this.lightningFlash = 3;
        sounds.playThunder();
      }
    }
  }
}
