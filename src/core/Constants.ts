export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const MAP_SIZE = 64;

export enum ZoneType {
  NONE = 'NONE',
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL'
}

export enum TileType {
  GRASS = 'GRASS',
  WATER = 'WATER',
  DIRT = 'DIRT',
  ROAD = 'ROAD',
  DIRT_ROAD = 'DIRT_ROAD',
  AVENUE = 'AVENUE',
  HIGHWAY = 'HIGHWAY',
  BUILDING = 'BUILDING',
  POWER_PLANT = 'POWER_PLANT',
  WATER_PUMP = 'WATER_PUMP',
  PARK = 'PARK',
  FIRE_STATION = 'FIRE_STATION',
  POLICE_STATION = 'POLICE_STATION',
  HOSPITAL = 'HOSPITAL',
  SCHOOL = 'SCHOOL',
  BUS_DEPOT = 'BUS_DEPOT',
  BUS_STOP = 'BUS_STOP',
  MAYORS_MANSION = 'MAYORS_MANSION',
  CITY_HALL = 'CITY_HALL',
  GRAND_CENTRAL = 'GRAND_CENTRAL',
  TRAIN_STATION = 'TRAIN_STATION',
  TRAIN_TRACK = 'TRAIN_TRACK'
}

export function isAnyRoad(type: TileType): boolean {
  return type === TileType.ROAD || type === TileType.DIRT_ROAD || type === TileType.AVENUE || type === TileType.HIGHWAY;
}

export function isTrackOrStation(type: TileType): boolean {
  return type === TileType.TRAIN_TRACK || type === TileType.TRAIN_STATION;
}

export enum OverlayMode {
  NORMAL = 'NORMAL',
  POWER = 'POWER',
  WATER = 'WATER',
  FIRE = 'FIRE',
  CRIME = 'CRIME',
  LAND_VALUE = 'LAND_VALUE',
  POLLUTION = 'POLLUTION',
  TRANSIT = 'TRANSIT'
}

export enum WeatherType {
  CLEAR = 'CLEAR',
  OVERCAST = 'OVERCAST',
  RAIN = 'RAIN',
  THUNDERSTORM = 'THUNDERSTORM'
}

export interface CityOrdinances {
  smokeDetectors: boolean;
  freeTransit: boolean;
  cleanEnergy: boolean;
  neighborhoodWatch: boolean;
  readingCampaign: boolean;
}

export const ORDINANCE_COSTS: Record<keyof CityOrdinances, number> = {
  smokeDetectors: 20,
  freeTransit: 60,
  cleanEnergy: 40,
  neighborhoodWatch: 30,
  readingCampaign: 25
};

export interface BuildingData {
  id: string;
  zone: ZoneType;
  level: number; // 1 to 3
  progress: number; // 0 to 100
  isConstructing: boolean;
  residents: number;
  jobs: number;
  powered: boolean;
  watered: boolean;
  hasHighwayAccess: boolean;
  onFire: boolean;
  fireTimer: number;
  abandoned: boolean;
  style: number;
}

export interface Tile {
  x: number;
  y: number;
  elevation: number;
  type: TileType;
  zone: ZoneType;
  building?: BuildingData;
  roadMask: number;
  powered: boolean;
  watered: boolean;
  connectedToHighway: boolean;
  isBridge?: boolean;
  isRamp?: boolean;

  // Simulation layers (0 to 100)
  landValue: number;
  pollution: number;
  crime: number;
  fireCoverage: number;
  policeCoverage: number;
  healthCoverage: number;
  educationCoverage: number;
  transitCoverage: number;

  variant: number;
}

export const COSTS = {
  ROAD: 10,
  DIRT_ROAD: 5,
  AVENUE: 25,
  BRIDGE: 50,
  DIRT_BRIDGE: 25,
  AVENUE_BRIDGE: 100,
  ZONE: 50,
  DEMOLISH: 5,
  POWER_PLANT: 1000,
  WATER_PUMP: 800,
  PARK: 150,
  FIRE_STATION: 600,
  POLICE_STATION: 600,
  HOSPITAL: 850,
  SCHOOL: 500,
  BUS_DEPOT: 400,
  BUS_STOP: 50,
  MAYORS_MANSION: 1000,
  CITY_HALL: 2500,
  GRAND_CENTRAL: 5000,
  TRAIN_STATION: 750,
  TRAIN_TRACK: 15
} as const;

export const UPKEEP = {
  ROAD: 0.1,
  DIRT_ROAD: 0.05,
  AVENUE: 0.25,
  BRIDGE: 0.5,
  DIRT_BRIDGE: 0.25,
  AVENUE_BRIDGE: 1.0,
  POWER_PLANT: 25,
  WATER_PUMP: 15,
  PARK: 5,
  FIRE_STATION: 20,
  POLICE_STATION: 20,
  HOSPITAL: 30,
  SCHOOL: 18,
  BUS_DEPOT: 15,
  BUS_STOP: 1,
  MAYORS_MANSION: 20,
  CITY_HALL: 50,
  GRAND_CENTRAL: 100,
  TRAIN_STATION: 25,
  TRAIN_TRACK: 0.15
} as const;

export interface CityMilestone {
  id: string;
  name: string;
  minPop: number;
  rewardName: string;
  rewardTool?: string;
  rewardTileType?: TileType;
  description: string;
  perkSummary: string;
}

export const CITY_MILESTONES: CityMilestone[] = [
  {
    id: 'settlement',
    name: 'Pioneer Settlement',
    minPop: 0,
    rewardName: 'Settlement Charter',
    description: 'Found your settlement by connecting local roads to Interstate 10.',
    perkSummary: 'Basic zoning & dirt roads enabled'
  },
  {
    id: 'village',
    name: 'Riverside Village',
    minPop: 100,
    rewardName: 'Parks & Bus Transit Charter',
    description: 'Your population has reached 100 pioneer residents!',
    perkSummary: 'Unlocked Public Parks & Bus Transit network'
  },
  {
    id: 'town',
    name: 'Booming Town',
    minPop: 500,
    rewardName: "Mayor's Historic Mansion",
    rewardTool: 'mayors-mansion',
    rewardTileType: TileType.MAYORS_MANSION,
    description: 'A thriving township of 500 residents! The citizens present you with a stately civic estate.',
    perkSummary: '+10 City-Wide Demand Boost & +25 Land Value'
  },
  {
    id: 'city',
    name: 'Prosperous City',
    minPop: 1500,
    rewardName: 'Majestic City Hall',
    rewardTool: 'city-hall',
    rewardTileType: TileType.CITY_HALL,
    description: 'Surpassed 1,500 citizens! The City Council commissions a neoclassical seat of municipal government.',
    perkSummary: '10% Discount on all City Department Upkeep'
  },
  {
    id: 'metropolis',
    name: 'Grand Metropolis',
    minPop: 5000,
    rewardName: 'Grand Central Terminal',
    rewardTool: 'grand-central',
    rewardTileType: TileType.GRAND_CENTRAL,
    description: 'Over 5,000 citizens! A world-class monumental terminal crowns your soaring metropolis.',
    perkSummary: '+25 Commercial Demand & Maximum Transit Reach'
  }
];
