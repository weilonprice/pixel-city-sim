import { SimulationEngine } from '../simulation/SimulationEngine.ts';
import { CITY_MILESTONES, CityMilestone } from '../core/Constants.ts';
import { sounds } from '../core/SoundEffects.ts';

export class MilestoneModal {
  private engine: SimulationEngine;
  private container: HTMLElement;
  private isVisible: boolean = false;
  private milestoneValueEl: HTMLElement | null = null;

  // Modal elements
  private celebrationBanner!: HTMLElement;
  private celebrationRank!: HTMLElement;
  private celebrationDesc!: HTMLElement;
  private celebrationRewardName!: HTMLElement;
  private celebrationRewardPerk!: HTMLElement;
  private milestonesContainer!: HTMLElement;
  private closeBtn!: HTMLElement;
  private doneBtn!: HTMLElement;

  constructor(engine: SimulationEngine) {
    this.engine = engine;

    this.container = document.createElement('div');
    this.container.id = 'milestone-modal-overlay';
    this.container.className = 'modal-overlay hidden';
    this.container.innerHTML = this.buildHTML();
    document.body.appendChild(this.container);

    this.bindElements();
    this.bindEvents();

    this.milestoneValueEl = document.getElementById('milestone-value');
    this.updateTopBarBadge();
    this.updateToolbarRewards();

    // Hook engine callback
    this.engine.onMilestoneReached = (milestone: CityMilestone) => {
      this.updateTopBarBadge();
      this.updateToolbarRewards();
      this.open(milestone);
    };
  }

  private buildHTML(): string {
    return `
      <div id="milestone-modal" class="budget-modal milestone-modal-content">
        <div class="budget-header" style="background: linear-gradient(90deg, #1e1b4b, #312e81, #1e1b4b); border-bottom: 2px solid #6366f1;">
          <div class="budget-title" style="color: #facc15; font-size: 11px;">🏆 CITY MILESTONES & CIVIC PROGRESSION</div>
          <button id="milestone-modal-close" class="modal-close-btn">&times;</button>
        </div>

        <div class="budget-body" style="padding: 16px; max-height: 480px; overflow-y: auto;">
          <!-- CELEBRATION HERO BANNER -->
          <div id="milestone-celebration-banner" class="milestone-celebration-hero hidden">
            <div class="celebration-badge">🎉 POPULATION MILESTONE ACHIEVED!</div>
            <div id="celebration-rank" class="celebration-rank-text">Booming Town</div>
            <div id="celebration-desc" class="celebration-desc-text">500 citizens now call your city home!</div>
            <div class="celebration-reward-card">
              <span class="reward-ribbon">NEW REWARD UNLOCKED</span>
              <div id="celebration-reward-name" class="celebration-reward-title">Mayor's Historic Mansion</div>
              <div id="celebration-reward-perk" class="celebration-reward-subtitle">+10 City-Wide Demand Boost & +25 Land Value</div>
            </div>
          </div>

          <!-- PROGRESS OVERVIEW -->
          <div class="milestones-section-title">CIVIC TIERS & PERKS</div>
          <div id="milestones-cards-list" class="milestones-cards-list"></div>
        </div>

        <div class="budget-footer" style="justify-content: flex-end;">
          <button id="milestone-btn-done" class="budget-btn primary" style="background: #4f46e5; border-color: #818cf8; font-size: 11px; padding: 8px 18px;">
            Celebrate & Continue
          </button>
        </div>
      </div>
    `;
  }

  private bindElements() {
    this.celebrationBanner = this.container.querySelector('#milestone-celebration-banner')!;
    this.celebrationRank = this.container.querySelector('#celebration-rank')!;
    this.celebrationDesc = this.container.querySelector('#celebration-desc')!;
    this.celebrationRewardName = this.container.querySelector('#celebration-reward-name')!;
    this.celebrationRewardPerk = this.container.querySelector('#celebration-reward-perk')!;
    this.milestonesContainer = this.container.querySelector('#milestones-cards-list')!;
    this.closeBtn = this.container.querySelector('#milestone-modal-close')!;
    this.doneBtn = this.container.querySelector('#milestone-btn-done')!;
  }

