import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Try reading token from .env or process.env
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

  // Also check command line arguments: --token=xyz
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
}

// Curated list of starter assets to send to PixelLab
const ASSET_QUEUE: AssetRequest[] = [
  // 1. Buildings
  {
    id: 'house_cottage',
    description: 'Isometric 2.5D small single-story suburban cottage house, red pitched roof, front porch, chimney, clean 16-bit pixel art, isolated transparent background',
    width: 64,
    height: 64
  },
  {
    id: 'townhouse',
    description: 'Isometric 2.5D 2-story brick townhouse, brownstone facade, black iron balcony railing, clean 16-bit pixel art, isolated transparent background',
    width: 64,
    height: 96
  },
  {
    id: 'apartment_tower',
    description: 'Isometric 2.5D 5-story modern apartment building, glass balconies, rooftop water tank and AC fans, clean 16-bit pixel art, isolated transparent background',
    width: 96,
    height: 128
  },
  {
    id: 'corner_diner',
    description: 'Isometric 2.5D retro diner restaurant, red and white striped awning, glass display window, neon signage, clean 16-bit pixel art, isolated transparent background',
    width: 64,
    height: 64
  },
  {
    id: 'office_building',
    description: 'Isometric 2.5D 3-story office building, retail ground floor, rooftop billboard, clean 16-bit pixel art, isolated transparent background',
    width: 64,
    height: 96
  },
  {
    id: 'skyscraper',
    description: 'Isometric 2.5D sleek corporate glass skyscraper, blue-tinted windows, rooftop communications tower, clean 16-bit pixel art, isolated transparent background',
    width: 96,
    height: 144
  },
  {
    id: 'warehouse',
    description: 'Isometric 2.5D industrial storage warehouse, metal roll-up garage door, loading bay, clean 16-bit pixel art, isolated transparent background',
    width: 64,
    height: 64
  },
  {
    id: 'factory',
    description: 'Isometric 2.5D brick manufacturing plant with two tall brick smokestacks, industrial piping, clean 16-bit pixel art, isolated transparent background',
    width: 96,
    height: 96
  },
  // 2. Municipal / Utilities
  {
    id: 'power_plant',
    description: 'Isometric 2.5D coal-fired power plant with wide concrete cooling tower and transformer coils, clean 16-bit pixel art, isolated transparent background',
    width: 96,
    height: 96
  },
  {
    id: 'water_pump',
    description: 'Isometric 2.5D municipal water pumping station, blue reservoir tank, intake pipes, clean 16-bit pixel art, isolated transparent background',
    width: 64,
    height: 64
  },
  {
    id: 'city_park',
    description: 'Isometric 2.5D city park, stone fountain in center, paved walkway, oak tree and park benches, clean 16-bit pixel art, isolated transparent background',
    width: 64,
    height: 64
  },
  // 3. Vehicles
  {
    id: 'taxi',
    description: 'Isometric 2.5D yellow city taxi cab sedan car, clean 16-bit pixel art, isolated transparent background',
    width: 48,
    height: 48
  },
  {
    id: 'semi_truck',
    description: 'Isometric 2.5D freight semi-trailer truck with colorful shipping container, clean 16-bit pixel art, isolated transparent background',
    width: 64,
    height: 48
  }
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateAsset(token: string, asset: AssetRequest, outputDir: string) {
  console.log(`\n🎨 [${asset.id}] Submitting generation job to PixelLab...`);
  console.log(`   Prompt: "${asset.description.substring(0, 70)}..."`);

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
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PixelLab API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { job_id?: string; image_url?: string; status?: string };

  let imageUrl = data.image_url;

  // If a background job was queued, poll for completion
  if (!imageUrl && data.job_id) {
    console.log(`   ⏳ Job ID: ${data.job_id}. Waiting for PixelLab AI generation...`);
    const jobId = data.job_id;
    let completed = false;
    let attempts = 0;

    while (!completed && attempts < 30) {
      await sleep(5000);
      attempts++;
      process.stdout.write('.');

      const pollRes = await fetch(`https://api.pixellab.ai/v2/background-jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (pollRes.ok) {
        const pollData = await pollRes.json() as { status?: string; result?: { image_url?: string } };
        if (pollData.status === 'completed' && pollData.result?.image_url) {
          imageUrl = pollData.result.image_url;
          completed = true;
          console.log('\n   ✅ Generation completed!');
          break;
        } else if (pollData.status === 'failed') {
          throw new Error(`Job ${jobId} failed`);
        }
      }
    }
  }

  if (!imageUrl) {
    throw new Error(`Could not obtain image URL for ${asset.id}`);
  }

  // Download image file
  console.log(`   📥 Downloading sprite from: ${imageUrl}`);
  const imgRes = await fetch(imageUrl);
  const buffer = await imgRes.arrayBuffer();

  const outPath = path.join(outputDir, `${asset.id}.png`);
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`   ✨ Saved to public/assets/sprites/${asset.id}.png`);
}

async function main() {
  console.log('====================================================');
  console.log('🏙️  PIXEL CITY SIM — PIXELLAB BATCH ASSET GENERATOR');
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

  console.log(`\n📋 Queued ${ASSET_QUEUE.length} assets for generation.`);

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
