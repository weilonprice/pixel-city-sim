import { TileType, ZoneType, Tile, BuildingData, UPKEEP, OverlayMode } from '../core/Constants.ts';
import { Grid } from './Grid.ts';
import { sounds } from '../core/SoundEffects.ts';

export interface FinancialLedger {
  taxRevenueR: number;
  taxRevenueC: number;
  taxRevenueI: number;
  totalRevenue: number;

  expenseRoads: number;
  expenseFire: number;
  expensePolice: number;
  expenseHealth: number;
  expenseEducation: number;
  expenseUtilities: number;
  totalExpenses: number;

  netMonthly: number;
}

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

  // Taxation and Department Budgets
  public taxRateR: number = 9; // 0 to 20 %
  public taxRateC: number = 9;
  public taxRateI: number = 9;

  public fundingRoads: number = 100; // 50 to 150 %
  public fundingFire: number = 100;
  public fundingPolice: number = 100;
  public fundingHealth: number = 100;
  public fundingEducation: number = 100;

  public totalCommercialJobs: number = 0;
  public totalIndustrialJobs: number = 0;

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

      // 2. Recalculate Service Coverages (scaled by funding)
      this.grid.recalculateServiceCoverages(
        this.fundingFire,
        this.fundingPolice,
        this.fundingHealth,
        this.fundingEducation
      );

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
    let commJobs = 0;
    let indJobs = 0;
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
            if (b.zone === ZoneType.COMMERCIAL) commJobs += b.jobs;
            else if (b.zone === ZoneType.INDUSTRIAL) indJobs += b.jobs;
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
    this.totalCommercialJobs = commJobs;
    this.totalIndustrialJobs = indJobs;

    const taxModR = (9 - this.taxRateR) * 3;
    const taxModC = (9 - this.taxRateC) * 3;
    const taxModI = (9 - this.taxRateI) * 3;

    this.demandR = Math.max(-80, Math.min(100, Math.floor(30 + taxModR + (this.totalJobs - this.population * 0.7) * 1.5)));
    this.demandC = Math.max(-80, Math.min(100, Math.floor(15 + taxModC + (this.population * 0.35 - this.totalJobs * 0.2))));
    this.demandI = Math.max(-80, Math.min(100, Math.floor(25 + taxModI + (this.population * 0.5 - this.totalJobs * 0.6))));
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

  public getFinancialLedger(): FinancialLedger {
    // Tax revenue based on population and jobs scaled by tax rates (9% is neutral)
    const taxRevenueR = Math.floor(this.population * 8 * (this.taxRateR / 9));
    const taxRevenueC = Math.floor(this.totalCommercialJobs * 6 * (this.taxRateC / 9));
    const taxRevenueI = Math.floor(this.totalIndustrialJobs * 6 * (this.taxRateI / 9));
    const totalRevenue = taxRevenueR + taxRevenueC + taxRevenueI;

    let baseRoads = 0;
    let baseFire = 0;
    let basePolice = 0;
    let baseHealth = 0;
    let baseEducation = 0;
    let baseUtilities = 0;

    const size = this.grid.size;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        if (t.type === TileType.ROAD) baseRoads += t.isBridge ? UPKEEP.BRIDGE : UPKEEP.ROAD;
        else if (t.type === TileType.POWER_PLANT) baseUtilities += UPKEEP.POWER_PLANT;
        else if (t.type === TileType.WATER_PUMP) baseUtilities += UPKEEP.WATER_PUMP;
        else if (t.type === TileType.PARK) baseUtilities += UPKEEP.PARK;
        else if (t.type === TileType.FIRE_STATION) baseFire += UPKEEP.FIRE_STATION;
        else if (t.type === TileType.POLICE_STATION) basePolice += UPKEEP.POLICE_STATION;
        else if (t.type === TileType.HOSPITAL) baseHealth += UPKEEP.HOSPITAL;
        else if (t.type === TileType.SCHOOL) baseEducation += UPKEEP.SCHOOL;
      }
    }

    const expenseRoads = Math.round(baseRoads * (this.fundingRoads / 100));
    const expenseFire = Math.round(baseFire * (this.fundingFire / 100));
    const expensePolice = Math.round(basePolice * (this.fundingPolice / 100));
    const expenseHealth = Math.round(baseHealth * (this.fundingHealth / 100));
    const expenseEducation = Math.round(baseEducation * (this.fundingEducation / 100));
    const expenseUtilities = Math.round(baseUtilities);

    const totalExpenses = expenseRoads + expenseFire + expensePolice + expenseHealth + expenseEducation + expenseUtilities;
    const netMonthly = totalRevenue - totalExpenses;

    return {
      taxRevenueR,
      taxRevenueC,
      taxRevenueI,
      totalRevenue,
      expenseRoads,
      expenseFire,
      expensePolice,
      expenseHealth,
      expenseEducation,
      expenseUtilities,
      totalExpenses,
      netMonthly
    };
  }

  private processMonthlyFinances() {
    this.month++;
    if (this.month >= 12) {
      this.month = 0;
      this.year++;
    }

    const ledger = this.getFinancialLedger();
    this.funds += ledger.netMonthly;

    if (ledger.netMonthly > 0) {
      sounds.playCoin();
    }

    if (this.onNotification && (this.month === 0)) {
      this.onNotification(`Year ${this.year} Financial Report: Net ${ledger.netMonthly >= 0 ? '+' : ''}$${ledger.netMonthly}`);
    }
  }

  // --- SAVE / LOAD PERSISTENCE ---

  public saveToLocalStorage(): boolean {
    try {
      const serialized = {
        funds: this.funds,
        population: this.population,
        totalJobs: this.totalJobs,
        totalCommercialJobs: this.totalCommercialJobs,
        totalIndustrialJobs: this.totalIndustrialJobs,
        demandR: this.demandR,
        demandC: this.demandC,
        demandI: this.demandI,
        taxRateR: this.taxRateR,
        taxRateC: this.taxRateC,
        taxRateI: this.taxRateI,
        fundingRoads: this.fundingRoads,
        fundingFire: this.fundingFire,
        fundingPolice: this.fundingPolice,
        fundingHealth: this.fundingHealth,
        fundingEducation: this.fundingEducation,
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
      this.population = data.population !== undefined ? data.population : 0;
      this.totalJobs = data.totalJobs !== undefined ? data.totalJobs : 0;
      this.totalCommercialJobs = data.totalCommercialJobs !== undefined ? data.totalCommercialJobs : 0;
      this.totalIndustrialJobs = data.totalIndustrialJobs !== undefined ? data.totalIndustrialJobs : 0;
      this.demandR = data.demandR !== undefined ? data.demandR : 30;
      this.demandC = data.demandC !== undefined ? data.demandC : 15;
      this.demandI = data.demandI !== undefined ? data.demandI : 25;

      if (data.taxRateR !== undefined) this.taxRateR = data.taxRateR;
      if (data.taxRateC !== undefined) this.taxRateC = data.taxRateC;
      if (data.taxRateI !== undefined) this.taxRateI = data.taxRateI;
      if (data.fundingRoads !== undefined) this.fundingRoads = data.fundingRoads;
      if (data.fundingFire !== undefined) this.fundingFire = data.fundingFire;
      if (data.fundingPolice !== undefined) this.fundingPolice = data.fundingPolice;
      if (data.fundingHealth !== undefined) this.fundingHealth = data.fundingHealth;
      if (data.fundingEducation !== undefined) this.fundingEducation = data.fundingEducation;

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

      // Re-verify population & jobs tally from actual buildings
      let totalPop = 0;
      let totalJobs = 0;
      let commJobs = 0;
      let indJobs = 0;
      for (let x = 0; x < this.grid.size; x++) {
        for (let y = 0; y < this.grid.size; y++) {
          const b = this.grid.tiles[x][y].building;
          if (b && !b.onFire && !b.isConstructing) {
            totalPop += b.residents;
            totalJobs += b.jobs;
            if (b.zone === ZoneType.COMMERCIAL) commJobs += b.jobs;
            else if (b.zone === ZoneType.INDUSTRIAL) indJobs += b.jobs;
          }
        }
      }
      this.population = totalPop;
      this.totalJobs = totalJobs;
      this.totalCommercialJobs = commJobs;
      this.totalIndustrialJobs = indJobs;

      this.updateUtilities();
      this.grid.recalculateServiceCoverages(
        this.fundingFire,
        this.fundingPolice,
        this.fundingHealth,
        this.fundingEducation
      );

      if (this.onStatsUpdate) this.onStatsUpdate();
      if (this.onNotification) this.onNotification('📂 City loaded successfully!');
      return true;
    } catch (e) {
      console.error('Failed to load save:', e);
      return false;
    }
  }
}
