import { TileType, ZoneType, Tile, BuildingData, UPKEEP, OverlayMode } from '../core/Constants.ts';
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

  // Active Data Overlay
  public overlayMode: OverlayMode = OverlayMode.NORMAL;

  // Simulation Clock & Day/Night
  public speed: number = 1; // 0, 1, 2, 5
  public tickCount: number = 0;
  public gameHour: number = 12; // 0 to 23
  public gameMinute: number = 0; // 0 to 59
  public month: number = 0;
  public year: number = 2000;

  private months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  private warnedHighway: boolean = false;

  // Event callbacks for UI
  public onStatsUpdate?: () => void;
  public onNotification?: (msg: string) => void;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  public setSpeed(speed: number) {
    this.speed = speed;
  }

  public setOverlayMode(mode: OverlayMode) {
    this.overlayMode = mode;
  }

  public tick() {
    if (this.speed === 0) return;

    for (let s = 0; s < this.speed; s++) {
      this.tickCount++;

      // Advance Day / Night clock (1 hour every 10 ticks)
      this.gameMinute += 6;
      if (this.gameMinute >= 60) {
        this.gameMinute = 0;
        this.gameHour = (this.gameHour + 1) % 24;
      }

      // 1. Update Utilities & Highway Connectivity
      this.updateUtilities();

      // 2. Recalculate Service Coverages (Fire, Police, Health, Education, Pollution)
      this.grid.recalculateServiceCoverages();

      // 3. Process Building Growth & Fire Emergencies (every 5 ticks)
      if (this.tickCount % 5 === 0) {
        this.processZoningAndGrowth();
        this.processFireEmergencies();
      }

      // 4. Monthly Financial Cycle (every 30 ticks)
      if (this.tickCount % 30 === 0) {
        this.processMonthlyFinances();
      }
    }

    if (this.onStatsUpdate) {
      this.onStatsUpdate();
    }
  }

  public getDateString(): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${this.months[this.month]} ${this.year} • ${pad(this.gameHour)}:${pad(this.gameMinute)}`;
  }

  private updateUtilities() {
    const size = this.grid.size;

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

    const powerQueue: Tile[] = [];
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

    while (powerQueue.length > 0) {
      const curr = powerQueue.shift()!;
      const neighbors = this.grid.getNeighbors(curr.x, curr.y);

      for (const n of neighbors) {
        const t = n.tile;
        if (!t.powered && (t.type === TileType.ROAD || t.type === TileType.HIGHWAY || t.type === TileType.PARK || t.type === TileType.POWER_PLANT || t.type === TileType.WATER_PUMP || t.type === TileType.FIRE_STATION || t.type === TileType.POLICE_STATION || t.type === TileType.HOSPITAL || t.type === TileType.SCHOOL || t.building)) {
          t.powered = true;
          if (t.building) t.building.powered = true;
          powerQueue.push(t);
        }
      }
    }

    while (waterQueue.length > 0) {
      const curr = waterQueue.shift()!;
      const neighbors = this.grid.getNeighbors(curr.x, curr.y);

      for (const n of neighbors) {
        const t = n.tile;
        if (!t.watered && (t.type === TileType.ROAD || t.type === TileType.PARK || t.type === TileType.WATER_PUMP || t.type === TileType.FIRE_STATION || t.type === TileType.POLICE_STATION || t.type === TileType.HOSPITAL || t.type === TileType.SCHOOL || t.building)) {
          t.watered = true;
          if (t.building) t.building.watered = true;
          waterQueue.push(t);
        }
      }
    }

    this.grid.updateHighwayConnectivity();
  }

  private processZoningAndGrowth() {
    let totalPop = 0;
    let totalJobs = 0;
    let hasDisconnectedZones = false;
    const size = this.grid.size;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];

        if (t.building) {
          const b = t.building;
          b.hasHighwayAccess = this.grid.isAdjacentToHighwayConnectedRoad(x, y);

          if (b.isConstructing) {
            if (b.hasHighwayAccess) {
              b.progress += 25;
              if (b.progress >= 100) {
                b.isConstructing = false;
                b.progress = 0;
                this.applyBuildingCapacity(b);
              }
            }
          } else if (!b.onFire) {
            // Upgrade conditions driven by Services & Land Value
            if (b.powered && b.watered && b.hasHighwayAccess && b.level < 3 && Math.random() < 0.05) {
              const demand = b.zone === ZoneType.RESIDENTIAL ? this.demandR : (b.zone === ZoneType.COMMERCIAL ? this.demandC : this.demandI);

              // Level 1 -> Level 2 requires basic demand & police
              const canUpgradeL2 = b.level === 1 && demand > 25 && t.landValue > 25;

              // Level 2 -> Level 3 (Skyscraper/High-Rise) requires high health, education, fire coverage, and high land value
              const canUpgradeL3 = b.level === 2 && demand > 40 && t.landValue > 45 && t.educationCoverage > 25 && t.healthCoverage > 25 && t.fireCoverage > 20;

              if (canUpgradeL2 || canUpgradeL3) {
                b.level++;
                this.applyBuildingCapacity(b);
              }
            }
          }

          if (!b.onFire) {
            totalPop += b.residents;
            totalJobs += b.jobs;
          }
        }
        else if (t.zone !== ZoneType.NONE && t.type === TileType.GRASS) {
          const hasRoadAccess = this.grid.isAdjacentToRoad(x, y);
          const hasHighwayAccess = this.grid.isAdjacentToHighwayConnectedRoad(x, y);

          if (hasRoadAccess && !hasHighwayAccess) {
            hasDisconnectedZones = true;
          }

          if (hasRoadAccess && hasHighwayAccess) {
            const demand = t.zone === ZoneType.RESIDENTIAL ? this.demandR : (t.zone === ZoneType.COMMERCIAL ? this.demandC : this.demandI);

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
                hasHighwayAccess: true,
                onFire: false,
                fireTimer: 0,
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

    if (hasDisconnectedZones && !this.warnedHighway && this.onNotification) {
      this.warnedHighway = true;
      this.onNotification("⚠️ Connect roads to the Interstate 10 interchange so citizens can move in!");
    } else if (!hasDisconnectedZones) {
      this.warnedHighway = false;
    }

    this.population = totalPop;
    this.totalJobs = totalJobs;

    this.demandR = Math.max(-80, Math.min(100, Math.floor(30 + (this.totalJobs - this.population * 0.7) * 1.5)));
    this.demandC = Math.max(-80, Math.min(100, Math.floor(15 + (this.population * 0.35 - this.totalJobs * 0.2))));
    this.demandI = Math.max(-80, Math.min(100, Math.floor(25 + (this.population * 0.5 - this.totalJobs * 0.6))));
  }

  /**
   * Random fire outbreaks & fire department emergency response
   */
  private processFireEmergencies() {
    const size = this.grid.size;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        if (!t.building) continue;

        const b = t.building;

        // Active fire progression
        if (b.onFire) {
          b.fireTimer += 5;

          // If covered by fire station, extinguish in ~10 seconds
          if (t.fireCoverage > 30 && b.fireTimer >= 10) {
            b.onFire = false;
            b.fireTimer = 0;
            if (this.onNotification) {
              this.onNotification(`🚒 Fire Department extinguished fire at (${x}, ${y})!`);
            }
          }
          // If no fire department, building burns down to rubble in 25 seconds
          else if (b.fireTimer >= 25) {
            t.type = TileType.GRASS;
            t.building = undefined;
            if (this.onNotification) {
              this.onNotification(`🔥 Building at (${x}, ${y}) burnt down to ashes due to lack of fire services!`);
            }
          }
        }
        // Small chance of catching fire if lacking fire coverage
        else if (!b.isConstructing && t.fireCoverage < 15 && Math.random() < 0.0008) {
          b.onFire = true;
          b.fireTimer = 0;
          sounds.playError();
          if (this.onNotification) {
            this.onNotification(`🚨 FIRE BREAKOUT at (${x}, ${y})! Dispatching emergency response!`);
          }
        }
      }
    }
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

  private processMonthlyFinances() {
    this.month++;
    if (this.month >= 12) {
      this.month = 0;
      this.year++;
    }

    const taxIncome = Math.floor(this.population * 8 + this.totalJobs * 6);

    let expenses = 0;
    const size = this.grid.size;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        if (t.type === TileType.ROAD) expenses += t.isBridge ? UPKEEP.BRIDGE : UPKEEP.ROAD;
        else if (t.type === TileType.POWER_PLANT) expenses += UPKEEP.POWER_PLANT;
        else if (t.type === TileType.WATER_PUMP) expenses += UPKEEP.WATER_PUMP;
        else if (t.type === TileType.PARK) expenses += UPKEEP.PARK;
        else if (t.type === TileType.FIRE_STATION) expenses += UPKEEP.FIRE_STATION;
        else if (t.type === TileType.POLICE_STATION) expenses += UPKEEP.POLICE_STATION;
        else if (t.type === TileType.HOSPITAL) expenses += UPKEEP.HOSPITAL;
        else if (t.type === TileType.SCHOOL) expenses += UPKEEP.SCHOOL;
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

  // --- SAVE / LOAD PERSISTENCE ---

  public saveToLocalStorage(): boolean {
    try {
      const serialized = {
        funds: this.funds,
        month: this.month,
        year: this.year,
        gameHour: this.gameHour,
        tiles: this.grid.tiles.map(row => row.map(t => ({
          x: t.x,
          y: t.y,
          type: t.type,
          zone: t.zone,
          elevation: t.elevation,
          roadMask: t.roadMask,
          isBridge: t.isBridge,
          isRamp: t.isRamp,
          building: t.building ? {
            id: t.building.id,
            zone: t.building.zone,
            level: t.building.level,
            progress: t.building.progress,
            isConstructing: t.building.isConstructing,
            residents: t.building.residents,
            jobs: t.building.jobs,
            style: t.building.style
          } : undefined
        })))
      };

      localStorage.setItem('pixel_city_sim_save', JSON.stringify(serialized));
      if (this.onNotification) this.onNotification('💾 City saved successfully!');
      return true;
    } catch (e) {
      console.error('Failed to save city:', e);
      return false;
    }
  }

  public loadFromLocalStorage(): boolean {
    try {
      const dataStr = localStorage.getItem('pixel_city_sim_save');
      if (!dataStr) return false;

      const data = JSON.parse(dataStr);
      this.funds = data.funds;
      this.month = data.month;
      this.year = data.year;
      this.gameHour = data.gameHour || 12;

      for (let x = 0; x < this.grid.size; x++) {
        for (let y = 0; y < this.grid.size; y++) {
          const savedTile = data.tiles[x][y];
          const t = this.grid.tiles[x][y];
          t.type = savedTile.type;
          t.zone = savedTile.zone;
          t.elevation = savedTile.elevation;
          t.roadMask = savedTile.roadMask;
          t.isBridge = savedTile.isBridge;
          t.isRamp = savedTile.isRamp;

          if (savedTile.building) {
            t.building = {
              ...savedTile.building,
              powered: false,
              watered: false,
              hasHighwayAccess: false,
              onFire: false,
              fireTimer: 0,
              abandoned: false
            };
          } else {
            t.building = undefined;
          }
        }
      }

      this.updateUtilities();
      this.grid.recalculateServiceCoverages();
      if (this.onNotification) this.onNotification('📂 City loaded successfully!');
      return true;
    } catch (e) {
      console.error('Failed to load save:', e);
      return false;
    }
  }
}
