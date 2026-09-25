export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const MAP_SIZE = 36; // 36x36 grid

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
  BUILDING = 'BUILDING',
  POWER_PLANT = 'POWER_PLANT',
  WATER_PUMP = 'WATER_PUMP',
  PARK = 'PARK'
}

export interface BuildingData {
  id: string;
  zone: ZoneType;
  level: number; // 1 to 3
  progress: number; // 0 to 100 for construction / upgrade
  isConstructing: boolean;
  residents: number;
  jobs: number;
  powered: boolean;
  watered: boolean;
  abandoned: boolean;
  style: number; // random visual variant
}

export interface Tile {
  x: number;
  y: number;
  elevation: number;
  type: TileType;
  zone: ZoneType;
  building?: BuildingData;
  roadMask: number; // 4-bit bitmask (N:1, E:2, S:4, W:8)
  powered: boolean;
  watered: boolean;
  landValue: number;
  pollution: number;
  // Natural decor variant (different grass blades, flowers)
  variant: number;
}

export const COSTS = {
  ROAD: 10,
  ZONE: 50,
  DEMOLISH: 5,
  POWER_PLANT: 1000,
  WATER_PUMP: 800,
  PARK: 150
} as const;

export const UPKEEP = {
  ROAD: 0.1,
  POWER_PLANT: 25,
  WATER_PUMP: 15,
  PARK: 5
} as const;
