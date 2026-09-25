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

    // River running down the eastern portion of the 64x64 map
    const riverXCenter = Math.floor(this.size * 0.78);

    for (let x = 0; x < this.size; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.size; y++) {
        // Natural serpentine river curve
        const riverOffset = Math.sin(y / 6) * 4 + Math.cos(y / 12) * 2;
        const distToRiver = Math.abs(x - (riverXCenter + riverOffset));

        let type = TileType.GRASS;
        let elevation = 0;

        if (distToRiver < 2.5) {
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
          connectedToHighway: false,
          landValue: 10,
          pollution: 0,
          variant: Math.floor(Math.random() * 4)
        };
      }
    }

    // Build the pre-existing regional Interstate Highway (Interstate 10)
    // Running East-West across y = 14 from border to border
    this.buildStarterInterstate();
  }

  private buildStarterInterstate() {
    const highwayY = 14;

    for (let x = 0; x < this.size; x++) {
      const tile = this.tiles[x][highwayY];
      tile.type = TileType.HIGHWAY;
      tile.connectedToHighway = true;
      tile.zone = ZoneType.NONE;
      // Over water it acts as a highway bridge
      if (tile.elevation < 0) {
        tile.elevation = 0; // elevated over river
      }
    }

    // Build Starter Off-Ramp / Diamond Interchange at x = 28 to 32
    // Connecting Highway (y=14) to local stub road (y=16..18)
    const rampX1 = 28;
    const rampX2 = 32;

    // Ramps merging off the highway
    this.tiles[rampX1][highwayY + 1].type = TileType.HIGHWAY;
    this.tiles[rampX1][highwayY + 1].isRamp = true;
    this.tiles[rampX1][highwayY + 1].connectedToHighway = true;

    this.tiles[rampX2][highwayY + 1].type = TileType.HIGHWAY;
    this.tiles[rampX2][highwayY + 1].isRamp = true;
    this.tiles[rampX2][highwayY + 1].connectedToHighway = true;

    // Local road connector bridge between ramps
    for (let x = rampX1; x <= rampX2; x++) {
      const t = this.tiles[x][highwayY + 2];
      t.type = TileType.ROAD;
      t.connectedToHighway = true;
    }

    // Starter Avenue / Boulevard stubs leading South into the city plot
    const entryRoadX = 30;
    for (let y = highwayY + 2; y <= highwayY + 5; y++) {
      const t = this.tiles[entryRoadX][y];
      t.type = TileType.ROAD;
      t.connectedToHighway = true;
    }

    // Update road autotiling masks for pre-built roads
    for (let x = rampX1 - 1; x <= rampX2 + 1; x++) {
      for (let y = highwayY; y <= highwayY + 6; y++) {
        if (this.isValidCoord(x, y)) {
          this.updateRoadMask(x, y);
        }
      }
    }

    this.updateHighwayConnectivity();
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
    if (!tile || (tile.type !== TileType.ROAD && tile.type !== TileType.HIGHWAY)) return;

    let mask = 0;
    const n = this.getTile(x, y - 1);
    const e = this.getTile(x + 1, y);
    const s = this.getTile(x, y + 1);
    const w = this.getTile(x - 1, y);

    const isConnectable = (t: Tile | null) => t && (t.type === TileType.ROAD || t.type === TileType.HIGHWAY);

    if (isConnectable(n)) mask |= 1;
    if (isConnectable(e)) mask |= 2;
    if (isConnectable(s)) mask |= 4;
    if (isConnectable(w)) mask |= 8;

    tile.roadMask = mask;
  }

  public updateRoadAndNeighbors(x: number, y: number) {
    this.updateRoadMask(x, y);
    this.updateRoadMask(x, y - 1);
    this.updateRoadMask(x + 1, y);
    this.updateRoadMask(x, y + 1);
    this.updateRoadMask(x - 1, y);
    this.updateHighwayConnectivity();
  }

  /**
   * BFS to propagate Highway connectivity across all connected road networks
   */
  public updateHighwayConnectivity() {
    // Reset connectivity on all normal roads and buildings
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const t = this.tiles[x][y];
        if (t.type !== TileType.HIGHWAY) {
          t.connectedToHighway = false;
        }
        if (t.building) {
          t.building.hasHighwayAccess = false;
        }
      }
    }

    // Seed BFS queue with all highway tiles
    const queue: Tile[] = [];
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const t = this.tiles[x][y];
        if (t.type === TileType.HIGHWAY) {
          queue.push(t);
        }
      }
    }

    // Traverse all connected roads
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = this.getNeighbors(curr.x, curr.y);

      for (const n of neighbors) {
        const t = n.tile;
        if (t.type === TileType.ROAD && !t.connectedToHighway) {
          t.connectedToHighway = true;
          queue.push(t);
        }
      }
    }

    // Now update highway access flag on buildings that border a highway-connected road
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const t = this.tiles[x][y];
        if (t.building) {
          t.building.hasHighwayAccess = this.isAdjacentToHighwayConnectedRoad(x, y);
        }
      }
    }
  }

  public isAdjacentToRoad(x: number, y: number): boolean {
    const neighbors = this.getNeighbors(x, y);
    return neighbors.some(n => n.tile.type === TileType.ROAD);
  }

  public isAdjacentToHighwayConnectedRoad(x: number, y: number): boolean {
    const neighbors = this.getNeighbors(x, y);
    return neighbors.some(n => n.tile.type === TileType.ROAD && n.tile.connectedToHighway);
  }
}