  private bindEvents() {
    this.closeBtn.addEventListener('click', () => {
      sounds.playClick();
      this.close();
    });

    this.doneBtn.addEventListener('click', () => {
      sounds.playClick();
      this.close();
    });

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        sounds.playClick();
        this.close();
      }
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.close();
      }
    });
  }

  public open(celebrationMilestone?: CityMilestone) {
    this.isVisible = true;
    this.container.classList.remove('hidden');

    if (celebrationMilestone) {
      this.celebrationBanner.classList.remove('hidden');
      this.celebrationRank.textContent = celebrationMilestone.name;
      this.celebrationDesc.textContent = celebrationMilestone.description;
      this.celebrationRewardName.textContent = celebrationMilestone.rewardName;
      this.celebrationRewardPerk.textContent = celebrationMilestone.perkSummary;
      this.doneBtn.textContent = '🎉 Claim Reward & Continue';
    } else {
      this.celebrationBanner.classList.add('hidden');
      this.doneBtn.textContent = 'Close';
    }

    this.renderMilestonesList();
  }

  public close() {
    this.isVisible = false;
    this.container.classList.add('hidden');
  }

  public toggle() {
    if (this.isVisible) this.close();
    else this.open();
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public renderMilestonesList() {
    const pop = this.engine.population;
    const unlocked = this.engine.unlockedMilestones;

    this.milestonesContainer.innerHTML = '';

    CITY_MILESTONES.forEach((m, idx) => {
      const isUnlocked = unlocked.includes(m.id);
      const isCurrentTarget = !isUnlocked && (idx === 0 || unlocked.includes(CITY_MILESTONES[idx - 1].id));

      const card = document.createElement('div');
      card.className = `milestone-card ${isUnlocked ? 'unlocked' : (isCurrentTarget ? 'active-target' : 'locked')}`;

      let statusBadge = '';
      if (isUnlocked) {
        statusBadge = '<span class="status-pill completed">✅ UNLOCKED</span>';
      } else if (isCurrentTarget) {
        const prevPop = idx > 0 ? CITY_MILESTONES[idx - 1].minPop : 0;
        const progress = Math.min(100, Math.max(0, Math.round(((pop - prevPop) / (m.minPop - prevPop)) * 100)));
        statusBadge = `<span class="status-pill in-progress">⏳ ${pop} / ${m.minPop} (${progress}%)</span>`;
      } else {
        statusBadge = `<span class="status-pill locked">🔒 Req: ${m.minPop} Pop</span>`;
      }

      card.innerHTML = `
        <div class="milestone-card-header">
          <div class="milestone-rank-info">
            <span class="milestone-name">${m.name}</span>
            <span class="milestone-pop-req">${m.minPop === 0 ? 'Starter Frontier' : `Minimum: ${m.minPop.toLocaleString()} Citizens`}</span>
          </div>
          ${statusBadge}
        </div>
        <div class="milestone-card-body">
          <div class="milestone-reward-title">🎁 ${m.rewardName}</div>
          <div class="milestone-perk-summary">${m.perkSummary}</div>
        </div>
      `;

      this.milestonesContainer.appendChild(card);
    });
  }

  public updateTopBarBadge() {
    if (!this.milestoneValueEl) {
      this.milestoneValueEl = document.getElementById('milestone-value');
    }
    if (!this.milestoneValueEl) return;

    const pop = this.engine.population;
    const unlocked = this.engine.unlockedMilestones;

    // Find current rank and next target
    let currentRank = CITY_MILESTONES[0];
    let nextRank: CityMilestone | null = null;

    for (let i = 0; i < CITY_MILESTONES.length; i++) {
      if (unlocked.includes(CITY_MILESTONES[i].id)) {
        currentRank = CITY_MILESTONES[i];
        nextRank = i + 1 < CITY_MILESTONES.length ? CITY_MILESTONES[i + 1] : null;
      }
    }

    if (nextRank) {
      this.milestoneValueEl.textContent = `${currentRank.name} (${pop}/${nextRank.minPop})`;
    } else {
      this.milestoneValueEl.textContent = `🌟 ${currentRank.name} (Max Tier)`;
    }
  }

  public updateToolbarRewards() {
    const checkTool = (toolId: string, milestoneId: string) => {
      const btn = document.getElementById(toolId) as HTMLButtonElement | null;
      if (!btn) return;

      const isUnlocked = this.engine.unlockedMilestones.includes(milestoneId);
      if (isUnlocked) {
        btn.classList.remove('locked');
        btn.classList.add('unlocked-reward');
      } else {
        btn.classList.add('locked');
        btn.classList.remove('unlocked-reward');
      }
    };

    checkTool('tool-mayors-mansion', 'town');
    checkTool('tool-city-hall', 'city');
    checkTool('tool-grand-central', 'metropolis');
  }
}
