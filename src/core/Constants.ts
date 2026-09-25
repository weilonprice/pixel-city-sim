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
  HIGHWAY = 'HIGHWAY',
  BUILDING = 'BUILDING',
  POWER_PLANT = 'POWER_PLANT',
  WATER_PUMP = 'WATER_PUMP',
  PARK = 'PARK',
  FIRE_STATION = 'FIRE_STATION',
  POLICE_STATION = 'POLICE_STATION',
  HOSPITAL = 'HOSPITAL',
  SCHOOL = 'SCHOOL'
}

export enum OverlayMode {
  NORMAL = 'NORMAL',
  POWER = 'POWER',
  WATER = 'WATER',
  FIRE = 'FIRE',
  CRIME = 'CRIME',
  LAND_VALUE = 'LAND_VALUE',
  POLLUTION = 'POLLUTION'
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

  variant: number;
}

export const COSTS = {
  ROAD: 10,
  BRIDGE: 50,
  ZONE: 50,
  DEMOLISH: 5,
  POWER_PLANT: 1000,
  WATER_PUMP: 800,
  PARK: 150,
  FIRE_STATION: 600,
  POLICE_STATION: 600,
  HOSPITAL: 850,
  SCHOOL: 500
} as const;

export const UPKEEP = {
  ROAD: 0.1,
  BRIDGE: 0.5,
  POWER_PLANT: 25,
  WATER_PUMP: 15,
  PARK: 5,
  FIRE_STATION: 20,
  POLICE_STATION: 20,
  HOSPITAL: 30,
  SCHOOL: 18
} as const;
