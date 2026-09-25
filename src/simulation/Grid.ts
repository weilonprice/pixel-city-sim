import { MAP_SIZE, Tile, TileType, ZoneType } from '../core/Constants.ts';

export class Grid {
  public size: number;
  public tiles: Tile[][];

  constructor(size: number = MAP_SIZE) {
    this.size = size;
    this.tiles = [];
    this.initMap();
  }

  public initMap() {
    this.tiles = [];

    const riverXCenter = Math.floor(this.size * 0.78);

    for (let x = 0; x < this.size; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.size; y++) {
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
          landValue: 20,
          pollution: 0,
          crime: 0,
          fireCoverage: 0,
          policeCoverage: 0,
          healthCoverage: 0,
          educationCoverage: 0,
          variant: Math.floor(Math.random() * 4)
        };
      }
    }

    this.buildStarterInterstate();
  }

  private buildStarterInterstate() {
    const highwayY = 14;

    for (let x = 0; x < this.size; x++) {
      const tile = this.tiles[x][highwayY];
      tile.type = TileType.HIGHWAY;
      tile.connectedToHighway = true;
      tile.zone = ZoneType.NONE;
      if (tile.elevation < 0) {
        tile.elevation = 0;
        tile.isBridge = true;
      }
    }

    const rampX1 = 28;
    const rampX2 = 32;

    this.tiles[rampX1][highwayY + 1].type = TileType.HIGHWAY;
    this.tiles[rampX1][highwayY + 1].isRamp = true;
    this.tiles[rampX1][highwayY + 1].connectedToHighway = true;

    this.tiles[rampX2][highwayY + 1].type = TileType.HIGHWAY;
    this.tiles[rampX2][highwayY + 1].isRamp = true;
    this.tiles[rampX2][highwayY + 1].connectedToHighway = true;

    for (let x = rampX1; x <= rampX2; x++) {
      const t = this.tiles[x][highwayY + 2];
      t.type = TileType.ROAD;
      t.connectedToHighway = true;
    }

    const entryRoadX = 30;
    for (let y = highwayY + 2; y <= highwayY + 5; y++) {
      const t = this.tiles[entryRoadX][y];
      t.type = TileType.ROAD;
      t.connectedToHighway = true;
    }

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

  public updateHighwayConnectivity() {
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

    const queue: Tile[] = [];
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const t = this.tiles[x][y];
        if (t.type === TileType.HIGHWAY) {
          queue.push(t);
        }
      }
    }

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

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const t = this.tiles[x][y];
        if (t.building) {
          t.building.hasHighwayAccess = this.isAdjacentToHighwayConnectedRoad(x, y);
        }
      }
    }
  }

  /**
   * Spatial coverage recalculation for all services & environmental heatmaps
   */
  public recalculateServiceCoverages() {
    const size = this.size;

    // Reset temporary layers
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.tiles[x][y];
        t.fireCoverage = 0;
        t.policeCoverage = 0;
        t.healthCoverage = 0;
        t.educationCoverage = 0;
        t.pollution = 0;
        t.landValue = 25; // baseline land value
      }
    }

    // Pass 1: Radii emissions from services and industrial emitters
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.tiles[x][y];

        // Fire Station Coverage (Radius 14)
        if (t.type === TileType.FIRE_STATION && t.powered && t.watered) {
          this.applyRadialEffect(x, y, 14, (target, dist) => {
            target.fireCoverage = Math.max(target.fireCoverage, Math.round(100 * (1 - dist / 14)));
          });
        }

        // Police Station Coverage (Radius 14)
        if (t.type === TileType.POLICE_STATION && t.powered && t.watered) {
          this.applyRadialEffect(x, y, 14, (target, dist) => {
            target.policeCoverage = Math.max(target.policeCoverage, Math.round(100 * (1 - dist / 14)));
          });
        }

        // Hospital / Clinic Coverage (Radius 16)
        if (t.type === TileType.HOSPITAL && t.powered && t.watered) {
          this.applyRadialEffect(x, y, 16, (target, dist) => {
            target.healthCoverage = Math.max(target.healthCoverage, Math.round(100 * (1 - dist / 16)));
            target.landValue += Math.round(15 * (1 - dist / 16));
          });
        }

        // School Coverage (Radius 14)
        if (t.type === TileType.SCHOOL && t.powered && t.watered) {
          this.applyRadialEffect(x, y, 14, (target, dist) => {
            target.educationCoverage = Math.max(target.educationCoverage, Math.round(100 * (1 - dist / 14)));
            target.landValue += Math.round(12 * (1 - dist / 14));
          });
        }

        // Parks (Radius 8)
        if (t.type === TileType.PARK) {
          this.applyRadialEffect(x, y, 8, (target, dist) => {
            target.landValue += Math.round(30 * (1 - dist / 8));
          });
        }

        // Pollution from Industrial Zones & Coal Power Plants (Radius 9)
        if (t.type === TileType.POWER_PLANT || (t.building && t.building.zone === ZoneType.INDUSTRIAL)) {
          const intensity = t.type === TileType.POWER_PLANT ? 70 : 45;
          this.applyRadialEffect(x, y, 9, (target, dist) => {
            target.pollution = Math.min(100, target.pollution + Math.round(intensity * (1 - dist / 9)));
            target.landValue = Math.max(5, target.landValue - Math.round(25 * (1 - dist / 9)));
          });
        }
      }
    }

    // Pass 2: Calculate crime based on police coverage and land value
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.tiles[x][y];
        if (t.building) {
          const rawCrime = Math.max(0, 60 - t.policeCoverage - Math.floor(t.landValue / 4));
          t.crime = Math.min(100, rawCrime);
        } else {
          t.crime = 0;
        }
      }
    }
  }

  private applyRadialEffect(centerX: number, centerY: number, radius: number, fn: (tile: Tile, dist: number) => void) {
    const minX = Math.max(0, centerX - radius);
    const maxX = Math.min(this.size - 1, centerX + radius);
    const minY = Math.max(0, centerY - radius);
    const maxY = Math.min(this.size - 1, centerY + radius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const dist = Math.hypot(x - centerX, y - centerY);
        if (dist <= radius) {
          fn(this.tiles[x][y], dist);
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
