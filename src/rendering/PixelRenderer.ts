import { TILE_WIDTH, TILE_HEIGHT, TileType, ZoneType, Tile } from '../core/Constants.ts';
import { Camera } from '../core/Camera.ts';
import { Grid } from '../simulation/Grid.ts';
import { assetManager } from './AssetManager.ts';

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
}

export class PixelRenderer {
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private grid: Grid;
  private animFrame: number = 0;
  private particles: Particle[] = [];
  private vehicles: Vehicle[] = [];

  constructor(ctx: CanvasRenderingContext2D, camera: Camera, grid: Grid) {
    this.ctx = ctx;
    this.camera = camera;
    this.grid = grid;
  }

  public render(hoverGridX: number, hoverGridY: number, activeTool: string) {
    this.animFrame++;
    const { width, height } = this.ctx.canvas;

    // Background color (dark retro space / void)
    this.ctx.fillStyle = '#151520';
    this.ctx.fillRect(0, 0, width, height);

    // Disable smoothing for sharp pixel art
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

        // Check if this tile has an active hover
        if (x === hoverGridX && y === hoverGridY) {
          this.renderHoverHighlight(tile, activeTool);
        }
      }
    }

    // Render vehicles on roads and highway
    this.updateAndRenderVehicles();

    // Render smoke particles
    this.updateAndRenderParticles();
  }

  private renderTile(tile: Tile) {
    const { x: sx, y: sy } = this.camera.worldToScreen(tile.x, tile.y, tile.elevation);
    const halfW = (TILE_WIDTH / 2) * this.camera.zoom;
    const halfH = (TILE_HEIGHT / 2) * this.camera.zoom;

    // Viewport Culling check
    const margin = 140 * this.camera.zoom;
    if (
      sx + halfW < -margin ||
      sx - halfW > this.ctx.canvas.width + margin ||
      sy + halfH < -margin ||
      sy - halfH > this.ctx.canvas.height + margin
    ) {
      return;
    }

    // 1. Render Base Ground Diamond
    if (tile.type === TileType.WATER) {
      this.drawWaterTile(sx, sy, halfW, halfH, tile.variant);
    } else {
      this.drawGrassTile(sx, sy, halfW, halfH, tile.variant);
    }

    // 2. Render Zone Overlays
    if (tile.zone !== ZoneType.NONE && !tile.building) {
      this.drawZoneOverlay(sx, sy, halfW, halfH, tile.zone);
    }

    // 3. Render Highway / Interstate
    if (tile.type === TileType.HIGHWAY) {
      this.drawHighwayTile(sx, sy, halfW, halfH, tile);
    }
    // 4. Render Local Roads
    else if (tile.type === TileType.ROAD) {
      this.drawRoadTile(sx, sy, halfW, halfH, tile.roadMask, tile.connectedToHighway);
    }

    // 5. Render Structures
    if (tile.type === TileType.PARK) {
      this.drawPark(sx, sy, halfW, halfH, tile.variant);
    } else if (tile.type === TileType.POWER_PLANT) {
      this.drawPowerPlant(sx, sy, halfW, halfH);
    } else if (tile.type === TileType.WATER_PUMP) {
      this.drawWaterPump(sx, sy, halfW, halfH);
    } else if (tile.building) {
      this.drawBuilding(sx, sy, halfW, halfH, tile);
    }
  }

  /**
   * Grass diamond with 3D terrain rim depth
   */
  private drawGrassTile(sx: number, sy: number, hw: number, hh: number, variant: number) {
    const ctx = this.ctx;

    // Ground 3D extrusion slab (dark earth rim)
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

    // Top grass face
    const grassColors = ['#448937', '#4b963d', '#3f8033', '#478f39'];
    ctx.fillStyle = grassColors[variant % grassColors.length];
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fill();

    // Subtle pixel grid border line
    ctx.strokeStyle = '#38732e';
    ctx.lineWidth = Math.max(1, 1 * this.camera.zoom);
    ctx.stroke();

    // Grass blade speckles
    if (this.camera.zoom >= 0.8) {
      ctx.fillStyle = '#57ac47';
      const speckX = sx + ((variant * 7) % 15 - 7) * this.camera.zoom;
      const speckY = sy + ((variant * 11) % 7 - 3) * this.camera.zoom;
      ctx.fillRect(speckX, speckY, 2 * this.camera.zoom, 2 * this.camera.zoom);
    }
  }

  /**
   * Water diamond with animated pixel wave shimmer
   */
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

    // Animated water shimmer wave line
    const waveShift = ((this.animFrame / 15 + variant) % 1);
    ctx.fillStyle = '#60a5fa';
    const waveY = sy - hh / 2 + waveShift * hh;
    ctx.fillRect(sx - hw / 3, waveY, (hw * 2) / 3, 2 * this.camera.zoom);
  }

  /**
   * Zone outline tinting (Green R, Blue C, Yellow I)
   */
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

  /**
   * Interstate Highway Rendering (Wide 4-lane divided freeway with median & bridge pillars)
   */
  private drawHighwayTile(sx: number, sy: number, hw: number, hh: number, tile: Tile) {
    const ctx = this.ctx;
    const z = this.camera.zoom;

    // Bridge concrete pillars if crossing water
    if (tile.elevation >= 0 && this.grid.getTile(tile.x, tile.y)?.elevation === 0 && this.isNearWater(tile.x, tile.y)) {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx - 4 * z, sy + hh, 8 * z, 14 * z);
    }

    // Wide Interstate dark asphalt surface
    ctx.fillStyle = '#22222a';
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fill();

    // Concrete highway shoulder barriers
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2 * z;
    ctx.stroke();

    // Center Concrete Jersey Barrier / Yellow Divider
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2 * z;
    ctx.beginPath();
    ctx.moveTo(sx - hw * 0.7, sy);
    ctx.lineTo(sx + hw * 0.7, sy);
    ctx.stroke();

    // White dashed lane markers on both sides of median
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1 * z;
    ctx.setLineDash([4 * z, 4 * z]);

    // Northbound lane dash
    ctx.beginPath();
    ctx.moveTo(sx - hw * 0.6, sy - hh * 0.35);
    ctx.lineTo(sx + hw * 0.6, sy - hh * 0.35);
    ctx.stroke();

    // Southbound lane dash
    ctx.beginPath();
    ctx.moveTo(sx - hw * 0.6, sy + hh * 0.35);
    ctx.lineTo(sx + hw * 0.6, sy + hh * 0.35);
    ctx.stroke();

    ctx.setLineDash([]); // reset dash

    // If ramp connector
    if (tile.isRamp) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx - 3 * z, sy, 6 * z, 4 * z);
    }

    // Interstate 10 Highway Sign near interchange (x=30, y=14)
    if (tile.x === 30 && tile.y === 14) {
      ctx.fillStyle = '#15803d'; // Green highway sign
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

  /**
   * Road rendering with 4-way autotiling bitmask
   */
  private drawRoadTile(sx: number, sy: number, hw: number, hh: number, mask: number, connectedToHighway: boolean) {
    const ctx = this.ctx;
    const roadColor = connectedToHighway ? '#33333e' : '#454552';
    const roadBorder = '#1c1c24';
    const stripeColor = connectedToHighway ? '#fbbf24' : '#9ca3af';

    // Asphalt base
    ctx.fillStyle = roadColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = roadBorder;
    ctx.lineWidth = Math.max(1, 1 * this.camera.zoom);
    ctx.stroke();

    const z = this.camera.zoom;
    ctx.fillStyle = stripeColor;

    // Straight SW-NE road
    if ((mask & 5) === 5 || mask === 0) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh * 0.6);
      ctx.lineTo(sx, sy + hh * 0.6);
      ctx.lineWidth = 2 * z;
      ctx.strokeStyle = stripeColor;
      ctx.stroke();
    }
    // Straight NW-SE road
    else if ((mask & 10) === 10) {
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

      if (mask & 1) { // North
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - hh * 0.6);
        ctx.stroke();
      }
      if (mask & 2) { // East
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + hw * 0.6, sy);
        ctx.stroke();
      }
      if (mask & 4) { // South
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + hh * 0.6);
        ctx.stroke();
      }
      if (mask & 8) { // West
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - hw * 0.6, sy);
        ctx.stroke();
      }
    }
  }

  /**
   * Procedural Pixel Buildings (Levels 1-3)
   */
  private drawBuilding(sx: number, sy: number, hw: number, hh: number, tile: Tile) {
    const b = tile.building;
    if (!b) return;

    const z = this.camera.zoom;

    // If still under initial construction
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

    // Power / Water / Highway Warning Icons
    if (!b.hasHighwayAccess && (this.animFrame % 60 < 35)) {
      this.drawWarningIcon(sx, sy - 40 * z, '🚫', '#ef4444');
    } else if (!b.powered && (this.animFrame % 60 < 35)) {
      this.drawWarningIcon(sx, sy - 40 * z, '⚡', '#facc15');
    } else if (!b.watered && (this.animFrame % 60 < 35)) {
      this.drawWarningIcon(sx, sy - 40 * z, '💧', '#38bdf8');
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

      // Left Wall
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.6, sy);
      ctx.lineTo(sx, sy + hh * 0.6);
      ctx.lineTo(sx, sy + hh * 0.6 - wallH);
      ctx.lineTo(sx - hw * 0.6, sy - wallH);
      ctx.closePath();
      ctx.fill();

      // Right Wall
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(sx, sy + hh * 0.6);
      ctx.lineTo(sx + hw * 0.6, sy);
      ctx.lineTo(sx + hw * 0.6, sy - wallH);
      ctx.lineTo(sx, sy + hh * 0.6 - wallH);
      ctx.closePath();
      ctx.fill();

      // Pitched Roof
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

      // Door & Window
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

    this.ctx.fillStyle = '#000000';
    for (let i = -6; i <= 6; i += 4) {
      this.ctx.fillRect(sx + i * z, sy - height - 4 * z, 2 * z, 6 * z);
    }
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

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(sx - 3 * z, sy - 23 * z, 6 * z, 0, Math.PI * 2);
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

    // Left Face
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx, sy + hh - height);
    ctx.lineTo(sx - hw, sy - height);
    ctx.closePath();
    ctx.fill();

    // Right Face
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy + hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx + hw, sy - height);
    ctx.lineTo(sx, sy + hh - height);
    ctx.closePath();
    ctx.fill();

    // Top Face
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
    ctx.save();
    ctx.font = `${Math.max(14, Math.floor(14 * this.camera.zoom))}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(symbol, sx, sy);
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

    // 1. Spawn Highway Interstate Semi-Trucks and Commuters
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
        speed: 0.08, // fast highway speed
        isTruck: Math.random() > 0.4
      });
    }

    // 2. Spawn Local City Vehicles on Connected Roads
    if (this.vehicles.length < 24 && Math.random() < 0.05) {
      const roadTiles: Tile[] = [];
      for (let x = 0; x < this.grid.size; x++) {
        for (let y = 0; y < this.grid.size; y++) {
          const t = this.grid.getTile(x, y);
          if (t && t.type === TileType.ROAD && t.connectedToHighway) roadTiles.push(t);
        }
      }

      if (roadTiles.length > 2) {
        const start = roadTiles[Math.floor(Math.random() * roadTiles.length)];
        const neighbors = this.grid.getNeighbors(start.x, start.y).filter(n => n.tile.type === TileType.ROAD);
        if (neighbors.length > 0) {
          const target = neighbors[Math.floor(Math.random() * neighbors.length)].tile;
          const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#f3f4f6'];
          this.vehicles.push({
            id: Math.random().toString(),
            x: start.x,
            y: start.y,
            targetX: target.x,
            targetY: target.y,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 0.035
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

        // If on interstate highway, continue along highway line
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
          // Local road navigation
          const neighbors = this.grid.getNeighbors(v.targetX, v.targetY).filter(n => n.tile.type === TileType.ROAD || n.tile.type === TileType.HIGHWAY);
          if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)].tile;
            v.targetX = next.x;
            v.targetY = next.y;
          } else {
            this.vehicles.splice(i, 1);
            continue;
          }
        }
      } else {
        v.x += (dx / dist) * v.speed;
        v.y += (dy / dist) * v.speed;
      }

      // Render vehicle sprite
      const { x: sx, y: sy } = this.camera.worldToScreen(v.x, v.y, 0);

      if (v.isTruck) {
        if (assetManager.hasSprite('semi_truck')) {
          const img = assetManager.getSprite('semi_truck')!;
          const w = 28 * z;
          const h = 21 * z;
          this.ctx.drawImage(img, sx - w / 2, sy - h * 0.7, w, h);
        } else {
          // Semi-truck trailer & cab
          this.ctx.fillStyle = '#e2e8f0'; // cab
          this.ctx.fillRect(sx - 6 * z, sy - 3 * z, 5 * z, 5 * z);
          this.ctx.fillStyle = v.color; // shipping container
          this.ctx.fillRect(sx - 1 * z, sy - 4 * z, 10 * z, 6 * z);
          this.ctx.fillStyle = '#000000'; // wheels
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
          // Passenger car / taxi
          this.ctx.fillStyle = v.color;
          this.ctx.fillRect(sx - 3 * z, sy - 2 * z, 6 * z, 4 * z);
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(sx - 2 * z, sy - 1 * z, 2 * z, 2 * z);
        }
      }
    }
  }
}
