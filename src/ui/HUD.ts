import { SimulationEngine } from '../simulation/SimulationEngine.ts';
import { sounds } from '../core/SoundEffects.ts';
import { OverlayMode } from '../core/Constants.ts';
import { BudgetModal } from './BudgetModal.ts';
import { NewsTicker } from './NewsTicker.ts';

export class HUD {
  private engine: SimulationEngine;
  public activeTool: string = 'inspect';

  // Sub-components
  public budgetModal: BudgetModal;
  public newsTicker: NewsTicker;

  // DOM Elements
  private fundsEl: HTMLElement;
  private fundsBadgeEl: HTMLElement;
  private budgetBtn: HTMLButtonElement;
  private popEl: HTMLElement;
  private dateEl: HTMLElement;
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
    this.popEl = document.getElementById('pop-value')!;
    this.dateEl = document.getElementById('date-value')!;
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
    };
    this.engine.onNotification = (msg: string) => {
      this.showToast(msg);
      this.newsTicker.triggerEmergency(msg);
    };
  }

  private setupEventListeners() {
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
