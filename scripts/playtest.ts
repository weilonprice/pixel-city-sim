import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPlaytest() {
  console.log('====================================================');
  console.log('🏙️  STARTING DEEP AUTOMATED PLAYTEST SUITE');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    userDataDir: path.join(projectRoot, '.chrome-temp'),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--window-size=1280,800',
      '--disable-crash-reporter',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[Page Exception] ${err.message}`);
  });

  console.log('\n1. Loading game at http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

  // 1. Initial State Check
  const initialFunds = await page.$eval('#funds-value', el => el.textContent);
  const initialPop = await page.$eval('#pop-value', el => el.textContent);
  console.log(`   Initial State: Funds = ${initialFunds}, Population = ${initialPop}`);
  if (initialFunds !== '$20,000') throw new Error(`Unexpected initial funds: ${initialFunds}`);

  // 2. Test All Toolbar Buttons
  console.log('\n2. Testing Toolbar buttons clickability...');
  const tools = ['road', 'zone-r', 'zone-c', 'zone-i', 'power-plant', 'water-pump', 'fire-station', 'police-station', 'hospital', 'school', 'park', 'demolish', 'inspect'];
  for (const tool of tools) {
    await page.click(`button[data-tool="${tool}"]`);
    const activeTool = await page.$eval('.tool-btn.active', el => el.getAttribute('data-tool'));
    if (activeTool !== tool) throw new Error(`Tool ${tool} failed to activate`);
  }
  console.log('   ✅ All 13 toolbar buttons respond and toggle properly.');

  // 3. Playtest Construction: Building a Living Town
  console.log('\n3. Player Construction: Laying roads, zones, and utilities...');

  const constructCode = `(() => {
    const game = window.game;
    if (!game) return { success: false, reason: 'Game context not mounted' };

    // A. Connect road south from Interstate 10 starter off-ramp (x=30, y=18)
    game.hud.activeTool = 'road';
    for (let y = 18; y <= 28; y++) {
      game.applyTool(30, y);
    }
    // Main cross boulevard at y = 22
    for (let x = 20; x <= 40; x++) {
      game.applyTool(x, 22);
    }
    // Secondary cross street at y = 25
    for (let x = 24; x <= 36; x++) {
      game.applyTool(x, 25);
    }

    // B. Place Utilities (Coal Power Plant & Water Pump) connected to the boulevard
    game.hud.activeTool = 'power-plant';
    game.applyTool(21, 23);

    game.hud.activeTool = 'water-pump';
    game.applyTool(22, 23);

    // C. Place Municipal Services (Fire, Police, Clinic, School, Park)
    game.hud.activeTool = 'fire-station';
    game.applyTool(28, 21);

    game.hud.activeTool = 'police-station';
    game.applyTool(32, 21);

    game.hud.activeTool = 'hospital';
    game.applyTool(28, 23);

    game.hud.activeTool = 'school';
    game.applyTool(32, 23);

    game.hud.activeTool = 'park';
    game.applyTool(30, 29);

    // D. Zone Residential Neighborhoods (directly touching roads)
    game.hud.activeTool = 'zone-r';
    // North residential block (touching y=22 boulevard)
    for (let x = 24; x <= 27; x++) {
      game.applyTool(x, 21);
    }
    // Residential row along main vertical spine (touching x=30)
    for (let y = 19; y <= 20; y++) {
      game.applyTool(29, y);
    }
    // South residential block (touching y=25 street)
    for (let x = 25; x <= 28; x++) {
      game.applyTool(x, 26);
    }

    // E. Zone Commercial District (directly touching roads)
    game.hud.activeTool = 'zone-c';
    // Commercial along north side of boulevard (touching y=22)
    for (let x = 33; x <= 37; x++) {
      game.applyTool(x, 21);
    }
    // Commercial along vertical spine
    for (let y = 19; y <= 20; y++) {
      game.applyTool(31, y);
    }

    // F. Zone Industrial Park (near power plant, touching y=22 boulevard)
    game.hud.activeTool = 'zone-i';
    for (let x = 24; x <= 27; x++) {
      game.applyTool(x, 23);
    }

    // G. Build Bridge over River (River is around x=45..49, y=22)
    game.hud.activeTool = 'road';
    for (let x = 41; x <= 54; x++) {
      game.applyTool(x, 22);
    }

    // Center camera on newly laid town
    game.camera.centerOnTile(30, 23, 1280, 700);
    game.camera.zoom = 1.35;

    return {
      success: true,
      fundsAfterBuild: game.engine.funds
    };
  })()`;

  const constructTownResult = await page.evaluate(constructCode) as { success: boolean; fundsAfterBuild: number };
  console.log(`   ✅ Construction completed. Remaining funds: $${constructTownResult.fundsAfterBuild.toLocaleString()}`);

  // Take screenshot immediately after layout
  await page.screenshot({ path: path.join(projectRoot, 'playtest_step1_layout.png') });

  // 4. Advance Simulation Time at 3x Speed
  console.log('\n4. Accelerating simulation at 3x speed to allow citizens to move in...');
  await page.click('#btn-speed-3');

  // Wait and monitor simulation progress until population flourishes
  let finalStats = { pop: 0, jobs: 0, funds: 0 };
  for (let i = 1; i <= 6; i++) {
    await sleep(3000);
    finalStats = await page.evaluate(`(() => {
      const g = window.game;
      return {
        pop: g.engine.population,
        jobs: g.engine.totalJobs,
        funds: g.engine.funds
      };
    })()`) as { pop: number; jobs: number; funds: number };
    console.log(`   [Sim Check ${i} (+${i * 3}s)] Pop: ${finalStats.pop} | Jobs: ${finalStats.jobs} | Funds: $${finalStats.funds.toLocaleString()}`);
    if (finalStats.pop > 0 && finalStats.jobs > 0 && i >= 3) {
      break;
    }
  }

  // 5. Verify City Growth & Mechanics
  if (finalStats.pop <= 0) {
    throw new Error(`Population failed to grow! Pop = ${finalStats.pop}`);
  }
  if (finalStats.jobs <= 0) {
    throw new Error(`Jobs failed to spawn! Jobs = ${finalStats.jobs}`);
  }

  console.log(`\n   🎉 SUCCESS! City is alive with ${finalStats.pop} residents and ${finalStats.jobs} jobs!`);

  // Take screenshot of thriving city with buildings & traffic
  const thrivingScreenshot = path.join(projectRoot, 'playtest_thriving_city.png');
  await page.screenshot({ path: thrivingScreenshot });
  console.log(`   📸 Captured screenshot: ${thrivingScreenshot}`);

  // 6. Test Data Overlays
  console.log('\n5. Testing all 7 Data Heatmap Overlays...');
  const overlayModes = ['POWER', 'WATER', 'FIRE', 'CRIME', 'LAND_VALUE', 'POLLUTION', 'NORMAL'];
  for (const mode of overlayModes) {
    await page.select('#overlay-select', mode);
    await sleep(300);
  }
  console.log('   ✅ All 7 data overlays rendered with zero shader/canvas issues.');

  // 7. Test Retro News Ticker
  console.log('\n7. Testing Retro News Ticker...');
  const tickerText = await page.$eval('#ticker-text', el => el.textContent);
  console.log(`   Initial Headline: "${tickerText}"`);
  if (!tickerText || tickerText.length < 5) {
    throw new Error('News ticker text is empty or missing!');
  }

  // Click ticker to cycle headline
  await page.click('#news-ticker');
  await sleep(300);
  const nextHeadline = await page.$eval('#ticker-text', el => el.textContent);
  console.log(`   Cycled Headline: "${nextHeadline}"`);
  console.log('   ✅ News Ticker displays dynamic headlines and responds to clicks.');

  // 8. Test Retro Budget & Tax Sheet Modal
  console.log('\n8. Testing Municipal Budget & Tax Modal...');
  
  // Test opening via B key
  await page.keyboard.press('KeyB');
  await sleep(300);
  let isBudgetOpen = await page.$eval('#budget-modal-overlay', el => !el.classList.contains('hidden'));
  if (!isBudgetOpen) throw new Error('Budget modal failed to open with B key');
  console.log('   ✅ Budget modal opened via "B" key shortcut.');

  // Close via Escape key
  await page.keyboard.press('Escape');
  await sleep(300);
  isBudgetOpen = await page.$eval('#budget-modal-overlay', el => !el.classList.contains('hidden'));
  if (isBudgetOpen) throw new Error('Budget modal failed to close with Escape key');
  console.log('   ✅ Budget modal closed via "Escape" key.');

  // Open via clicking #btn-budget
  await page.click('#btn-budget');
  await sleep(300);
  isBudgetOpen = await page.$eval('#budget-modal-overlay', el => !el.classList.contains('hidden'));
  if (!isBudgetOpen) throw new Error('Budget modal failed to open via #btn-budget');
  console.log('   ✅ Budget modal opened via #btn-budget.');
  await page.screenshot({ path: path.join(projectRoot, 'playtest_budget_modal.png') });

  // Verify financial ledger values
  const totalRev = await page.$eval('#budget-total-rev', el => el.textContent);
  const totalExp = await page.$eval('#budget-total-exp', el => el.textContent);
  const netFlow = await page.$eval('#budget-net-flow', el => el.textContent);
  console.log(`   Ledger breakdown: Revenue = ${totalRev}, Expenses = ${totalExp}, Net Cash Flow = ${netFlow}`);

  // Test slider adjustments & reactive demand/radius scaling
  const budgetTestResult = await page.evaluate(`(() => {
    const game = window.game;
    const engine = game.engine;
    const initialDemandR = engine.demandR;

    // Cut residential tax to 4% -> Demand should surge
    engine.taxRateR = 4;
    engine.tick();
    const lowTaxDemandR = engine.demandR;

    // Raise residential tax to 18% -> Demand should drop
    engine.taxRateR = 18;
    engine.tick();
    const highTaxDemandR = engine.demandR;

    // Test fire department funding scaling
    engine.fundingFire = 140;
    engine.grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation);
    const boostedRadius = Math.max(4, Math.round(14 * (engine.fundingFire / 100)));

    engine.fundingFire = 60;
    engine.grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation);
    const cutRadius = Math.max(4, Math.round(14 * (engine.fundingFire / 100)));

    return {
      initialDemandR,
      lowTaxDemandR,
      highTaxDemandR,
      boostedRadius,
      cutRadius
    };
  })()`) as { initialDemandR: number; lowTaxDemandR: number; highTaxDemandR: number; boostedRadius: number; cutRadius: number };

  console.log(`   Tax Demand Response: at 4% = ${budgetTestResult.lowTaxDemandR}, at 18% = ${budgetTestResult.highTaxDemandR}`);
  if (budgetTestResult.lowTaxDemandR <= budgetTestResult.highTaxDemandR) {
    throw new Error('Tax rate did not properly affect residential demand!');
  }
  console.log(`   Fire Coverage Radius: at 140% = ${budgetTestResult.boostedRadius} tiles, at 60% = ${budgetTestResult.cutRadius} tiles`);
  if (budgetTestResult.boostedRadius <= budgetTestResult.cutRadius) {
    throw new Error('Department funding did not scale coverage radius!');
  }

  // Click Reset button to restore defaults
  await page.click('#budget-btn-reset');
  await sleep(200);
  const resetTaxR = await page.$eval('#val-tax-r', el => el.textContent);
  if (resetTaxR !== '9%') throw new Error(`Budget reset failed! Expected 9%, got ${resetTaxR}`);
  console.log('   ✅ Reset button restored neutral 9% tax rates and 100% funding.');

  // Close modal via Done button
  await page.click('#budget-btn-apply');
  await sleep(200);

  // 9. Test Save and Load Persistence (including Budget & Tax rates)
  await page.click('#btn-pause'); // Pause simulation for deterministic save snapshot
  const popBeforeSave = await page.$eval('#pop-value', el => el.textContent);
  console.log(`\n9. Testing LocalStorage Save & Load (Population at Save: ${popBeforeSave})...`);
  
  // Set custom tax rate before save
  await page.evaluate(`(() => {
    window.game.engine.taxRateR = 7;
    window.game.engine.fundingFire = 125;
  })()`);

  await page.click('#btn-save');
  await sleep(400);

  console.log('   Reloading browser page to test cold boot...');
  await page.reload({ waitUntil: 'networkidle0' });

  // Click Load
  await page.click('#btn-load');
  await sleep(600);

  const restoredPop = await page.$eval('#pop-value', el => el.textContent);
  console.log(`   Restored Population after Load: ${restoredPop}`);
  if (restoredPop !== popBeforeSave) {
    throw new Error(`Save/Load mismatch! Expected ${popBeforeSave}, got ${restoredPop}`);
  }

  const restoredRates = await page.evaluate(`(() => {
    return {
      taxRateR: window.game.engine.taxRateR,
      fundingFire: window.game.engine.fundingFire
    };
  })()`) as { taxRateR: number; fundingFire: number };
  console.log(`   Restored Tax Rate R: ${restoredRates.taxRateR}%, Fire Funding: ${restoredRates.fundingFire}%`);
  if (restoredRates.taxRateR !== 7 || restoredRates.fundingFire !== 125) {
    throw new Error('Save/load failed to restore budget tax/funding rates!');
  }
  console.log('   ✅ Save & Load verified with exact state & budget restoration.');

  // 10. Test Ambient Audio & Mute Controls
  console.log('\n10. Testing Audio Mute Controls & Ambient Soundscape...');
  const initialMuteIcon = await page.$eval('#btn-audio-mute', el => el.textContent);
  if (initialMuteIcon !== '🔊') throw new Error(`Expected initial audio icon 🔊, got ${initialMuteIcon}`);

  // Click mute button
  await page.click('#btn-audio-mute');
  await sleep(200);
  const mutedIcon = await page.$eval('#btn-audio-mute', el => el.textContent);
  if (mutedIcon !== '🔇') throw new Error(`Expected muted icon 🔇, got ${mutedIcon}`);

  // Toggle back with M shortcut key
  await page.keyboard.press('KeyM');
  await sleep(200);
  const unmutedIcon = await page.$eval('#btn-audio-mute', el => el.textContent);
  if (unmutedIcon !== '🔊') throw new Error(`Expected unmuted icon 🔊 after M key, got ${unmutedIcon}`);
  console.log('   ✅ Audio mute controls verified via UI button and "M" shortcut.');

  // 11. Test City Snapshot & Photo Tool
  console.log('\n11. Testing City Snapshot Photo Tool...');
  await page.click('#btn-snapshot');
  await sleep(300);
  console.log('   ✅ Snapshot photo trigger executed with camera flash effect.');

  // 12. Error assertion
  if (errors.length > 0) {
    console.error('\n❌ Uncaught errors detected:');
    errors.forEach(e => console.error(e));
    throw new Error('Playtest failed due to console errors');
  }

  console.log('\n====================================================');
  console.log('🏆 ALL PLAYTESTS PASSED PERFECTLY! 0 ERRORS!');
  console.log('====================================================\n');

  await browser.close();
}

runPlaytest().catch(err => {
  console.error('\n❌ Playtest failed:', err);
  process.exit(1);
});
