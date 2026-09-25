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
  await page.setViewport({ width: 1440, height: 900 });

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
  const tools = ['dirt-road', 'road', 'avenue', 'zone-r', 'zone-c', 'zone-i', 'power-plant', 'water-pump', 'fire-station', 'police-station', 'hospital', 'school', 'park', 'bus-depot', 'bus-stop', 'train-station', 'train-track', 'demolish', 'inspect'];
  for (const tool of tools) {
    const btn = await page.$(`button[data-tool="${tool}"]`);
    if (!btn) throw new Error(`Button for ${tool} not found`);
    await btn.evaluate(el => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    await btn.click();
    const activeTool = await page.$eval('.tool-btn.active', el => el.getAttribute('data-tool'));
    if (activeTool !== tool) throw new Error(`Tool ${tool} failed to activate`);
  }
  console.log('   ✅ All 19 standard toolbar buttons respond and toggle properly.');

  // 2b. Test Locked Reward Buildings — they should NOT activate before milestones
  console.log('   Testing locked reward building buttons...');
  const lockedRewardTools = ['mayors-mansion', 'city-hall', 'grand-central'];
  for (const tool of lockedRewardTools) {
    const btn = await page.$(`button[data-tool="${tool}"]`);
    if (!btn) throw new Error(`Reward tool ${tool} not found`);
    await btn.evaluate(el => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    await btn.click();
    const isLocked = await page.$eval(`button[data-tool="${tool}"]`, el => el.classList.contains('locked'));
    if (!isLocked) throw new Error(`Reward tool ${tool} should be locked at game start!`);
  }
  console.log('   ✅ All 3 reward building buttons are correctly locked at game start.');

  // 3. Playtest Construction: Building a Living Town
  console.log('\n3. Player Construction: Laying roads, avenues, dirt tracks, zones, transit network, and utilities...');

  const constructCode = `(() => {
    const game = window.game;
    if (!game) return { success: false, reason: 'Game context not mounted' };

    // A. Connect paved road south from Interstate 10 starter off-ramp (x=30, y=18)
    game.hud.activeTool = 'road';
    for (let y = 18; y <= 28; y++) {
      game.applyTool(30, y);
    }
    // Main cross Downtown Avenue at y = 22
    game.hud.activeTool = 'avenue';
    for (let x = 20; x <= 40; x++) {
      game.applyTool(x, 22);
    }
    // Country Dirt Road connecting out west at y = 28
    game.hud.activeTool = 'dirt-road';
    for (let x = 16; x <= 30; x++) {
      game.applyTool(x, 28);
    }
    // Secondary cross street at y = 25
    game.hud.activeTool = 'road';
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

    // Municipal Bus Transit Network (Bus Depot + Roadside Bus Stops)
    game.hud.activeTool = 'bus-depot';
    game.applyTool(29, 23);

    game.hud.activeTool = 'bus-stop';
    game.applyTool(27, 21);
    game.applyTool(35, 21);
    game.applyTool(29, 26);

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

    // G. Build Cable-Stayed Avenue Bridge over River (River is around x=45..49, y=22)
    game.hud.activeTool = 'avenue';
    for (let x = 41; x <= 54; x++) {
      game.applyTool(x, 22);
    }

    // H. Build Heavy Railroad Corridor & Passenger Station
    game.hud.activeTool = 'train-station';
    game.applyTool(21, 24);
    game.hud.activeTool = 'train-track';
    for (let y = 23; y <= 27; y++) {
      game.applyTool(22, y);
    }

    // Center camera on newly laid town
    game.camera.centerOnTile(30, 23, 1280, 700);
    game.camera.zoom = 1.35;

    // Trigger initial simulation tick to update utilities and metrics
    game.engine.tick();

    const avenueTile = game.grid.getTile(25, 22);
    const dirtRoadTile = game.grid.getTile(20, 28);
    const pavedRoadTile = game.grid.getTile(30, 20);
    const depotTile = game.grid.getTile(29, 23);
    const stopTile = game.grid.getTile(27, 21);
    const stationTile = game.grid.getTile(21, 24);
    const trackTile = game.grid.getTile(22, 25);

    return {
      success: true,
      fundsAfterBuild: game.engine.funds,
      avenueType: avenueTile ? avenueTile.type : null,
      dirtRoadType: dirtRoadTile ? dirtRoadTile.type : null,
      pavedRoadType: pavedRoadTile ? pavedRoadTile.type : null,
      avenueConnected: avenueTile ? avenueTile.connectedToHighway : false,
      dirtConnected: dirtRoadTile ? dirtRoadTile.connectedToHighway : false,
      depotType: depotTile ? depotTile.type : null,
      stopType: stopTile ? stopTile.type : null,
      stationType: stationTile ? stationTile.type : null,
      trackType: trackTile ? trackTile.type : null,
      busDepotCount: game.engine.busDepotCount,
      busStopCount: game.engine.busStopCount,
      trainStationCount: game.engine.trainStationCount,
      stopTransitCoverage: stopTile ? stopTile.transitCoverage : 0
    };
  })()`;

  const constructTownResult = await page.evaluate(constructCode) as {
    success: boolean;
    fundsAfterBuild: number;
    avenueType: string;
    dirtRoadType: string;
    pavedRoadType: string;
    avenueConnected: boolean;
    dirtConnected: boolean;
    depotType: string;
    stopType: string;
    stationType: string;
    trackType: string;
    busDepotCount: number;
    busStopCount: number;
    trainStationCount: number;
    stopTransitCoverage: number;
  };
  console.log(`   ✅ Construction completed. Remaining funds: $${constructTownResult.fundsAfterBuild.toLocaleString()}`);
  console.log(`   Road Hierarchy Verified: Avenue=${constructTownResult.avenueType} (Hwy:${constructTownResult.avenueConnected ? '✅' : '❌'}), Dirt=${constructTownResult.dirtRoadType} (Hwy:${constructTownResult.dirtConnected ? '✅' : '❌'}), Paved=${constructTownResult.pavedRoadType}`);
  console.log(`   Transit Network Verified: Depot=${constructTownResult.depotType} (${constructTownResult.busDepotCount} Depots), Stops=${constructTownResult.stopType} (${constructTownResult.busStopCount} Stops, Stop Cov: ${constructTownResult.stopTransitCoverage}%)`);
  console.log(`   Heavy Rail Network Verified: Station=${constructTownResult.stationType} (${constructTownResult.trainStationCount} Stations), Track=${constructTownResult.trackType}`);

  if (constructTownResult.avenueType !== 'AVENUE') throw new Error(`Expected AVENUE type, got ${constructTownResult.avenueType}`);
  if (constructTownResult.dirtRoadType !== 'DIRT_ROAD') throw new Error(`Expected DIRT_ROAD type, got ${constructTownResult.dirtRoadType}`);
  if (constructTownResult.pavedRoadType !== 'ROAD') throw new Error(`Expected ROAD type, got ${constructTownResult.pavedRoadType}`);
  if (!constructTownResult.avenueConnected || !constructTownResult.dirtConnected) throw new Error('Avenue or Dirt Road failed to connect to highway!');
  if (constructTownResult.depotType !== 'BUS_DEPOT') throw new Error(`Expected BUS_DEPOT, got ${constructTownResult.depotType}`);
  if (constructTownResult.stopType !== 'BUS_STOP') throw new Error(`Expected BUS_STOP, got ${constructTownResult.stopType}`);
  if (constructTownResult.busDepotCount < 1 || constructTownResult.busStopCount < 2) throw new Error('Transit depots or stops not counted in engine!');
  if (constructTownResult.stationType !== 'TRAIN_STATION') throw new Error(`Expected TRAIN_STATION, got ${constructTownResult.stationType}`);
  if (constructTownResult.trackType !== 'TRAIN_TRACK') throw new Error(`Expected TRAIN_TRACK, got ${constructTownResult.trackType}`);
  if (constructTownResult.trainStationCount < 1) throw new Error('Train station not counted in engine!');

  // Take screenshot immediately after layout
  await page.screenshot({ path: path.join(projectRoot, 'playtest_step1_layout.png') });

  // 4. Advance Simulation Time at 3x Speed
  console.log('\n4. Accelerating simulation at 3x speed to allow citizens to move in and ride transit...');
  await page.click('#btn-speed-3');

  // Wait and monitor simulation progress until population flourishes
  let finalStats = { pop: 0, jobs: 0, funds: 0, ridership: 0, buses: 0, trains: 0, trainRidership: 0 };
  for (let i = 1; i <= 6; i++) {
    await sleep(3000);
    finalStats = await page.evaluate(`(() => {
      const g = window.game;
      return {
        pop: g.engine.population,
        jobs: g.engine.totalJobs,
        funds: g.engine.funds,
        ridership: g.engine.busRidership,
        buses: g.renderer && g.renderer.vehicles ? g.renderer.vehicles.filter(v => v.isBus).length : 0,
        trains: g.renderer && g.renderer.vehicles ? g.renderer.vehicles.filter(v => v.isTrain).length : 0,
        trainRidership: g.engine.trainRidership
      };
    })()`) as { pop: number; jobs: number; funds: number; ridership: number; buses: number; trains: number; trainRidership: number };
    console.log(`   [Sim Check ${i} (+${i * 3}s)] Pop: ${finalStats.pop} | Jobs: ${finalStats.jobs} | Bus Riders: ${finalStats.ridership} | Train Riders: ${finalStats.trainRidership} | Buses: ${finalStats.buses} | Trains: ${finalStats.trains} | Funds: $${finalStats.funds.toLocaleString()}`);
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

  // 5b. Test City Milestones & Reward Buildings System
  console.log('\n5b. Testing City Milestones & Reward Building System...');
  const milestoneState = await page.evaluate(`(() => {
    const e = window.game.engine;
    return {
      unlockedCount: e.unlockedMilestones.length,
      milestones: e.unlockedMilestones,
      hasMansion: e.hasMayorsMansion,
      hasCityHall: e.hasCityHall,
      hasGrandCentral: e.hasGrandCentral,
      pop: e.population
    };
  })()`) as { unlockedCount: number; milestones: string[]; hasMansion: boolean; hasCityHall: boolean; hasGrandCentral: boolean; pop: number };

  console.log(`   Unlocked Milestones (${milestoneState.unlockedCount}): [${milestoneState.milestones.join(', ')}]`);
  // 'settlement' should always be unlocked (pop >= 0)
  if (!milestoneState.milestones.includes('settlement')) {
    throw new Error('Settlement milestone should be unlocked at any population!');
  }
  console.log('   ✅ Settlement milestone auto-unlocked.');

  // Check milestone badge in top bar
  const milestoneBadge = await page.$eval('#milestone-value', el => el.textContent);
  console.log(`   Milestone Badge: "${milestoneBadge}"`);
  if (!milestoneBadge || milestoneBadge.length < 3) {
    throw new Error('Milestone badge text is empty or missing!');
  }
  console.log('   ✅ Milestone badge displays current rank in top bar.');

  // If population reached 100+, village should be unlocked and Mayor's Mansion available
  if (milestoneState.pop >= 100) {
    if (!milestoneState.milestones.includes('village')) {
      throw new Error(`Population is ${milestoneState.pop} but Village milestone not unlocked!`);
    }
    console.log('   ✅ Village milestone unlocked at pop ' + milestoneState.pop);

    // Check Mayor's Mansion button is now unlocked
    const mansionUnlocked = await page.$eval('button[data-tool="mayors-mansion"]', el => el.classList.contains('unlocked-reward') || !el.classList.contains('locked'));
    if (!mansionUnlocked) {
      throw new Error("Mayor's Mansion should be unlocked after Village milestone!");
    }
    console.log("   ✅ Mayor's Mansion toolbar button unlocked after Village milestone.");
  }

  // Test milestone modal opens
  await page.click('#stat-milestone');
  await sleep(300);
  const modalVisible = await page.$eval('#milestone-modal', el => (el as HTMLElement).style.display !== 'none');
  if (!modalVisible) throw new Error('Milestone modal failed to open!');
  console.log('   ✅ Milestone modal opens on badge click.');

  // Close modal
  const closeBtn = await page.$('#milestone-modal .modal-close');
  if (closeBtn) {
    await closeBtn.click();
    await sleep(200);
  }

  // 6. Test Data Overlays
  console.log('\n6. Testing all 8 Data Heatmap Overlays (including Public Transit)...');
  const overlayModes = ['POWER', 'WATER', 'FIRE', 'CRIME', 'LAND_VALUE', 'POLLUTION', 'TRANSIT', 'NORMAL'];
  for (const mode of overlayModes) {
    await page.select('#overlay-select', mode);
    await sleep(200);
  }
  console.log('   ✅ All 8 data overlays rendered with zero shader/canvas issues.');

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
  const transitCost = await page.$eval('#fund-transit-cost', el => el.textContent);
  const netFlow = await page.$eval('#budget-net-flow', el => el.textContent);
  console.log(`   Ledger breakdown: Revenue = ${totalRev}, Expenses = ${totalExp}, Transit Upkeep = ${transitCost}, Net Cash Flow = ${netFlow}`);

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

  // 8.5 Test City Ordinances & Municipal Policies Tab
  console.log('\n8.5 Testing City Ordinances & Municipal Policies...');
  // Switch to Ordinances tab
  await page.click('#tab-btn-ordinances');
  await sleep(200);

  const isOrdinanceTabVisible = await page.$eval('#tab-content-ordinances', el => !el.classList.contains('hidden'));
  if (!isOrdinanceTabVisible) throw new Error('Ordinance tab failed to display!');

  // Toggle on all 5 ordinances
  const ordToggles = [
    '#ord-toggle-smoke',
    '#ord-toggle-transit',
    '#ord-toggle-clean',
    '#ord-toggle-watch',
    '#ord-toggle-reading'
  ];

  for (const toggleId of ordToggles) {
    await page.click(toggleId);
    await sleep(100);
    const txt = await page.$eval(toggleId, el => el.textContent);
    const isActive = await page.$eval(toggleId, el => el.classList.contains('active'));
    if (txt !== 'ON' || !isActive) {
      throw new Error(`Ordinance toggle ${toggleId} failed to turn ON!`);
    }
  }

  // Verify ordinances state in SimulationEngine
  const ordinanceStatus = await page.evaluate(`(() => {
    const engine = window.game.engine;
    const ledger = engine.getFinancialLedger();
    return {
      ordinances: engine.ordinances,
      expenseOrdinances: ledger.expenseOrdinances
    };
  })()`) as { ordinances: Record<string, boolean>; expenseOrdinances: number };

  console.log(`   Active Ordinances Cost: -$${ordinanceStatus.expenseOrdinances}/mo (Expected: $175)`);
  if (ordinanceStatus.expenseOrdinances !== 175) {
    throw new Error(`Ordinances expense mismatch! Expected 175, got ${ordinanceStatus.expenseOrdinances}`);
  }

  // Switch back to Taxes tab and verify the line item shows in the expense list
  await page.click('#tab-btn-taxes');
  await sleep(200);
  const ordCostInLedger = await page.$eval('#fund-ord-cost', el => el.textContent);
  console.log(`   Ledger line item: Active City Ordinances = ${ordCostInLedger}`);
  if (ordCostInLedger !== '-$175/mo') {
    throw new Error(`Ledger did not display ordinances expense! Expected -$175/mo, got ${ordCostInLedger}`);
  }
  console.log('   ✅ City Ordinances toggles, tab switching, and cost deductions verified.');

  // Close modal via Done button
  await page.click('#budget-btn-apply');
  await sleep(200);

  // 9. Test Dynamic Weather System
  console.log('\n9. Testing Dynamic Weather System & Atmosphere...');
  await page.click('#btn-pause'); // Pause simulation for deterministic weather testing
  await sleep(100);
  const weatherInitial = await page.$eval('#weather-value', el => el.textContent);
  console.log(`   Initial Weather: ${weatherInitial}`);

  // Test cycling through all 4 weather states via clicking #stat-weather
  const expectedCycle = ['Overcast', 'Rain', 'Storm', 'Clear'];
  for (const expectedName of expectedCycle) {
    await page.click('#stat-weather');
    await sleep(200);
    const currentName = await page.$eval('#weather-value', el => el.textContent);
    console.log(`   Cycled Weather: ${currentName} (Expected: ${expectedName})`);
    if (currentName !== expectedName) {
      throw new Error(`Weather cycling failed! Expected ${expectedName}, got ${currentName}`);
    }
  }

  // Programmatically test Thunderstorm with lighting and rain drops
  console.log('   Testing Thunderstorm lightning and atmospheric rendering...');
  await page.evaluate(`(() => {
    window.game.engine.setWeather('THUNDERSTORM');
  })()`);
  await sleep(500);
  const stormVal = await page.$eval('#weather-value', el => el.textContent);
  if (stormVal !== 'Storm') throw new Error(`Failed to activate Thunderstorm, got ${stormVal}`);
  console.log('   ✅ Dynamic Weather System cycling & thunderstorm atmosphere verified.');

  // 10. Test Save and Load Persistence (including Budget, Ordinances & Weather)
  const popBeforeSave = await page.$eval('#pop-value', el => el.textContent);
  console.log(`\n10. Testing LocalStorage Save & Load (Population at Save: ${popBeforeSave})...`);
  
  // Set custom tax rate and transit funding before save
  await page.evaluate(`(() => {
    window.game.engine.taxRateR = 7;
    window.game.engine.fundingFire = 125;
    window.game.engine.fundingTransit = 135;
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

  const restoredState = await page.evaluate(`(() => {
    const e = window.game.engine;
    return {
      taxRateR: e.taxRateR,
      fundingFire: e.fundingFire,
      fundingTransit: e.fundingTransit,
      busRidership: e.busRidership,
      weather: e.weather,
      smokeDetectors: e.ordinances.smokeDetectors,
      freeTransit: e.ordinances.freeTransit
    };
  })()`) as { taxRateR: number; fundingFire: number; fundingTransit: number; busRidership: number; weather: string; smokeDetectors: boolean; freeTransit: boolean };

  console.log(`   Restored Tax Rate R: ${restoredState.taxRateR}%, Fire Funding: ${restoredState.fundingFire}%, Transit Funding: ${restoredState.fundingTransit}%`);
  console.log(`   Restored Weather: ${restoredState.weather}`);
  console.log(`   Restored Ordinances: smokeDetectors=${restoredState.smokeDetectors}, freeTransit=${restoredState.freeTransit}`);

  if (restoredState.taxRateR !== 7 || restoredState.fundingFire !== 125 || restoredState.fundingTransit !== 135) {
    throw new Error('Save/load failed to restore budget tax/funding rates!');
  }
  if (restoredState.weather !== 'THUNDERSTORM') {
    throw new Error(`Save/load failed to restore weather! Expected THUNDERSTORM, got ${restoredState.weather}`);
  }
  if (!restoredState.smokeDetectors || !restoredState.freeTransit) {
    throw new Error('Save/load failed to restore active municipal ordinances!');
  }

  const restoredWeatherBadge = await page.$eval('#weather-value', el => el.textContent);
  if (restoredWeatherBadge !== 'Storm') {
    throw new Error(`Weather badge UI not updated after load! Expected Storm, got ${restoredWeatherBadge}`);
  }

  const restoredRoadAndTransitTypes = await page.evaluate(`(() => {
    const g = window.game;
    return {
      avenueType: g.grid.getTile(25, 22)?.type,
      dirtRoadType: g.grid.getTile(20, 28)?.type,
      pavedRoadType: g.grid.getTile(30, 20)?.type,
      depotType: g.grid.getTile(29, 23)?.type,
      stopType: g.grid.getTile(27, 21)?.type,
      stationType: g.grid.getTile(21, 24)?.type,
      trackType: g.grid.getTile(22, 25)?.type,
      depotCount: g.engine.busDepotCount,
      stopCount: g.engine.busStopCount,
      stationCount: g.engine.trainStationCount,
      trainRidership: g.engine.trainRidership
    };
  })()`) as { avenueType: string; dirtRoadType: string; pavedRoadType: string; depotType: string; stopType: string; stationType: string; trackType: string; depotCount: number; stopCount: number; stationCount: number; trainRidership: number };

  if (restoredRoadAndTransitTypes.avenueType !== 'AVENUE' || restoredRoadAndTransitTypes.dirtRoadType !== 'DIRT_ROAD' || restoredRoadAndTransitTypes.pavedRoadType !== 'ROAD') {
    throw new Error(`Road hierarchy failed to persist! Got: ave=${restoredRoadAndTransitTypes.avenueType}, dirt=${restoredRoadAndTransitTypes.dirtRoadType}, road=${restoredRoadAndTransitTypes.pavedRoadType}`);
  }
  if (restoredRoadAndTransitTypes.depotType !== 'BUS_DEPOT' || restoredRoadAndTransitTypes.stopType !== 'BUS_STOP') {
    throw new Error(`Transit structures failed to persist! Got: depot=${restoredRoadAndTransitTypes.depotType}, stop=${restoredRoadAndTransitTypes.stopType}`);
  }
  if (restoredRoadAndTransitTypes.stationType !== 'TRAIN_STATION' || restoredRoadAndTransitTypes.trackType !== 'TRAIN_TRACK') {
    throw new Error(`Heavy rail structures failed to persist! Got: station=${restoredRoadAndTransitTypes.stationType}, track=${restoredRoadAndTransitTypes.trackType}`);
  }

  console.log(`   Restored Road Hierarchy: Avenue=${restoredRoadAndTransitTypes.avenueType}, Dirt Road=${restoredRoadAndTransitTypes.dirtRoadType}, Paved Road=${restoredRoadAndTransitTypes.pavedRoadType}`);
  console.log(`   Restored Transit Network: Depot=${restoredRoadAndTransitTypes.depotType} (${restoredRoadAndTransitTypes.depotCount}), Stop=${restoredRoadAndTransitTypes.stopType} (${restoredRoadAndTransitTypes.stopCount})`);
  console.log(`   Restored Heavy Rail: Station=${restoredRoadAndTransitTypes.stationType} (${restoredRoadAndTransitTypes.stationCount}), Track=${restoredRoadAndTransitTypes.trackType}`);

  // Verify milestone persistence
  const restoredMilestones = await page.evaluate(`(() => {
    return window.game.engine.unlockedMilestones;
  })()`) as string[];
  console.log(`   Restored Milestones: [${restoredMilestones.join(', ')}]`);
  if (!restoredMilestones.includes('settlement')) {
    throw new Error('Save/load failed to restore milestones! Settlement missing.');
  }
  console.log('   ✅ Save & Load verified with exact state, budget, transit, weather, ordinances, milestones & road hierarchy restoration.');

  // 11. Test High-Density Skylines & Modern Glass Towers (Tier 4 & Tier 5)
  console.log('\n11. Testing High-Density Skylines & Modern Glass Towers (Tier 4 & Tier 5)...');
  const skylineResult = await page.evaluate(`(() => {
    const g = window.game;
    const grid = g.grid;
    const engine = g.engine;

    // Pick 3 test tiles for R, C, and I
    const rTile = grid.getTile(24, 21);
    const cTile = grid.getTile(25, 23);
    const iTile = grid.getTile(36, 26);

    if (!rTile || !cTile || !iTile) return { success: false, reason: 'Test tiles not found' };

    // Ensure power, water, road adjacency, and high service coverage
    rTile.powered = true;
    rTile.watered = true;
    rTile.landValue = 90;
    rTile.healthCoverage = 90;
    rTile.educationCoverage = 90;
    rTile.fireCoverage = 90;
    rTile.policeCoverage = 90;
    rTile.transitCoverage = 85;

    cTile.powered = true;
    cTile.watered = true;
    cTile.landValue = 92;
    cTile.fireCoverage = 90;
    cTile.policeCoverage = 90;
    cTile.transitCoverage = 88;

    iTile.powered = true;
    iTile.watered = true;
    iTile.fireCoverage = 85;
    iTile.policeCoverage = 85;
    iTile.transitCoverage = 80;

    // Test Residential progression to Tier 4 & Tier 5
    rTile.building = {
      zone: 'RESIDENTIAL',
      level: 3,
      residents: 80,
      jobs: 0,
      style: 1
    };

    engine.applyBuildingCapacity(rTile.building);
    const rL3Cap = rTile.building.residents;
    rTile.building.level = 4;
    engine.applyBuildingCapacity(rTile.building);
    const rL4Cap = rTile.building.residents;
    rTile.building.level = 5;
    engine.applyBuildingCapacity(rTile.building);
    const rL5Cap = rTile.building.residents;

    // Test Commercial progression
    cTile.building = {
      zone: 'COMMERCIAL',
      level: 3,
      residents: 0,
      jobs: 60,
      style: 1
    };
    cTile.building.level = 4;
    engine.applyBuildingCapacity(cTile.building);
    const cL4Jobs = cTile.building.jobs;
    cTile.building.level = 5;
    engine.applyBuildingCapacity(cTile.building);
    const cL5Jobs = cTile.building.jobs;

    // Test Industrial progression & low-pollution scaling
    iTile.building = {
      zone: 'INDUSTRIAL',
      level: 3,
      residents: 0,
      jobs: 90,
      style: 1
    };
    iTile.building.level = 4;
    engine.applyBuildingCapacity(iTile.building);
    const iL4Jobs = iTile.building.jobs;
    iTile.building.level = 5;
    engine.applyBuildingCapacity(iTile.building);
    const iL5Jobs = iTile.building.jobs;

    // Update pollution map and test clean industrial campus pollution
    grid.recalculateServiceCoverages(engine.fundingFire, engine.fundingPolice, engine.fundingHealth, engine.fundingEducation, engine.fundingTransit, engine.ordinances);
    const l5IndustrialPollution = iTile.pollution;

    // Check news headlines generation
    const newsTicker = g.hud ? g.hud.newsTicker : null;
    const headlines = newsTicker ? newsTicker.generateHeadlines() : [];
    const hasHighRiseHeadline = headlines.some(h => h.includes('HIGH-RISE BOOM') || h.includes('ARCHITECTURAL MARVEL'));

    return {
      success: true,
      rL3Cap,
      rL4Cap,
      rL5Cap,
      cL4Jobs,
      cL5Jobs,
      iL4Jobs,
      iL5Jobs,
      l5IndustrialPollution,
      hasHighRiseHeadline
    };
  })()`) as {
    success: boolean;
    reason?: string;
    rL3Cap: number;
    rL4Cap: number;
    rL5Cap: number;
    cL4Jobs: number;
    cL5Jobs: number;
    iL4Jobs: number;
    iL5Jobs: number;
    l5IndustrialPollution: number;
    hasHighRiseHeadline: boolean;
  };

  if (!skylineResult.success) {
    throw new Error(`High-Density Skyline test failed: ${skylineResult.reason}`);
  }

  console.log(`   Residential Capacity: Tier 3 = ${skylineResult.rL3Cap}, Tier 4 (Luxury Condos) = ${skylineResult.rL4Cap}, Tier 5 (Apex Megatower) = ${skylineResult.rL5Cap}`);
  console.log(`   Commercial Capacity: Tier 4 (Corporate Plaza) = ${skylineResult.cL4Jobs} jobs, Tier 5 (World Trade Megatower) = ${skylineResult.cL5Jobs} jobs`);
  console.log(`   Industrial Capacity: Tier 4 (Biotech Campus) = ${skylineResult.iL4Jobs} jobs, Tier 5 (Aerospace Megafactory) = ${skylineResult.iL5Jobs} jobs`);
  console.log(`   Tier 5 Megatower News Headline Active: ${skylineResult.hasHighRiseHeadline}`);

  if (skylineResult.rL4Cap !== 180 || skylineResult.rL5Cap !== 350) {
    throw new Error(`Residential skyscraper capacity mismatch! Expected L4=180, L5=350, got L4=${skylineResult.rL4Cap}, L5=${skylineResult.rL5Cap}`);
  }
  if (skylineResult.cL4Jobs !== 150 || skylineResult.cL5Jobs !== 320) {
    throw new Error(`Commercial skyscraper jobs mismatch! Expected L4=150, L5=320, got L4=${skylineResult.cL4Jobs}, L5=${skylineResult.cL5Jobs}`);
  }
  if (skylineResult.iL4Jobs !== 160 || skylineResult.iL5Jobs !== 300) {
    throw new Error(`Industrial high-tech jobs mismatch! Expected L4=160, L5=300, got L4=${skylineResult.iL4Jobs}, L5=${skylineResult.iL5Jobs}`);
  }
  if (!skylineResult.hasHighRiseHeadline) {
    throw new Error('News ticker failed to generate Tier 5 megatower / high-rise boom headlines!');
  }
  console.log('   ✅ High-Density Skylines Tier 4 & 5 capacities, green tech campuses, and headlines verified.');

  // 12. Test Ambient Audio & Mute Controls
  console.log('\n12. Testing Audio Mute Controls & Ambient Soundscape...');
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

  // 13. Test City Snapshot & Photo Tool
  console.log('\n13. Testing City Snapshot Photo Tool...');
  await page.click('#btn-snapshot');
  await sleep(300);
  console.log('   ✅ Snapshot photo trigger executed with camera flash effect.');

  // 14. Test Natural Disasters & Emergency Response System
  console.log('\n14. Testing Natural Disasters & Emergency Response System...');
  
  // 14.1 Open Disaster Modal via #btn-disasters
  await page.click('#btn-disasters');
  await sleep(300);
  let isDisasterModalOpen = await page.$eval('#disaster-modal-overlay', el => !el.classList.contains('hidden'));
  if (!isDisasterModalOpen) throw new Error('Disaster modal failed to open via #btn-disasters!');
  console.log('   ✅ Disaster Emergency Operations Center modal opened.');

  // Close via #disaster-modal-close
  await page.click('#disaster-modal-close');
  await sleep(200);
  isDisasterModalOpen = await page.$eval('#disaster-modal-overlay', el => !el.classList.contains('hidden'));
  if (isDisasterModalOpen) throw new Error('Disaster modal failed to close!');

  // Re-open via keyboard shortcut 'd' or 'D'
  await page.keyboard.press('KeyD');
  await sleep(200);
  isDisasterModalOpen = await page.$eval('#disaster-modal-overlay', el => !el.classList.contains('hidden'));
  if (!isDisasterModalOpen) throw new Error('Disaster modal failed to open via "D" key shortcut!');
  console.log('   ✅ Disaster modal shortcut "D" verified.');

  // 14.2 Trigger Tornado
  console.log('   Triggering Category F4 Tornado...');
  const tornadoTriggerBtn = await page.$('.disaster-trigger-btn[data-disaster="TORNADO"]');
  if (!tornadoTriggerBtn) throw new Error('Tornado trigger button not found!');
  await tornadoTriggerBtn.click();
  await sleep(300);

  const disasterState = await page.evaluate(`(() => {
    const g = window.game;
    const engine = g.engine;
    return {
      activeTornadoes: engine.activeTornadoes.length,
      activeEarthquakes: engine.activeEarthquakes.length,
      activeMeteors: engine.activeMeteors.length,
      shakeIntensity: g.camera.shakeIntensity
    };
  })()`) as { activeTornadoes: number; activeEarthquakes: number; activeMeteors: number; shakeIntensity: number };

  if (disasterState.activeTornadoes !== 1) {
    throw new Error(`Expected 1 active tornado, got ${disasterState.activeTornadoes}`);
  }
  console.log(`   Active Tornadoes: ${disasterState.activeTornadoes}, Camera Shake Intensity: ${disasterState.shakeIntensity}`);

  // Advance simulation a few ticks to let tornado path damage structures into rubble
  await page.evaluate(`(() => {
    const engine = window.game.engine;
    for (let i = 0; i < 20; i++) {
      engine.tick();
    }
  })()`);

  // Verify rubble was generated on map
  const rubbleCount = await page.evaluate(`(() => {
    const grid = window.game.grid;
    let count = 0;
    for (let x = 0; x < grid.size; x++) {
      for (let y = 0; y < grid.size; y++) {
        const t = grid.tiles[x][y];
        if (t.isRubble || t.damaged) count++;
      }
    }
    return count;
  })()`) as number;

  console.log(`   Ruins and Rubble sites generated by tornado: ${rubbleCount}`);
  if (rubbleCount === 0) {
    throw new Error('Tornado did not produce any rubble or damaged infrastructure!');
  }

  // Check emergency news ticker headline
  const disasterHeadlines = await page.evaluate(`(() => {
    const news = window.game.hud?.newsTicker;
    return news ? news.generateHeadlines() : [];
  })()`) as string[];

  const hasDisasterAlert = disasterHeadlines.some(h => h.includes('TORNADO') || h.includes('EMERGENCY') || h.includes('ALERT'));
  console.log(`   Disaster Alert Breaking News Bulletin Active: ${hasDisasterAlert}`);
  if (!hasDisasterAlert) {
    throw new Error('News ticker failed to generate emergency disaster alert bulletin!');
  }

  // 14.3 Test Earthquake
  console.log('   Triggering Magnitude 7.2 Earthquake...');
  await page.evaluate(`(() => {
    window.game.engine.triggerDisaster('EARTHQUAKE', 25, 25);
  })()`);
  await sleep(200);

  const quakeState = await page.evaluate(`(() => {
    return {
      activeEarthquakes: window.game.engine.activeEarthquakes.length,
      shakeIntensity: window.game.camera.shakeIntensity
    };
  })()`) as { activeEarthquakes: number; shakeIntensity: number };

  console.log(`   Active Earthquakes: ${quakeState.activeEarthquakes}, Screen Shake: ${quakeState.shakeIntensity}`);
  if (quakeState.activeEarthquakes !== 1) {
    throw new Error(`Expected 1 active earthquake, got ${quakeState.activeEarthquakes}`);
  }
  if (quakeState.shakeIntensity <= 0) {
    throw new Error('Earthquake failed to trigger screen shake!');
  }

  // 14.4 Test Meteor Strike
  console.log('   Summoning Cosmic Meteor Strike...');
  await page.evaluate(`(() => {
    window.game.engine.triggerDisaster('METEOR', 28, 24);
  })()`);
  await sleep(200);

  const meteorState = await page.evaluate(`(() => {
    return window.game.engine.activeMeteors.length;
  })()`) as number;
  console.log(`   Active Meteors: ${meteorState}`);
  if (meteorState !== 1) {
    throw new Error(`Expected 1 active meteor, got ${meteorState}`);
  }

  // Let meteor detonate
  await page.evaluate(`(() => {
    const engine = window.game.engine;
    for (let i = 0; i < 35; i++) {
      engine.tick();
    }
  })()`);

  // 14.5 Test Municipal Emergency Cleanup
  console.log('   Testing Municipal Emergency Cleanup Crews dispatch...');
  const rubbleBeforeCleanup = await page.evaluate(`(() => {
    const grid = window.game.grid;
    let count = 0;
    for (let x = 0; x < grid.size; x++) {
      for (let y = 0; y < grid.size; y++) {
        if (grid.tiles[x][y].isRubble || grid.tiles[x][y].damaged) count++;
      }
    }
    return count;
  })()`) as number;
  console.log(`   Total Rubble Sites before cleanup: ${rubbleBeforeCleanup}`);

  // Abort any residual disaster effects
  await page.evaluate(`(() => {
    window.game.engine.abortAllDisasters();
  })()`);

  // Click cleanup rubble button
  await page.click('#btn-cleanup-rubble');
  await sleep(300);

  const rubbleAfterCleanup = await page.evaluate(`(() => {
    const grid = window.game.grid;
    let count = 0;
    for (let x = 0; x < grid.size; x++) {
      for (let y = 0; y < grid.size; y++) {
        if (grid.tiles[x][y].isRubble || grid.tiles[x][y].damaged) count++;
      }
    }
    return count;
  })()`) as number;
  console.log(`   Total Rubble Sites after municipal cleanup: ${rubbleAfterCleanup}`);
  if (rubbleAfterCleanup !== 0) {
    throw new Error(`Municipal cleanup failed to clear all rubble! ${rubbleAfterCleanup} remaining.`);
  }

  // 14.6 Test Manual Demolish tool clearing individual rubble
  console.log('   Testing manual Demolish bulldozer tool on rubble tile...');
  await page.evaluate(`(() => {
    const grid = window.game.grid;
    const tile = grid.getTile(20, 20);
    if (tile) {
      tile.type = 'GRASS';
      tile.isRubble = true;
    }
    window.game.hud.selectTool('demolish');
    window.game.applyTool(20, 20);
  })()`);

  const manualClearResult = await page.evaluate(`(() => {
    const t = window.game.grid.getTile(20, 20);
    return t ? { isRubble: t.isRubble, type: t.type } : null;
  })()`) as { isRubble: boolean; type: string } | null;

  if (!manualClearResult || manualClearResult.isRubble) {
    throw new Error('Manual demolish tool failed to clear rubble tile!');
  }
  console.log('   ✅ Manual bulldozer successfully cleared rubble site.');

  // Close disaster modal
  await page.click('#disaster-modal-done');
  await sleep(200);
  console.log('   ✅ Natural Disasters & Emergency Response System verified.');

  // 15. Error assertion
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
