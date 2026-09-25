import { SimulationEngine } from '../simulation/SimulationEngine.ts';
import { WeatherType } from '../core/Constants.ts';
import { sounds } from '../core/SoundEffects.ts';

export class NewsTicker {
  private engine: SimulationEngine;
  private tickerEl: HTMLElement;
  private textEl: HTMLElement;
  private currentHeadlineIndex: number = 0;
  private rotationTimer: number | null = null;
  private currentEmergency: string | null = null;
  private emergencyTimer: number | null = null;

  private humorHeadlines: string[] = [
    "SimCity Times: Local llama population reaches record high in central park.",
    "Mayor caught playing city simulator during municipal council session.",
    "Local meteorologist predicts 90% chance of isometric sunshine.",
    "Scientists confirm the world is rendered on a crisp 45-degree angle.",
    "Traffic helicopter pilot reports no gridlock: 'Just enjoying the pixel scenery.'",
    "Corner Diner waitress awarded Citizen of the Month for world-class cherry pie.",
    "Pigeon congress convenes on city hall roof, issues demands for more breadcrumbs.",
    "Citizens overwhelmingly approve of municipal tree planting initiatives.",
    "Local inventor unveils steam-powered lawn mower; city fire chief watches nervously.",
    "Archaeologists unearth ancient floppy disk beneath highway interchange.",
    "Poll: 87% of residents prefer paved roads over dirt paths.",
    "City library introduces late fee forgiveness in exchange for pixel art donations.",
    "Mystery solved: The missing construction cones were used as festive party hats.",
    "Bakers Guild reports nationwide shortage of doughnut sprinkles."
  ];

  constructor(engine: SimulationEngine, tickerEl: HTMLElement, textEl: HTMLElement) {
    this.engine = engine;
    this.tickerEl = tickerEl;
    this.textEl = textEl;

    this.bindEvents();
    this.startRotation();
    this.updateHeadline();
  }

  private bindEvents() {
    this.tickerEl.addEventListener('click', () => {
      sounds.playClick();
      this.cycleNext();
    });
  }

  public triggerEmergency(msg: string) {
    this.currentEmergency = msg;
    this.updateHeadline(true);

    if (this.emergencyTimer) {
      window.clearTimeout(this.emergencyTimer);
    }

    // Keep emergency headline for 12 seconds
    this.emergencyTimer = window.setTimeout(() => {
      this.currentEmergency = null;
      this.updateHeadline();
    }, 12000);
  }

  private startRotation() {
    if (this.rotationTimer) {
      window.clearInterval(this.rotationTimer);
    }
    // Rotate headlines every 9 seconds
    this.rotationTimer = window.setInterval(() => {
      if (!this.currentEmergency) {
        this.currentHeadlineIndex++;
        this.updateHeadline();
      }
    }, 9000);
  }

  public cycleNext() {
    this.currentEmergency = null;
    this.currentHeadlineIndex++;
    this.updateHeadline();
  }

