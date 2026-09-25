import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function getToken(): string | null {
  if (process.env.PIXELLAB_API_TOKEN) {
    return process.env.PIXELLAB_API_TOKEN.trim();
  }

  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/PIXELLAB_API_TOKEN=(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const arg = process.argv.find(a => a.startsWith('--token='));
  if (arg) {
    return arg.split('=')[1].trim();
  }

  return null;
}

interface AssetRequest {
  id: string;
  description: string;
  width: number;
  height: number;
  direction?: string;
}

const ASSET_QUEUE: AssetRequest[] = [
  // 1. Residential Buildings
  {
    id: 'house_cottage',
    description: 'Isometric single-story suburban cottage house, red pitched roof, front porch, chimney, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'townhouse',
    description: 'Isometric 2-story brick townhouse, brownstone facade, black iron balcony railing, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'apartment_tower',
    description: 'Isometric 5-story modern apartment building, balconies, rooftop water tank, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  // 2. Commercial Buildings
  {
    id: 'corner_diner',
    description: 'Isometric retro diner cafe restaurant, red and white striped awning, glass display window, neon sign, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'office_building',
    description: 'Isometric 3-story office building, retail ground floor, rooftop sign, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'skyscraper',
    description: 'Isometric sleek corporate glass skyscraper, blue-tinted windows, rooftop antenna beacon, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  // 3. Industrial Buildings
  {
    id: 'warehouse',
    description: 'Isometric industrial storage warehouse, metal roll-up garage door, loading bay, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'factory',
    description: 'Isometric brick manufacturing plant with two tall brick smokestacks, industrial piping, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  // 4. Municipal / Utilities
  {
    id: 'power_plant',
    description: 'Isometric coal-fired power plant with wide concrete cooling tower and transformer coils, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'water_pump',
    description: 'Isometric municipal water pumping station, blue reservoir tank, intake pipes, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'city_park',
    description: 'Isometric city park, stone fountain in center, paved walkway, oak tree and park benches, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  // 5. Municipal Services (Batch 2)
  {
    id: 'fire_station',
    description: 'Isometric 2-story classic red brick fire station, two red arched garage doors, hose drying tower, emergency siren, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'police_station',
    description: 'Isometric 2-story municipal police precinct headquarters, blue trim, rooftop radio communication dish, front steps, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'hospital',
    description: 'Isometric modern municipal hospital and emergency clinic, red cross medical emblem, ambulance bay entrance, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  {
    id: 'school',
    description: 'Isometric 2-story red brick elementary academy school, central clock tower, white columns, clean 16-bit pixel art',
    width: 64,
    height: 64,
    direction: 'south-east'
  },
  // 6. Vehicles
  {
    id: 'taxi',
    description: 'Isometric yellow city taxi cab sedan car, clean 16-bit pixel art',
    width: 48,
    height: 48,
    direction: 'south-east'
  },
  {
    id: 'semi_truck',
    description: 'Isometric freight semi-trailer truck with colorful cargo shipping container, clean 16-bit pixel art',
    width: 64,
    height: 48,
    direction: 'south-east'
  },
  {
    id: 'fire_truck',
    description: 'Isometric red city fire engine truck with ladders and emergency flashers, clean 16-bit pixel art',
    width: 48,
    height: 48,
    direction: 'south-east'
  },
  {
    id: 'police_car',
    description: 'Isometric black and white municipal police patrol cruiser car with emergency rooftop lightbar, clean 16-bit pixel art',
    width: 48,
    height: 48,
    direction: 'south-east'
  }
];

async function generateAsset(token: string, asset: AssetRequest, outputDir: string) {
  const outPath = path.join(outputDir, `${asset.id}.png`);
  const force = process.argv.includes('--force');
  if (fs.existsSync(outPath) && !force) {
    console.log(`   ⏩ [${asset.id}] Already exists at public/assets/sprites/${asset.id}.png, skipping.`);
    return;
  }

  console.log(`\n🎨 [${asset.id}] Submitting generation job to PixelLab...`);
  console.log(`   Prompt: "${asset.description.substring(0, 65)}..."`);

  const response = await fetch('https://api.pixellab.ai/v2/create-image-pixen', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: asset.description,
      image_size: {
        width: asset.width,
        height: asset.height
      },
      view: 'low top-down',
      direction: asset.direction || 'south-east',
      no_background: true,
      detail: 'highly detailed'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PixelLab API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    image?: { type: string; base64: string };
    usage?: { usd: number };
  };

  if (!data.image?.base64) {
    throw new Error(`No image base64 returned in response`);
  }

  // Strip possible data:image/png;base64, prefix
  const base64Data = data.image.base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(outPath, buffer);
  console.log(`   ✨ Saved sprite: public/assets/sprites/${asset.id}.png (${buffer.length} bytes)`);
}

async function main() {
  console.log('====================================================');
  console.log('🏙️  PIXEL CITY SIM — PIXELLAB ASSET GENERATOR');
  console.log('====================================================');

  const token = getToken();

  if (!token || token === 'your_pixellab_token_here') {
    console.error('\n❌ Error: PixelLab API token not found!');
    console.log('\nTo generate assets, either:');
    console.log('  1. Add your token to .env:');
    console.log('     PIXELLAB_API_TOKEN=your_token_here');
    console.log('  2. Or run:');
    console.log('     npm run generate-assets -- --token=YOUR_API_TOKEN\n');
    process.exit(1);
  }

  const outputDir = path.join(projectRoot, 'public', 'assets', 'sprites');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n📋 Processing ${ASSET_QUEUE.length} assets through PixelLab...`);

  let successCount = 0;
  for (const asset of ASSET_QUEUE) {
    try {
      await generateAsset(token, asset, outputDir);
      successCount++;
    } catch (err: unknown) {
      console.error(`   ⚠️ Failed to generate ${asset.id}:`, (err as Error).message);
    }
  }

  console.log(`\n🎉 Done! Successfully generated and saved ${successCount}/${ASSET_QUEUE.length} assets.`);
  console.log('Refresh http://localhost:3000 to see your new sprites live in-game!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
