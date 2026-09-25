import { TileType, ZoneType, Tile, BuildingData, UPKEEP, OverlayMode, WeatherType, CityOrdinances, ORDINANCE_COSTS, isAnyRoad, CITY_MILESTONES, CityMilestone } from '../core/Constants.ts';
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
  expenseTransit: number;
  expenseUtilities: number;
  expenseOrdinances: number;
  expenseCivicRewards: number;
  cityHallDiscount: number;
  totalExpenses: number;

  netMonthly: number;
}

export class SimulationEngine {
  public grid: Grid;
  public funds: number = 20000;
  public population: number = 0;
  public totalJobs: number = 0;

  // Transit Stats
  public fundingTransit: number = 100; // 50 to 150 %
  public busRidership: number = 0;
  public busStopCount: number = 0;
  public busDepotCount: number = 0;
  public trainStationCount: number = 0;
  public trainRidership: number = 0;

  // City Milestones & Reward Buildings
  public unlockedMilestones: string[] = ['settlement'];
  public hasMayorsMansion: boolean = false;
  public hasCityHall: boolean = false;
  public hasGrandCentral: boolean = false;
  public onMilestoneReached?: (milestone: CityMilestone) => void;

  // RCI Demands (-100 to +100)
  public demandR: number = 60;
  public demandC: number = 30;
  public demandI: number = 40;

  // Active Data Overlay
  public overlayMode: OverlayMode = OverlayMode.NORMAL;

  // Weather System
  public weather: WeatherType = WeatherType.CLEAR;
  public weatherTimer: number = 0;

  // Municipal Ordinances & Policies
  public ordinances: CityOrdinances = {
    smokeDetectors: false,
    freeTransit: false,
    cleanEnergy: false,
    neighborhoodWatch: false,
    readingCampaign: false
  };

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

  public setWeather(w: WeatherType) {
    this.weather = w;
    this.weatherTimer = 0;
    if (this.onStatsUpdate) this.onStatsUpdate();
  }

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

      // Weather cycle progression (every 90 ticks)
      this.weatherTimer++;
      if (this.weatherTimer >= 90) {
        this.weatherTimer = 0;
        const roll = Math.random();
        if (roll < 0.65) this.weather = WeatherType.CLEAR;
        else if (roll < 0.80) this.weather = WeatherType.OVERCAST;
        else if (roll < 0.94) this.weather = WeatherType.RAIN;
        else this.weather = WeatherType.THUNDERSTORM;
      }

      // 1. Update Utilities & Highway Connectivity
      this.updateUtilities();

      // 2. Recalculate Service Coverages (scaled by funding and ordinances)
      this.grid.recalculateServiceCoverages(
        this.fundingFire,
        this.fundingPolice,
        this.fundingHealth,
        this.fundingEducation,
        this.fundingTransit,
        this.ordinances
      );

      // 3. Update Public Transit & Civic Reward metrics
      this.updateTransitMetrics();
      this.updateRewardMetrics();
      this.checkMilestones();

      // 4. Process Building Growth & Fire Emergencies (every 5 ticks)
      if (this.tickCount % 5 === 0) {
        this.processZoningAndGrowth();
        this.processFireEmergencies();
      }

      // 5. Monthly Financial Cycle (every 30 ticks)
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

  public updateUtilities() {
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
        if (!t.powered && (isAnyRoad(t.type) || t.type === TileType.PARK || t.type === TileType.POWER_PLANT || t.type === TileType.WATER_PUMP || t.type === TileType.FIRE_STATION || t.type === TileType.POLICE_STATION || t.type === TileType.HOSPITAL || t.type === TileType.SCHOOL || t.type === TileType.BUS_DEPOT || t.type === TileType.BUS_STOP || t.type === TileType.TRAIN_STATION || t.type === TileType.TRAIN_TRACK || t.type === TileType.MAYORS_MANSION || t.type === TileType.CITY_HALL || t.type === TileType.GRAND_CENTRAL || t.building)) {
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
        if (!t.watered && (isAnyRoad(t.type) || t.type === TileType.PARK || t.type === TileType.WATER_PUMP || t.type === TileType.FIRE_STATION || t.type === TileType.POLICE_STATION || t.type === TileType.HOSPITAL || t.type === TileType.SCHOOL || t.type === TileType.BUS_DEPOT || t.type === TileType.BUS_STOP || t.type === TileType.TRAIN_STATION || t.type === TileType.TRAIN_TRACK || t.type === TileType.MAYORS_MANSION || t.type === TileType.CITY_HALL || t.type === TileType.GRAND_CENTRAL || t.building)) {
          t.watered = true;
          if (t.building) t.building.watered = true;
          waterQueue.push(t);
        }
      }
    }

