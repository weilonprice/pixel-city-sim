import { TileType, ZoneType, Tile, BuildingData, UPKEEP } from '../core/Constants.ts';
import { Grid } from './Grid.ts';
import { sounds } from '../core/SoundEffects.ts';

export class SimulationEngine {
  public grid: Grid;
  public funds: number = 20000;
  public population: number = 0;
  public totalJobs: number = 0;

  // RCI Demands (-100 to +100)
  public demandR: number = 60;
  public demandC: number = 30;
  public demandI: number = 40;

  // Simulation Clock
  public speed: number = 1; // 0, 1, 2, 5
  public tickCount: number = 0;
  public month: number = 0;
  public year: number = 2000;

  private months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Event callbacks for UI
  public onStatsUpdate?: () => void;
  public onNotification?: (msg: string) => void;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  public setSpeed(speed: number) {
    this.speed = speed;
  }

  public tick() {
    if (this.speed === 0) return;

    for (let s = 0; s < this.speed; s++) {
      this.tickCount++;

      // 1. Update Utilities (Power & Water distribution via BFS)
      this.updateUtilities();

      // 2. Process Building Growth & RCI Demand (every 5 ticks)
      if (this.tickCount % 5 === 0) {
        this.processZoningAndGrowth();
      }

      // 3. Monthly Cycle (every 30 ticks)
      if (this.tickCount % 30 === 0) {
        this.processMonthlyFinances();
      }
    }

    if (this.onStatsUpdate) {
      this.onStatsUpdate();
    }
  }

  public getDateString(): string {
    return `${this.months[this.month]} ${this.year}`;
  }

