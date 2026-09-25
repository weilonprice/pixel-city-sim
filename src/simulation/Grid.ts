import { MAP_SIZE, Tile, TileType, ZoneType, isAnyRoad, isTrackOrStation } from '../core/Constants.ts';

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
          transitCoverage: 0,
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
    if (!tile) return;

    if (tile.type === TileType.TRAIN_TRACK) {
      let mask = 0;
      const n = this.getTile(x, y - 1);
      const e = this.getTile(x + 1, y);
      const s = this.getTile(x, y + 1);
      const w = this.getTile(x - 1, y);

      const isConnectable = (t: Tile | null) => t && isTrackOrStation(t.type);

      if (isConnectable(n)) mask |= 1;
      if (isConnectable(e)) mask |= 2;
      if (isConnectable(s)) mask |= 4;
      if (isConnectable(w)) mask |= 8;

      tile.roadMask = mask;
      return;
    }

    if (!isAnyRoad(tile.type)) return;

    let mask = 0;
    const n = this.getTile(x, y - 1);
    const e = this.getTile(x + 1, y);
    const s = this.getTile(x, y + 1);
    const w = this.getTile(x - 1, y);

    const isConnectable = (t: Tile | null) => t && isAnyRoad(t.type);

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
        if (isAnyRoad(t.type) && t.type !== TileType.HIGHWAY && !t.connectedToHighway) {
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
  public recalculateServiceCoverages(
    fundingFire: number = 100,
    fundingPolice: number = 100,
    fundingHealth: number = 100,
    fundingEducation: number = 100,
    fundingTransit: number = 100,
    ordinances?: { cleanEnergy?: boolean; neighborhoodWatch?: boolean; readingCampaign?: boolean; freeTransit?: boolean }
  ) {
    const size = this.size;

    const fireRadius = Math.max(4, Math.round(14 * (fundingFire / 100)));
    const policeRadius = Math.max(4, Math.round(14 * (fundingPolice / 100)));
    const healthRadius = Math.max(5, Math.round(16 * (fundingHealth / 100)));
    let educationRadius = Math.max(4, Math.round(14 * (fundingEducation / 100)));
    if (ordinances?.readingCampaign) {
      educationRadius = Math.round(educationRadius * 1.25);
    }
    let transitRadius = Math.max(3, Math.round(8 * (fundingTransit / 100)));
    if (ordinances?.freeTransit) {
      transitRadius = Math.round(transitRadius * 1.25);
    }

    // Count operational Bus Depots (must be powered, watered, and adjacent to a road)
    let operationalDepots = 0;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.tiles[x][y];
        if (t.type === TileType.BUS_DEPOT && t.powered && t.watered && this.isAdjacentToRoad(x, y)) {
          operationalDepots++;
        }
      }
    }

    // Reset temporary layers
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.tiles[x][y];
        t.fireCoverage = 0;
        t.policeCoverage = 0;
        t.healthCoverage = 0;
        t.educationCoverage = 0;
        t.transitCoverage = 0;
        t.pollution = 0;
        t.landValue = 25; // baseline land value
      }
    }

    // Pass 1: Radii emissions from services and industrial emitters
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.tiles[x][y];

        // Fire Station Coverage
        if (t.type === TileType.FIRE_STATION && t.powered && t.watered) {
          this.applyRadialEffect(x, y, fireRadius, (target, dist) => {
            target.fireCoverage = Math.max(target.fireCoverage, Math.round(100 * (1 - dist / fireRadius)));
          });
        }

        // Police Station Coverage
        if (t.type === TileType.POLICE_STATION && t.powered && t.watered) {
          this.applyRadialEffect(x, y, policeRadius, (target, dist) => {
            target.policeCoverage = Math.max(target.policeCoverage, Math.round(100 * (1 - dist / policeRadius)));
          });
        }

        // Hospital / Clinic Coverage
        if (t.type === TileType.HOSPITAL && t.powered && t.watered) {
          this.applyRadialEffect(x, y, healthRadius, (target, dist) => {
            target.healthCoverage = Math.max(target.healthCoverage, Math.round(100 * (1 - dist / healthRadius)));
            target.landValue += Math.round(15 * (1 - dist / healthRadius));
          });
        }

        // School Coverage
        if (t.type === TileType.SCHOOL && t.powered && t.watered) {
          this.applyRadialEffect(x, y, educationRadius, (target, dist) => {
            target.educationCoverage = Math.max(target.educationCoverage, Math.round(100 * (1 - dist / educationRadius)));
            target.landValue += Math.round(12 * (1 - dist / educationRadius));
          });
        }

        // Parks (Radius 8)
        if (t.type === TileType.PARK) {
          this.applyRadialEffect(x, y, 8, (target, dist) => {
            target.landValue += Math.round(30 * (1 - dist / 8));
          });
        }

        // Downtown Avenues (Boulevard Land Value Boost, Radius 3)
        if (t.type === TileType.AVENUE) {
          this.applyRadialEffect(x, y, 3, (target, dist) => {
            target.landValue = Math.min(100, target.landValue + Math.round(15 * (1 - dist / 3)));
          });
        }

        // Public Bus Stop Coverage (Active when at least 1 operational Bus Depot exists in the city)
        if (t.type === TileType.BUS_STOP && operationalDepots > 0 && this.isAdjacentToRoad(x, y)) {
          this.applyRadialEffect(x, y, transitRadius, (target, dist) => {
            target.transitCoverage = Math.max(target.transitCoverage, Math.round(100 * (1 - dist / transitRadius)));
            target.landValue = Math.min(100, target.landValue + Math.round(12 * (1 - dist / transitRadius)));
          });
        }

        // Bus Depot localized transit presence
        if (t.type === TileType.BUS_DEPOT && t.powered && t.watered && this.isAdjacentToRoad(x, y)) {
          this.applyRadialEffect(x, y, 4, (target, dist) => {
            target.transitCoverage = Math.max(target.transitCoverage, Math.round(60 * (1 - dist / 4)));
            target.landValue = Math.min(100, target.landValue + Math.round(6 * (1 - dist / 4)));
          });
        }

        // Mayor's Historic Mansion (Civic Prestige & High Land Value, Radius 10)
        if (t.type === TileType.MAYORS_MANSION && t.powered && t.watered) {
          this.applyRadialEffect(x, y, 10, (target, dist) => {
            target.landValue = Math.min(100, target.landValue + Math.round(25 * (1 - dist / 10)));
          });
        }

        // City Hall (Municipal Headquarters & Public Stability, Radius 12)
        if (t.type === TileType.CITY_HALL && t.powered && t.watered) {
          this.applyRadialEffect(x, y, 12, (target, dist) => {
            target.landValue = Math.min(100, target.landValue + Math.round(35 * (1 - dist / 12)));
            target.policeCoverage = Math.max(target.policeCoverage, Math.round(60 * (1 - dist / 12)));
          });
        }

        // Grand Central Terminal (Iconic Metropolitan Transit Hub, Radius 16)
        if (t.type === TileType.GRAND_CENTRAL && t.powered && t.watered) {
          this.applyRadialEffect(x, y, 16, (target, dist) => {
            target.transitCoverage = Math.max(target.transitCoverage, Math.round(100 * (1 - dist / 16)));
            target.landValue = Math.min(100, target.landValue + Math.round(40 * (1 - dist / 16)));
          });
        }

        // Passenger Train Station (Regional Heavy Rail Hub, Radius 14, High Transit & Land Value)
        if (t.type === TileType.TRAIN_STATION && t.powered && t.watered) {
          this.applyRadialEffect(x, y, 14, (target, dist) => {
            target.transitCoverage = Math.max(target.transitCoverage, Math.round(100 * (1 - dist / 14)));
            target.landValue = Math.min(100, target.landValue + Math.round(30 * (1 - dist / 14)));
          });
        }

        // Heavy Railroad Track (Localized corridor transit coverage, Radius 2)
        if (t.type === TileType.TRAIN_TRACK) {
          this.applyRadialEffect(x, y, 2, (target, dist) => {
            target.transitCoverage = Math.max(target.transitCoverage, Math.round(40 * (1 - dist / 2)));
          });
        }

        // Pollution from Industrial Zones & Coal Power Plants (Radius 9)
        if (t.type === TileType.POWER_PLANT || (t.building && t.building.zone === ZoneType.INDUSTRIAL)) {
          let intensity = t.type === TileType.POWER_PLANT ? 70 : 45;
          if (ordinances?.cleanEnergy && t.type === TileType.POWER_PLANT) {
            intensity = Math.round(intensity * 0.6); // 40% reduction in power plant pollution
          }
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
          let rawCrime = Math.max(0, 60 - t.policeCoverage - Math.floor(t.landValue / 4));
          if (ordinances?.neighborhoodWatch && t.building.zone === ZoneType.RESIDENTIAL) {
            rawCrime = Math.round(rawCrime * 0.65); // 35% reduction from neighborhood watch
          }
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
    return neighbors.some(n => isAnyRoad(n.tile.type));
  }

  public isAdjacentToHighwayConnectedRoad(x: number, y: number): boolean {
    const neighbors = this.getNeighbors(x, y);
    return neighbors.some(n => isAnyRoad(n.tile.type) && n.tile.type !== TileType.HIGHWAY && n.tile.connectedToHighway);
  }

  public isAdjacentToTrack(x: number, y: number): boolean {
    const neighbors = this.getNeighbors(x, y);
    return neighbors.some(n => isTrackOrStation(n.tile.type));
  }
}
