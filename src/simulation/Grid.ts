import { MAP_SIZE, Tile, TileType, ZoneType } from '../core/Constants.ts';

export class Grid {
  public size: number;
  public tiles: Tile[][];

  constructor(size: number = MAP_SIZE) {
    this.size = size;
    this.tiles = [];
    this.initMap();
  }

  private initMap() {
    this.tiles = [];

    // Create a natural landscape with a meandering river
    const riverXCenter = Math.floor(this.size * 0.75);

    for (let x = 0; x < this.size; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.size; y++) {
        // Meandering river curve
        const riverOffset = Math.sin(y / 4) * 3;
        const distToRiver = Math.abs(x - (riverXCenter + riverOffset));

        let type = TileType.GRASS;
        let elevation = 0;

        if (distToRiver < 2.2) {
          type = TileType.WATER;
          elevation = -1;
        }

        this.tiles[x][y] = {
          x,
          y,
          elevation,
          type,
          zone: ZoneType.NONE,
          roadMask: 0,
          powered: false,
          watered: false,
          landValue: 10,
          pollution: 0,
          variant: Math.floor(Math.random() * 4)
        };
      }
    }
  }

  public getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      return null;
    }
    return this.tiles[x][y];
  }

  public isValidCoord(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  /**
   * Returns cardinal neighbors (N, E, S, W)
   * In 2D isometric grid:
   * North = (x, y - 1)
   * East  = (x + 1, y)
   * South = (x, y + 1)
   * West  = (x - 1, y)
   */
  public getNeighbors(x: number, y: number): { dir: 'N' | 'E' | 'S' | 'W'; tile: Tile }[] {
    const neighbors: { dir: 'N' | 'E' | 'S' | 'W'; tile: Tile }[] = [];
    const deltas: { dir: 'N' | 'E' | 'S' | 'W'; dx: number; dy: number }[] = [
      { dir: 'N', dx: 0, dy: -1 },
      { dir: 'E', dx: 1, dy: 0 },
      { dir: 'S', dx: 0, dy: 1 },
      { dir: 'W', dx: -1, dy: 0 }
    ];

    for (const d of deltas) {
      const tile = this.getTile(x + d.dx, y + d.dy);
      if (tile) {
        neighbors.push({ dir: d.dir, tile });
      }
    }

    return neighbors;
  }

  /**
   * Recalculate 4-bit road autotiling bitmask:
   * Bit 0 (1): North (x, y - 1)
   * Bit 1 (2): East  (x + 1, y)
   * Bit 2 (4): South (x, y + 1)
   * Bit 3 (8): West  (x - 1, y)
   */
  public updateRoadMask(x: number, y: number) {
    const tile = this.getTile(x, y);
    if (!tile || tile.type !== TileType.ROAD) return;

    let mask = 0;
    const n = this.getTile(x, y - 1);
    const e = this.getTile(x + 1, y);
    const s = this.getTile(x, y + 1);
    const w = this.getTile(x - 1, y);

    if (n && n.type === TileType.ROAD) mask |= 1;
    if (e && e.type === TileType.ROAD) mask |= 2;
    if (s && s.type === TileType.ROAD) mask |= 4;
    if (w && w.type === TileType.ROAD) mask |= 8;

    tile.roadMask = mask;
  }

  /**
   * Updates road masks for a tile and its 4 neighbors
   */
  public updateRoadAndNeighbors(x: number, y: number) {
    this.updateRoadMask(x, y);
    this.updateRoadMask(x, y - 1);
    this.updateRoadMask(x + 1, y);
    this.updateRoadMask(x, y + 1);
    this.updateRoadMask(x - 1, y);
  }

  /**
   * Check if a tile is adjacent to any road tile
   */
  public isAdjacentToRoad(x: number, y: number): boolean {
    const neighbors = this.getNeighbors(x, y);
    return neighbors.some(n => n.tile.type === TileType.ROAD);
  }
}