    this.grid.updateHighwayConnectivity();
  }

  public updateTransitMetrics() {
    const size = this.grid.size;
    let busDepots = 0;
    let busStops = 0;
    let trainStations = 0;
    let trainTracks = 0;
    let coveredPop = 0;
    let coveredJobs = 0;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        if (t.type === TileType.BUS_DEPOT && t.powered && t.watered && this.grid.isAdjacentToRoad(x, y)) {
          busDepots++;
        } else if (t.type === TileType.BUS_STOP && this.grid.isAdjacentToRoad(x, y)) {
          busStops++;
        } else if (t.type === TileType.TRAIN_STATION && t.powered && t.watered) {
          trainStations++;
        } else if (t.type === TileType.TRAIN_TRACK) {
          trainTracks++;
        }
        if (t.building && !t.building.onFire && !t.building.isConstructing && t.transitCoverage > 20) {
          coveredPop += t.building.residents;
          coveredJobs += t.building.jobs;
        }
      }
    }

    this.busDepotCount = busDepots;
    this.busStopCount = busStops;
    this.trainStationCount = trainStations;

    if (busDepots > 0 && busStops > 0) {
      let targetRidership = Math.round((coveredPop * 0.45 + coveredJobs * 0.35) * (this.fundingTransit / 100));
      if (this.ordinances.freeTransit) {
        targetRidership = Math.round(targetRidership * 1.5);
      }
      this.busRidership = Math.max(0, targetRidership);
    } else {
      this.busRidership = 0;
    }

    if (trainStations > 0 && trainTracks > 0) {
      const stationMultiplier = trainStations >= 2 ? 1.5 : 1.0;
      let targetTrainRidership = Math.round((coveredPop * 0.40 + coveredJobs * 0.30) * stationMultiplier * (this.fundingTransit / 100));
      if (this.ordinances.freeTransit) {
        targetTrainRidership = Math.round(targetTrainRidership * 1.4);
      }
      this.trainRidership = Math.max(0, targetTrainRidership);
    } else {
      this.trainRidership = 0;
    }
  }

  public updateRewardMetrics() {
    const size = this.grid.size;
    let mayorsMansion = false;
    let cityHall = false;
    let grandCentral = false;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        if (t.type === TileType.MAYORS_MANSION && t.powered && t.watered) mayorsMansion = true;
        else if (t.type === TileType.CITY_HALL && t.powered && t.watered) cityHall = true;
        else if (t.type === TileType.GRAND_CENTRAL && t.powered && t.watered) grandCentral = true;
      }
    }

    this.hasMayorsMansion = mayorsMansion;
    this.hasCityHall = cityHall;
    this.hasGrandCentral = grandCentral;
  }

  public checkMilestones() {
    for (const milestone of CITY_MILESTONES) {
      if (this.population >= milestone.minPop && !this.unlockedMilestones.includes(milestone.id)) {
        this.unlockedMilestones.push(milestone.id);
        sounds.playMilestoneFanfare();
        sounds.playCivicCheer();
        if (this.onMilestoneReached) {
          this.onMilestoneReached(milestone);
        }
        if (this.onNotification) {
          this.onNotification(`🎉 MILESTONE: Reached ${milestone.name}! Unlocked: ${milestone.rewardName}`);
        }
      }
    }
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
            if (b.powered && b.watered && b.hasHighwayAccess && b.level < 5 && Math.random() < 0.05) {
              const demand = b.zone === ZoneType.RESIDENTIAL ? this.demandR : (b.zone === ZoneType.COMMERCIAL ? this.demandC : this.demandI);

              // Level 1 -> Level 2 requires basic demand & police
              const canUpgradeL2 = b.level === 1 && demand > 25 && t.landValue > 25;

              // Level 2 -> Level 3 (Mid-Rise / High-Rise) requires health, education, fire coverage, and moderate land value
              const canUpgradeL3 = b.level === 2 && demand > 40 && t.landValue > 45 && t.educationCoverage > 25 && t.healthCoverage > 25 && t.fireCoverage > 20;

              // Level 3 -> Level 4 (Luxury High-Rise / Corporate Plaza / Biotech Campus) requires high land value, education, healthcare, and transit
              const canUpgradeL4 = b.level === 3 && demand > 50 && t.landValue > 55 && t.educationCoverage > 40 && t.healthCoverage > 35 && t.fireCoverage > 30 && t.transitCoverage > 30;

              // Level 4 -> Level 5 (Glass Megatower / World Trade Center / Aerospace Campus) requires premier metropolitan conditions
              const canUpgradeL5 = b.level === 4 && demand > 65 && t.landValue > 70 && t.educationCoverage > 55 && t.healthCoverage > 45 && t.fireCoverage > 40 && t.transitCoverage > 50 && t.policeCoverage > 40;

              if (canUpgradeL2 || canUpgradeL3 || canUpgradeL4 || canUpgradeL5) {
                b.level++;
                this.applyBuildingCapacity(b);
                if (b.level === 5) {
                  sounds.playSkyscraperFanfare();
                  if (this.onNotification) {
                    const zoneName = b.zone === ZoneType.RESIDENTIAL ? 'Apex Glass Megatower' : (b.zone === ZoneType.COMMERCIAL ? 'World Trade Megatower' : 'Aerospace Tech Campus');
                    this.onNotification(`🏙️ Landmark Skyscraper! A monumental Tier 5 ${zoneName} now graces your skyline!`);
                  }
                }
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

    // Public Bus Transit & Ridership calculation
    this.updateTransitMetrics();
    this.updateRewardMetrics();

    const taxModR = (9 - this.taxRateR) * 3;
    const taxModC = (9 - this.taxRateC) * 3;
    const taxModI = (9 - this.taxRateI) * 3;

    const busBonusR = (this.busRidership > 0 ? Math.min(10, Math.floor(this.busRidership / 20)) : 0);
    const busBonusC = (this.busRidership > 0 ? Math.min(15, Math.floor(this.busRidership / 15)) : 0);
    const trainBonusR = (this.trainRidership > 0 ? Math.min(12, Math.floor(this.trainRidership / 25)) : 0);
    const trainBonusC = (this.trainRidership > 0 ? Math.min(15, Math.floor(this.trainRidership / 20)) : 0);

    const transitBonusR = (this.ordinances.freeTransit ? 10 : 0) + busBonusR + trainBonusR;
    const transitBonusC = (this.ordinances.freeTransit ? 15 : 0) + busBonusC + trainBonusC;

    const rewardBonusR = (this.hasMayorsMansion ? 10 : 0) + (this.hasGrandCentral ? 15 : 0);
    const rewardBonusC = (this.hasMayorsMansion ? 10 : 0) + (this.hasGrandCentral ? 25 : 0);

    this.demandR = Math.max(-80, Math.min(100, Math.floor(30 + taxModR + transitBonusR + rewardBonusR + (this.totalJobs - this.population * 0.7) * 1.5)));
    this.demandC = Math.max(-80, Math.min(100, Math.floor(15 + taxModC + transitBonusC + rewardBonusC + (this.population * 0.35 - this.totalJobs * 0.2))));
    this.demandI = Math.max(-80, Math.min(100, Math.floor(25 + taxModI + (this.population * 0.5 - this.totalJobs * 0.6))));
  }

  /**
   * Random fire outbreaks & fire department emergency response
   */
  private processFireEmergencies() {
    const size = this.grid.size;
    const fireRisk = this.ordinances.smokeDetectors ? 0.0003 : 0.0008;

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
        else if (!b.isConstructing && t.fireCoverage < 15 && Math.random() < fireRisk) {
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

  public applyBuildingCapacity(b: BuildingData) {
    if (b.zone === ZoneType.RESIDENTIAL) {
      b.residents = b.level === 1 ? 5 : (b.level === 2 ? 25 : (b.level === 3 ? 80 : (b.level === 4 ? 180 : 350)));
      b.jobs = 0;
    } else if (b.zone === ZoneType.COMMERCIAL) {
      b.residents = 0;
      b.jobs = b.level === 1 ? 4 : (b.level === 2 ? 20 : (b.level === 3 ? 60 : (b.level === 4 ? 150 : 320)));
    } else if (b.zone === ZoneType.INDUSTRIAL) {
      b.residents = 0;
      b.jobs = b.level === 1 ? 8 : (b.level === 2 ? 30 : (b.level === 3 ? 90 : (b.level === 4 ? 160 : 300)));
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
    let baseTransit = 0;
    let baseUtilities = 0;
    let baseCivicRewards = 0;

    const size = this.grid.size;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid.tiles[x][y];
        if (t.type === TileType.ROAD) baseRoads += t.isBridge ? UPKEEP.BRIDGE : UPKEEP.ROAD;
        else if (t.type === TileType.DIRT_ROAD) baseRoads += t.isBridge ? UPKEEP.DIRT_BRIDGE : UPKEEP.DIRT_ROAD;
        else if (t.type === TileType.AVENUE) baseRoads += t.isBridge ? UPKEEP.AVENUE_BRIDGE : UPKEEP.AVENUE;
        else if (t.type === TileType.POWER_PLANT) baseUtilities += UPKEEP.POWER_PLANT;
        else if (t.type === TileType.WATER_PUMP) baseUtilities += UPKEEP.WATER_PUMP;
        else if (t.type === TileType.PARK) baseUtilities += UPKEEP.PARK;
        else if (t.type === TileType.FIRE_STATION) baseFire += UPKEEP.FIRE_STATION;
        else if (t.type === TileType.POLICE_STATION) basePolice += UPKEEP.POLICE_STATION;
        else if (t.type === TileType.HOSPITAL) baseHealth += UPKEEP.HOSPITAL;
        else if (t.type === TileType.SCHOOL) baseEducation += UPKEEP.SCHOOL;
        else if (t.type === TileType.BUS_DEPOT) baseTransit += UPKEEP.BUS_DEPOT;
        else if (t.type === TileType.BUS_STOP) baseTransit += UPKEEP.BUS_STOP;
        else if (t.type === TileType.TRAIN_STATION) baseTransit += UPKEEP.TRAIN_STATION;
        else if (t.type === TileType.TRAIN_TRACK) baseTransit += UPKEEP.TRAIN_TRACK;
        else if (t.type === TileType.MAYORS_MANSION) baseCivicRewards += UPKEEP.MAYORS_MANSION;
        else if (t.type === TileType.CITY_HALL) baseCivicRewards += UPKEEP.CITY_HALL;
        else if (t.type === TileType.GRAND_CENTRAL) baseCivicRewards += UPKEEP.GRAND_CENTRAL;
      }
    }

    let expenseRoads = Math.round(baseRoads * (this.fundingRoads / 100));
    if (this.ordinances.freeTransit) {
      expenseRoads = Math.round(expenseRoads * 0.85); // 15% reduction in road maintenance
    }

    const expenseFire = Math.round(baseFire * (this.fundingFire / 100));
    const expensePolice = Math.round(basePolice * (this.fundingPolice / 100));
    const expenseHealth = Math.round(baseHealth * (this.fundingHealth / 100));
    const expenseEducation = Math.round(baseEducation * (this.fundingEducation / 100));
    const expenseTransit = Math.round(baseTransit * (this.fundingTransit / 100));
    const expenseUtilities = Math.round(baseUtilities);
    const expenseCivicRewards = Math.round(baseCivicRewards);

    let expenseOrdinances = 0;
    if (this.ordinances.smokeDetectors) expenseOrdinances += ORDINANCE_COSTS.smokeDetectors;
    if (this.ordinances.freeTransit) expenseOrdinances += ORDINANCE_COSTS.freeTransit;
    if (this.ordinances.cleanEnergy) expenseOrdinances += ORDINANCE_COSTS.cleanEnergy;
    if (this.ordinances.neighborhoodWatch) expenseOrdinances += ORDINANCE_COSTS.neighborhoodWatch;
    if (this.ordinances.readingCampaign) expenseOrdinances += ORDINANCE_COSTS.readingCampaign;

    let subtotalExpenses = expenseRoads + expenseFire + expensePolice + expenseHealth + expenseEducation + expenseTransit + expenseUtilities + expenseOrdinances + expenseCivicRewards;
    let cityHallDiscount = 0;
    if (this.hasCityHall) {
      cityHallDiscount = Math.round(subtotalExpenses * 0.10); // 10% City Hall administrative efficiency discount
    }
    const totalExpenses = subtotalExpenses - cityHallDiscount;
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
      expenseTransit,
      expenseUtilities,
      expenseOrdinances,
      expenseCivicRewards,
      cityHallDiscount,
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
        fundingTransit: this.fundingTransit,
        busRidership: this.busRidership,
        trainRidership: this.trainRidership,
        unlockedMilestones: this.unlockedMilestones,
        weather: this.weather,
        ordinances: this.ordinances,
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
      if (data.fundingTransit !== undefined) this.fundingTransit = data.fundingTransit;
      if (data.busRidership !== undefined) this.busRidership = data.busRidership;
      if (data.trainRidership !== undefined) this.trainRidership = data.trainRidership;
      if (Array.isArray(data.unlockedMilestones)) {
        this.unlockedMilestones = data.unlockedMilestones;
      }
      if (data.weather !== undefined) this.weather = data.weather;
      if (data.ordinances !== undefined) this.ordinances = { ...this.ordinances, ...data.ordinances };

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
        this.fundingEducation,
        this.fundingTransit,
        this.ordinances
      );

      this.updateRewardMetrics();
      this.updateTransitMetrics();
      this.checkMilestones();

      if (this.onStatsUpdate) this.onStatsUpdate();
      if (this.onNotification) this.onNotification('📂 City loaded successfully!');
      return true;
    } catch (e) {
      console.error('Failed to load save:', e);
      return false;
    }
  }
}