  public generateHeadlines(): string[] {
    const list: string[] = [];

    // 1. Emergency & Utility Headlines
    let firesCount = 0;
    let unpoweredCount = 0;
    let unwateredCount = 0;
    let disconnectedCount = 0;

    const size = this.engine.grid.size;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.engine.grid.tiles[x][y];
        if (t.building) {
          if (t.building.onFire) firesCount++;
          if (!t.building.powered) unpoweredCount++;
          if (!t.building.watered) unwateredCount++;
          if (!t.building.hasHighwayAccess) disconnectedCount++;
        }
      }
    }

    if (firesCount > 0) {
      list.push(`🚨 EMERGENCY: ${firesCount} active fire${firesCount > 1 ? 's' : ''} raging! Fire department response requested!`);
    }

    if (disconnectedCount > 0) {
      list.push("⚠️ HIGHWAY ALERT: Citizens unable to commute without roads connected to Interstate 10!");
    }

    if (unpoweredCount > 5) {
      list.push(`⚡ ROLLING BLACKOUTS: ${unpoweredCount} buildings without electricity! Build or connect Power Plants!`);
    }

    if (unwateredCount > 5) {
      list.push(`💧 DRY TAPS: ${unwateredCount} buildings lack water service! Water pumps needed!`);
    }

    // 2. Budget & Tax Headlines
    if (this.engine.funds < 0) {
      list.push("📉 FISCAL CRISIS: City treasury is in deficit! Mayor urged to balance municipal budget!");
    } else if (this.engine.funds > 50000) {
      list.push("💰 CITY BOOMING: Municipal reserves overflow as treasury surpasses $50,000!");
    }

    if (this.engine.taxRateR > 13) {
      list.push("😡 HIGH TAXES: Citizens protest residential tax hikes! Moving trucks spotted leaving town!");
    } else if (this.engine.taxRateR < 7) {
      list.push("🎉 TAX HAVEN: New families flock to the city attracted by low residential taxes!");
    }

    if (this.engine.taxRateC > 13) {
      list.push("💼 CHAMBER OF COMMERCE: Steep commercial taxes choking local business profits!");
    }

    if (this.engine.taxRateI > 13) {
      list.push("🏭 INDUSTRIAL PROTEST: Factory owners threaten regional relocation over high tax burdens!");
    }

    // 3. Department Funding Headlines
    if (this.engine.fundingFire < 80) {
      list.push("🔥 FIRE UNION WARNING: Budget cutbacks leave fire station response times dangerously slow!");
    }
    if (this.engine.fundingPolice < 80) {
      list.push("🚓 CRIME WATCH: Police funding cuts spark citizen safety concerns in underpatrolled zones!");
    }
    if (this.engine.fundingRoads < 80) {
      list.push("🚧 POTHOLE CRISIS: Motorists file formal complaints regarding neglected road maintenance!");
    }
    if (this.engine.fundingHealth >= 120) {
      list.push("🏥 MEDICAL EXCELLENCE: Generous hospital funding boosts citizen wellness and longevity!");
    }
    if (this.engine.fundingEducation >= 120) {
      list.push("🎓 HONOR ROLL: Local schools rank top in region following expanded education funding!");
    }
    if (this.engine.fundingTransit < 80 && this.engine.busStopCount > 0) {
      list.push("🚌 TRANSIT DELAYS: Low bus funding causes commuter delays and overcrowded shelters!");
    } else if (this.engine.fundingTransit >= 120 && this.engine.busStopCount > 0) {
      list.push("🚌 RAPID TRANSIT: Generous transit investment guarantees speedy bus service across town!");
    }

    // Transit Network Status
    if (this.engine.busStopCount > 0 && this.engine.busDepotCount === 0) {
      list.push("🚏 TRANSIT ALERT: Bus stops await service! Build a central Bus Depot to dispatch buses!");
    } else if (this.engine.busRidership > 50) {
      list.push(`🚌 RIDERSHIP BOOM: Over ${this.engine.busRidership} citizens ride municipal buses each month!`);
    } else if (this.engine.busDepotCount > 0 && this.engine.busStopCount > 0) {
      list.push("🚌 METRO TRANSIT: City buses roll out! Commuters enjoy convenient roadside pick-ups.");
    }

    // 4. Municipal Ordinances & Policies
    if (this.engine.ordinances.smokeDetectors) {
      list.push("🧯 PREVENTATIVE SAFETY: Smoke detector mandate dramatically cuts home fire hazards!");
    }
    if (this.engine.ordinances.freeTransit) {
      list.push("🚌 FREE TRANSIT DAY: Citizens flock to public buses, easing traffic wear on roads!");
    }
    if (this.engine.ordinances.cleanEnergy) {
      list.push("🌱 CLEAN AIR INITIATIVE: Smog scrubbers installed at power stations, blue skies return!");
    }
    if (this.engine.ordinances.neighborhoodWatch) {
      list.push("🚨 NEIGHBORHOOD WATCH: Vigilant citizens report zero burglaries in protected blocks!");
    }
    if (this.engine.ordinances.readingCampaign) {
      list.push("📚 LITERACY SOARING: Public schools report record reading test scores across grades!");
    }

    // 5. Dynamic Weather Bulletins
    if (this.engine.weather === WeatherType.RAIN) {
      list.push("🌧️ WEATHER DESK: Spring showers bring umbrellas and puddle splashing across town.");
    } else if (this.engine.weather === WeatherType.THUNDERSTORM) {
      list.push("⛈️ SEVERE THUNDERSTORM: Lightning flashes illuminate the metropolitan skyline!");
    } else if (this.engine.weather === WeatherType.OVERCAST) {
      list.push("⛅ WEATHER REPORT: Overcast skies drift over the regional highway corridor.");
    }

    // 6. Population & Growth Milestones
    if (this.engine.population === 0) {
      list.push("🏙️ Welcome Mayor! Zone residential areas and connect them to Interstate 10 to welcome your first citizens!");
    } else if (this.engine.population < 100) {
      list.push(`🏡 Pioneer settlement: Population stands at ${this.engine.population} eager residents.`);
    } else if (this.engine.population < 500) {
      list.push(`🏘️ Growing township: ${this.engine.population} citizens now call our city home!`);
    } else {
      list.push(`🌆 Bustling metropolis: Population reaches ${this.engine.population} with ${this.engine.totalJobs} active jobs!`);
    }

    // Civic Rewards & Landmarks
    if (this.engine.hasMayorsMansion) {
      list.push("🏛️ CIVIC PRIDE: Citizens marvel at the stately Mayor's Historic Mansion in the civic district!");
    }
    if (this.engine.hasCityHall) {
      list.push("🏛️ CITY HALL IN SESSION: Administrative reforms achieve a 10% efficiency saving across all municipal departments!");
    }
    if (this.engine.hasGrandCentral) {
      list.push("🚉 GRAND CENTRAL TERMINAL: Thousands of regional travelers stream through the monumental Beaux-Arts concourse!");
    }

    // Heavy Rail Transit
    if (this.engine.trainStationCount > 0) {
      list.push(`🚂 ALL ABOARD: Passenger railway network carries ${this.engine.trainRidership} daily riders along steel corridors!`);
      list.push("🚉 RAILWAY BOOM: Commuters celebrate rapid transit as passenger trains connect city districts.");
    }

    // High-Density Skylines & Skyscrapers
    let maxBuildingLevel = 0;
    const grid = this.engine.grid;
    for (let x = 0; x < grid.size; x++) {
      for (let y = 0; y < grid.size; y++) {
        const b = grid.tiles[x][y].building;
        if (b && b.level > maxBuildingLevel) maxBuildingLevel = b.level;
      }
    }
    if (maxBuildingLevel >= 4) {
      list.push("🏙️ HIGH-RISE BOOM: Luxury condominiums and corporate plazas transform the urban skyline!");
    }
    if (maxBuildingLevel >= 5) {
      list.push("💎 ARCHITECTURAL MARVEL: The 50-story Tier 5 glass megatower pierces the clouds downtown!");
      list.push("🚀 TECH REVOLUTION: Clean aerospace & robotics mega-campuses establish city as global innovation hub.");
    }

    // 7. Classic Humorous Headlines
    list.push(...this.humorHeadlines);

    return list;
  }

  public updateHeadline(isEmergency: boolean = false) {
    let text = '';
    if (isEmergency && this.currentEmergency) {
      text = this.currentEmergency;
      this.tickerEl.classList.add('emergency');
    } else {
      this.tickerEl.classList.remove('emergency');
      const headlines = this.generateHeadlines();
      const index = Math.abs(this.currentHeadlineIndex) % headlines.length;
      text = headlines[index];
    }

    // Trigger smooth fade transition
    this.textEl.style.opacity = '0';
    setTimeout(() => {
      this.textEl.textContent = text;
      this.textEl.style.opacity = '1';
    }, 150);
  }
}
