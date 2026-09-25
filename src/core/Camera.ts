import { TILE_WIDTH, TILE_HEIGHT } from './Constants.ts';

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1.0;
  public minZoom: number = 0.5;
  public maxZoom: number = 2.5;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;

  constructor(viewportWidth: number, viewportHeight: number, mapSize: number) {
    this.centerOnMap(viewportWidth, viewportHeight, mapSize);
  }

  public centerOnMap(viewportWidth: number, viewportHeight: number, mapSize: number) {
    this.centerOnTile(Math.floor(mapSize * 0.45), Math.floor(mapSize * 0.25), viewportWidth, viewportHeight);
  }

  public centerOnTile(gridX: number, gridY: number, viewportWidth: number, viewportHeight: number) {
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;
    const isoX = (gridX - gridY) * halfW;
    const isoY = (gridX + gridY) * halfH;

    this.x = viewportWidth / 2 - isoX * this.zoom;
    this.y = viewportHeight / 2 - isoY * this.zoom;
  }

  /**
   * Convert isometric grid coordinates (gridX, gridY) to screen pixel coordinates
   */
  public worldToScreen(gridX: number, gridY: number, elevation: number = 0): { x: number; y: number } {
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;
    const isoX = (gridX - gridY) * halfW;
    const isoY = (gridX + gridY) * halfH - elevation * 12;

    return {
      x: this.x + isoX * this.zoom,
      y: this.y + isoY * this.zoom
    };
  }

  /**
   * Convert screen pixel coordinates (clientX, clientY relative to canvas) to isometric grid coordinates
   */
  public screenToWorld(screenX: number, screenY: number): { gridX: number; gridY: number } {
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    const unscaledX = (screenX - this.x) / this.zoom;
    const unscaledY = (screenY - this.y) / this.zoom;

    const gridX = Math.floor((unscaledY / halfH + unscaledX / halfW) / 2);
    const gridY = Math.floor((unscaledY / halfH - unscaledX / halfW) / 2);

    return { gridX, gridY };
  }

  public startDrag(screenX: number, screenY: number) {
    this.isDragging = true;
    this.dragStartX = screenX;
    this.dragStartY = screenY;
    this.cameraStartX = this.x;
    this.cameraStartY = this.y;
  }

  public drag(screenX: number, screenY: number) {
    if (!this.isDragging) return;
    this.x = this.cameraStartX + (screenX - this.dragStartX);
    this.y = this.cameraStartY + (screenY - this.dragStartY);
  }

  public endDrag() {
    this.isDragging = false;
  }

  public isCurrentlyDragging(): boolean {
    return this.isDragging;
  }

  public zoomAt(deltaZoom: number, cursorScreenX: number, cursorScreenY: number) {
    const oldZoom = this.zoom;
    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, oldZoom * deltaZoom));
    if (newZoom === oldZoom) return;

    // Zoom centered on the cursor
    const mouseWorldX = (cursorScreenX - this.x) / oldZoom;
    const mouseWorldY = (cursorScreenY - this.y) / oldZoom;

    this.zoom = newZoom;
    this.x = cursorScreenX - mouseWorldX * newZoom;
    this.y = cursorScreenY - mouseWorldY * newZoom;
  }
}
