import { SimulationEngine } from '../simulation/SimulationEngine.ts';
import { sounds } from '../core/SoundEffects.ts';
import { OverlayMode, WeatherType } from '../core/Constants.ts';
import { BudgetModal } from './BudgetModal.ts';
import { MilestoneModal } from './MilestoneModal.ts';
import { NewsTicker } from './NewsTicker.ts';
import { SnapshotTool } from './SnapshotTool.ts';

export class HUD {
  private engine: SimulationEngine;
  public activeTool: string = 'inspect';

  // Sub-components
  public budgetModal: BudgetModal;
  public milestoneModal: MilestoneModal;
  public newsTicker: NewsTicker;
  public snapshotTool?: SnapshotTool;

  // DOM Elements
  private fundsEl: HTMLElement;
  private fundsBadgeEl: HTMLElement;
  private budgetBtn: HTMLButtonElement;
  private snapshotBtn: HTMLButtonElement;
  private muteBtn: HTMLButtonElement;
  private popEl: HTMLElement;
  private dateEl: HTMLElement;
  private weatherBadgeEl: HTMLElement;
  private weatherIconEl: HTMLElement;
  private weatherValEl: HTMLElement;
  private rciREl: HTMLElement;
  private rciCEl: HTMLElement;
  private rciIEl: HTMLElement;
  private toastEl: HTMLElement;
  private overlaySelectEl: HTMLSelectElement;
  private saveBtn: HTMLButtonElement;
  private loadBtn: HTMLButtonElement;
  private toolButtons: NodeListOf<HTMLButtonElement>;
  private speedButtons: NodeListOf<HTMLButtonElement>;

  // Tool change callback
  public onToolChange?: (tool: string) => void;

  constructor(engine: SimulationEngine) {
    this.engine = engine;

    this.fundsEl = document.getElementById('funds-value')!;
    this.fundsBadgeEl = document.getElementById('stat-funds')!;
    this.budgetBtn = document.getElementById('btn-budget') as HTMLButtonElement;
    this.snapshotBtn = document.getElementById('btn-snapshot') as HTMLButtonElement;
    this.muteBtn = document.getElementById('btn-audio-mute') as HTMLButtonElement;
    this.popEl = document.getElementById('pop-value')!;
    this.dateEl = document.getElementById('date-value')!;
    this.weatherBadgeEl = document.getElementById('stat-weather')!;
    this.weatherIconEl = document.getElementById('weather-icon')!;
    this.weatherValEl = document.getElementById('weather-value')!;
    this.rciREl = document.getElementById('rci-r-fill')!;
    this.rciCEl = document.getElementById('rci-c-fill')!;
    this.rciIEl = document.getElementById('rci-i-fill')!;
    this.toastEl = document.getElementById('toast')!;
    this.overlaySelectEl = document.getElementById('overlay-select') as HTMLSelectElement;
    this.saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
    this.loadBtn = document.getElementById('btn-load') as HTMLButtonElement;
    this.toolButtons = document.querySelectorAll('.tool-btn');
    this.speedButtons = document.querySelectorAll('.speed-btn');

    // Initialize sub-components
    this.budgetModal = new BudgetModal(this.engine);
    this.milestoneModal = new MilestoneModal(this.engine);
    const tickerEl = document.getElementById('news-ticker')!;
    const tickerTextEl = document.getElementById('ticker-text')!;
    this.newsTicker = new NewsTicker(this.engine, tickerEl, tickerTextEl);

    this.budgetModal.onApply = () => {
      this.updateStats();
    };

    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.updateStats();

    this.engine.onStatsUpdate = () => {
      this.updateStats();
      if (this.budgetModal.isOpen()) {
        this.budgetModal.updateDisplay();
      }
      if (this.milestoneModal.isOpen()) {
        this.milestoneModal.renderMilestonesList();
      }
    };
    this.engine.onNotification = (msg: string) => {
      this.showToast(msg);
      this.newsTicker.triggerEmergency(msg);
    };
  }

