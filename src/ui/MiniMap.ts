import { Grid } from '../simulation/Grid.ts';
import { Camera } from '../core/Camera.ts';
import { TileType, ZoneType } from '../core/Constants.ts';

export class MiniMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: Grid;
  private camera: Camera;
  private isPointerDown: boolean = false;
  private containerEl: HTMLElement;
  private toggleBtn: HTMLButtonElement;

  constructor(
    canvas: HTMLCanvasElement,
    containerEl: HTMLElement,
    toggleBtn: HTMLButtonElement,
    grid: Grid,
    camera: Camera
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.containerEl = containerEl;
    this.toggleBtn = toggleBtn;
    this.grid = grid;
    this.camera = camera;

    this.setupEvents();
  }

  private setupEvents() {
    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.containerEl.classList.toggle('collapsed');
      this.toggleBtn.textContent = this.containerEl.classList.contains('collapsed') ? '+' : '−';
    });

    const handleInteract = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const scaleX = this.grid.size / this.canvas.width;
      const scaleY = this.grid.size / this.canvas.height;

      const gridX = Math.max(0, Math.min(this.grid.size - 1, Math.floor(clickX * scaleX)));
      const gridY = Math.max(0, Math.min(this.grid.size - 1, Math.floor(clickY * scaleY)));

      this.camera.centerOnTile(gridX, gridY, window.innerWidth, window.innerHeight - 112);
    };

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isPointerDown = true;
        handleInteract(e);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerDown) {
        handleInteract(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPointerDown = false;
    });
  }

  public render() {
    if (this.containerEl.classList.contains('collapsed')) return;

    const ctx = this.ctx;
    const size = this.grid.size;
    const tileW = this.canvas.width / size; // 128 / 64 = 2px
    const tileH = this.canvas.height / size;

    // Fast 2D terrain pass
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        let color = '#244e20'; // Grass

        if (t.type === TileType.WATER) {
          color = '#1d4ed8'; // River
        } else if (t.type === TileType.HIGHWAY) {
          color = '#e2e8f0'; // Interstate 10
        } else if (t.type === TileType.AVENUE) {
          color = t.isBridge ? '#f8fafc' : '#cbd5e1'; // 4-Lane Avenue
        } else if (t.type === TileType.ROAD) {
          color = t.isBridge ? '#94a3b8' : '#64748b'; // Paved Road
        } else if (t.type === TileType.DIRT_ROAD) {
          color = t.isBridge ? '#a16207' : '#855b32'; // Dirt Road
        } else if (t.type === TileType.PARK) {
          color = '#15803d';
        } else if (t.type === TileType.POWER_PLANT || t.type === TileType.WATER_PUMP) {
          color = '#0284c7';
        } else if (t.type === TileType.BUS_DEPOT) {
          color = '#0284c7'; // Metro Cyan / Transit Blue
        } else if (t.type === TileType.BUS_STOP) {
          color = '#38bdf8'; // Bus stop beacon
        } else if (
          t.type === TileType.FIRE_STATION ||
          t.type === TileType.POLICE_STATION ||
          t.type === TileType.HOSPITAL ||
          t.type === TileType.SCHOOL
        ) {
          color = '#dc2626';
        } else if (t.building) {
          if (t.building.onFire) {
            color = '#ef4444';
          } else if (t.building.zone === ZoneType.RESIDENTIAL) {
            color = '#16a34a';
          } else if (t.building.zone === ZoneType.COMMERCIAL) {
            color = '#2563eb';
          } else if (t.building.zone === ZoneType.INDUSTRIAL) {
            color = '#d97706';
          }
        } else if (t.zone === ZoneType.RESIDENTIAL) {
          color = '#4ade80';
        } else if (t.zone === ZoneType.COMMERCIAL) {
          color = '#60a5fa';
        } else if (t.zone === ZoneType.INDUSTRIAL) {
          color = '#fbbf24';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
      }
    }

    // Draw Camera Viewport Frustum on mini-map
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight - 112;

    const c1 = this.camera.screenToWorld(0, 0);
    const c2 = this.camera.screenToWorld(viewportW, 0);
    const c3 = this.camera.screenToWorld(viewportW, viewportH);
    const c4 = this.camera.screenToWorld(0, viewportH);

    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';

    ctx.beginPath();
    ctx.moveTo(c1.gridX * tileW, c1.gridY * tileH);
    ctx.lineTo(c2.gridX * tileW, c2.gridY * tileH);
    ctx.lineTo(c3.gridX * tileW, c3.gridY * tileH);
    ctx.lineTo(c4.gridX * tileW, c4.gridY * tileH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
