/**
 * AssetManager handles loading, caching, and querying PixelLab sprite assets.
 * If a sprite is available, it provides the HTMLImageElement;
 * otherwise, the engine falls back to crisp procedural pixel rendering.
 */
export class AssetManager {
  private sprites: Map<string, HTMLImageElement> = new Map();
  private loadedKeys: Set<string> = new Set();

  constructor() {
    this.preloadKnownSprites();
  }

  private preloadKnownSprites() {
    const assetKeys = [
      'house_cottage',
      'townhouse',
      'apartment_tower',
      'corner_diner',
      'office_building',
      'skyscraper',
      'warehouse',
      'factory',
      'power_plant',
      'water_pump',
      'city_park',
      'semi_truck',
      'taxi'
    ];

    for (const key of assetKeys) {
      const img = new Image();
      img.src = `/assets/sprites/${key}.png`;
      img.onload = () => {
        this.sprites.set(key, img);
        this.loadedKeys.add(key);
      };
      img.onerror = () => {
        // Sprite not generated yet, will use procedural fallback
      };
    }
  }

  public hasSprite(key: string): boolean {
    return this.loadedKeys.has(key);
  }

  public getSprite(key: string): HTMLImageElement | undefined {
    return this.sprites.get(key);
  }
}

export const assetManager = new AssetManager();