  private setupEventListeners() {
    // Milestone badge click in top bar
    const milestoneBadge = document.getElementById('stat-milestone');
    if (milestoneBadge) {
      milestoneBadge.addEventListener('click', () => {
        sounds.playClick();
        this.milestoneModal.toggle();
      });
    }

    // Toolbar buttons
    this.toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playClick();
        this.selectTool(btn.dataset.tool || 'inspect');
      });
    });

    // Speed buttons
    this.speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playClick();
        const speed = parseInt(btn.dataset.speed || '1', 10);
        this.setSpeed(speed);
      });
    });

    // Data Overlay Selector
    this.overlaySelectEl.addEventListener('change', () => {
      sounds.playClick();
      const mode = this.overlaySelectEl.value as OverlayMode;
      this.engine.setOverlayMode(mode);
    });

    // Save Button
    this.saveBtn.addEventListener('click', () => {
      sounds.playClick();
      this.engine.saveToLocalStorage();
    });

    // Load Button
    this.loadBtn.addEventListener('click', () => {
      sounds.playClick();
      this.engine.loadFromLocalStorage();
    });

    // Budget Modal Button & Treasury Click
    const openBudget = () => {
      sounds.playClick();
      this.budgetModal.toggle();
    };

    if (this.budgetBtn) {
      this.budgetBtn.addEventListener('click', openBudget);
    }
    if (this.fundsBadgeEl) {
      this.fundsBadgeEl.addEventListener('click', openBudget);
    }

    // Audio Mute Toggle
    const updateMuteBtnUI = () => {
      if (this.muteBtn) {
        this.muteBtn.textContent = sounds.getIsMuted() ? '🔇' : '🔊';
        this.muteBtn.title = sounds.getIsMuted() ? 'Unmute Sound [M]' : 'Mute Sound [M]';
      }
    };
    updateMuteBtnUI();

    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        sounds.toggleMute();
        updateMuteBtnUI();
        this.showToast(sounds.getIsMuted() ? '🔇 Audio muted' : '🔊 Audio unmuted');
      });
    }

    // Snapshot Photo Button
    if (this.snapshotBtn) {
      this.snapshotBtn.addEventListener('click', () => {
        if (this.snapshotTool) {
          this.snapshotTool.takeSnapshot();
        }
      });
    }

    // Weather Conditions Badge Click to Cycle
    if (this.weatherBadgeEl) {
      this.weatherBadgeEl.addEventListener('click', () => {
        sounds.playClick();
        const cycle = [
          WeatherType.CLEAR,
          WeatherType.OVERCAST,
          WeatherType.RAIN,
          WeatherType.THUNDERSTORM
        ];
        const nextIdx = (cycle.indexOf(this.engine.weather) + 1) % cycle.length;
        this.engine.setWeather(cycle[nextIdx]);

        const names: Record<WeatherType, string> = {
          [WeatherType.CLEAR]: '☀️ Clear Skies',
          [WeatherType.OVERCAST]: '☁️ Overcast',
          [WeatherType.RAIN]: '🌧️ Rain Showers',
          [WeatherType.THUNDERSTORM]: '⛈️ Severe Thunderstorm'
        };
        this.showToast(`Weather changed to ${names[this.engine.weather]}`);
      });
    }
  }

  private setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        if (e.key === 'Escape') {
          this.budgetModal.close();
        }
        return;
      }

      if (e.key === 'b' || e.key === 'B') {
        sounds.playClick();
        this.budgetModal.toggle();
      } else if (e.key === 'm' || e.key === 'M') {
        sounds.toggleMute();
        if (this.muteBtn) {
          this.muteBtn.textContent = sounds.getIsMuted() ? '🔇' : '🔊';
          this.muteBtn.title = sounds.getIsMuted() ? 'Unmute Sound [M]' : 'Mute Sound [M]';
        }
        this.showToast(sounds.getIsMuted() ? '🔇 Audio muted' : '🔊 Audio unmuted');
      } else if (e.key === 'p' || e.key === 'P') {
        if (this.snapshotTool) {
          this.snapshotTool.takeSnapshot();
        }
      } else if (e.key === 'Escape') {
        if (this.budgetModal.isOpen()) {
          sounds.playClick();
          this.budgetModal.close();
        } else {
          sounds.playClick();
          this.selectTool('inspect');
        }
      } else if (e.key === '1') {
        sounds.playClick();
        this.setSpeed(1);
      } else if (e.key === '2') {
        sounds.playClick();
        this.setSpeed(2);
      } else if (e.key === '3') {
        sounds.playClick();
        this.setSpeed(5);
      } else if (e.key === ' ') {
        e.preventDefault();
        sounds.playClick();
        this.setSpeed(this.engine.speed === 0 ? 1 : 0);
      }
    });
  }

  public selectTool(toolName: string) {
    // Check if selecting a locked civic reward
    if (toolName === 'mayors-mansion' && !this.engine.unlockedMilestones.includes('town')) {
      sounds.playError();
      this.showToast("🔒 Mayor's Mansion requires Booming Town (500 Pop) to unlock!");
      return;
    }
    if (toolName === 'city-hall' && !this.engine.unlockedMilestones.includes('city')) {
      sounds.playError();
      this.showToast("🔒 City Hall requires Prosperous City (1,500 Pop) to unlock!");
      return;
    }
    if (toolName === 'grand-central' && !this.engine.unlockedMilestones.includes('metropolis')) {
      sounds.playError();
      this.showToast("🔒 Grand Central requires Grand Metropolis (5,000 Pop) to unlock!");
      return;
    }

    this.toolButtons.forEach(btn => {
      if (btn.dataset.tool === toolName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.activeTool = toolName;
    if (this.onToolChange) {
      this.onToolChange(this.activeTool);
    }
  }

  public setSpeed(speed: number) {
    this.speedButtons.forEach(btn => {
      if (parseInt(btn.dataset.speed || '1', 10) === speed) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.engine.setSpeed(speed);
  }

  public updateStats() {
    this.fundsEl.textContent = `$${this.engine.funds.toLocaleString()}`;
    if (this.engine.funds < 0) {
      this.fundsEl.style.color = '#ef4444';
    } else {
      this.fundsEl.style.color = '#4ade80';
    }

    this.popEl.textContent = this.engine.population.toLocaleString();
    this.dateEl.textContent = this.engine.getDateString();

    // Update Milestones badge and toolbar lock states
    this.milestoneModal.updateTopBarBadge();
    this.milestoneModal.updateToolbarRewards();

    if (this.weatherIconEl && this.weatherValEl) {
      switch (this.engine.weather) {
        case WeatherType.CLEAR:
          this.weatherIconEl.textContent = '☀️';
          this.weatherValEl.textContent = 'Clear';
          this.weatherBadgeEl.style.color = '#facc15';
          break;
        case WeatherType.OVERCAST:
          this.weatherIconEl.textContent = '☁️';
          this.weatherValEl.textContent = 'Overcast';
          this.weatherBadgeEl.style.color = '#94a3b8';
          break;
        case WeatherType.RAIN:
          this.weatherIconEl.textContent = '🌧️';
          this.weatherValEl.textContent = 'Rain';
          this.weatherBadgeEl.style.color = '#60a5fa';
          break;
        case WeatherType.THUNDERSTORM:
          this.weatherIconEl.textContent = '⛈️';
          this.weatherValEl.textContent = 'Storm';
          this.weatherBadgeEl.style.color = '#c084fc';
          break;
      }
    }

    const mapDemand = (d: number) => `${Math.max(10, Math.min(100, (d + 100) / 2))}%`;
    this.rciREl.style.height = mapDemand(this.engine.demandR);
    this.rciCEl.style.height = mapDemand(this.engine.demandC);
    this.rciIEl.style.height = mapDemand(this.engine.demandI);
  }

  public showToast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 4000);
  }
}