  /**
   * Breadth-First-Search (BFS) propagation for electricity and water
   */
  private updateUtilities() {
    const size = this.grid.size;

    // Reset all utility flags
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        t.powered = false;
        t.watered = false;
        if (t.building) {
          t.building.powered = false;
          t.building.watered = false;
        }
      }
    }

    // Power BFS queue
    const powerQueue: Tile[] = [];
    // Water BFS queue
    const waterQueue: Tile[] = [];

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        if (t.type === TileType.POWER_PLANT) {
          t.powered = true;
          powerQueue.push(t);
        }
        if (t.type === TileType.WATER_PUMP) {
          t.watered = true;
          waterQueue.push(t);
        }
      }
    }

    // Propagate Power (travels along roads and adjacent buildings up to 30 hops)
    while (powerQueue.length > 0) {
      const curr = powerQueue.shift()!;
      const neighbors = this.grid.getNeighbors(curr.x, curr.y);

      for (const n of neighbors) {
        const t = n.tile;
        if (!t.powered && (t.type === TileType.ROAD || t.type === TileType.PARK || t.type === TileType.POWER_PLANT || t.type === TileType.WATER_PUMP || t.building)) {
          t.powered = true;
          if (t.building) t.building.powered = true;
          powerQueue.push(t);
        }
      }
    }

    // Propagate Water (travels along roads and directly adjacent tiles)
    while (waterQueue.length > 0) {
      const curr = waterQueue.shift()!;
      const neighbors = this.grid.getNeighbors(curr.x, curr.y);

      for (const n of neighbors) {
        const t = n.tile;
        if (!t.watered && (t.type === TileType.ROAD || t.type === TileType.PARK || t.type === TileType.WATER_PUMP || t.building)) {
          t.watered = true;
          if (t.building) t.building.watered = true;
          waterQueue.push(t);
        }
      }
    }
  }

  /**
   * Process RCI zoning growth, construction stages, and upgrades
   */
  private processZoningAndGrowth() {
    let totalPop = 0;
    let totalJobs = 0;
    const size = this.grid.size;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];

        // Existing building development
        if (t.building) {
          const b = t.building;

          // Construction progress
          if (b.isConstructing) {
            b.progress += 25;
            if (b.progress >= 100) {
              b.isConstructing = false;
              b.progress = 0;
              this.applyBuildingCapacity(b);
            }
          } else {
            // Chance to upgrade if powered and watered with high demand
            if (b.powered && b.watered && b.level < 3 && Math.random() < 0.05) {
              const demand = b.zone === ZoneType.RESIDENTIAL ? this.demandR : (b.zone === ZoneType.COMMERCIAL ? this.demandC : this.demandI);
              if (demand > 30) {
                b.level++;
                this.applyBuildingCapacity(b);
              }
            }
          }

          totalPop += b.residents;
          totalJobs += b.jobs;
        }
        // Empty zoned tile: check if eligible to start building
        else if (t.zone !== ZoneType.NONE && t.type === TileType.GRASS) {
          const hasRoadAccess = this.grid.isAdjacentToRoad(x, y);

          if (hasRoadAccess) {
            const demand = t.zone === ZoneType.RESIDENTIAL ? this.demandR : (t.zone === ZoneType.COMMERCIAL ? this.demandC : this.demandI);

            // Spawn chance if demand is positive
            if (demand > 10 && Math.random() < 0.15) {
              const newBuilding: BuildingData = {
                id: `${x}_${y}_${Date.now()}`,
                zone: t.zone,
                level: 1,
                progress: 0,
                isConstructing: true,
                residents: 0,
                jobs: 0,
                powered: t.powered,
                watered: t.watered,
                abandoned: false,
                style: Math.floor(Math.random() * 3)
              };

              t.building = newBuilding;
              t.type = TileType.BUILDING;
            }
          }
        }
      }
    }

    this.population = totalPop;
    this.totalJobs = totalJobs;

    // Recalculate dynamic RCI Demand
    this.demandR = Math.max(-80, Math.min(100, Math.floor(30 + (this.totalJobs - this.population * 0.7) * 1.5)));
    this.demandC = Math.max(-80, Math.min(100, Math.floor(15 + (this.population * 0.35 - this.totalJobs * 0.2))));
    this.demandI = Math.max(-80, Math.min(100, Math.floor(25 + (this.population * 0.5 - this.totalJobs * 0.6))));
  }

  private applyBuildingCapacity(b: BuildingData) {
    if (b.zone === ZoneType.RESIDENTIAL) {
      b.residents = b.level === 1 ? 5 : (b.level === 2 ? 25 : 80);
      b.jobs = 0;
    } else if (b.zone === ZoneType.COMMERCIAL) {
      b.residents = 0;
      b.jobs = b.level === 1 ? 4 : (b.level === 2 ? 20 : 60);
    } else if (b.zone === ZoneType.INDUSTRIAL) {
      b.residents = 0;
      b.jobs = b.level === 1 ? 8 : (b.level === 2 ? 30 : 90);
    }
  }

  /**
   * Monthly financial cycle: collect taxes, pay upkeep
   */
  private processMonthlyFinances() {
    this.month++;
    if (this.month >= 12) {
      this.month = 0;
      this.year++;
    }

    // Taxes: $8 per resident, $6 per commercial/industrial job
    const taxIncome = Math.floor(this.population * 8 + this.totalJobs * 6);

    // Expenses / Upkeep
    let expenses = 0;
    const size = this.grid.size;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        if (t.type === TileType.ROAD) expenses += UPKEEP.ROAD;
        else if (t.type === TileType.POWER_PLANT) expenses += UPKEEP.POWER_PLANT;
        else if (t.type === TileType.WATER_PUMP) expenses += UPKEEP.WATER_PUMP;
        else if (t.type === TileType.PARK) expenses += UPKEEP.PARK;
      }
    }

    const netIncome = taxIncome - Math.floor(expenses);
    this.funds += netIncome;

    if (netIncome > 0) {
      sounds.playCoin();
    }

    if (this.onNotification && (this.month === 0)) {
      this.onNotification(`Year ${this.year} Financial Report: Net ${netIncome >= 0 ? '+' : ''}$${netIncome}`);
    }
  }
}
