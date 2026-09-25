import { SimulationEngine } from '../simulation/SimulationEngine.ts';
import { sounds } from '../core/SoundEffects.ts';
import { OverlayMode } from '../core/Constants.ts';

export class HUD {
  private engine: SimulationEngine;
  public activeTool: string = 'inspect';

  // DOM Elements
  private fundsEl: HTMLElement;
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

    this.setupEventListeners();
    this.updateStats();

    this.engine.onStatsUpdate = () => this.updateStats();
    this.engine.onNotification = (msg: string) => this.showToast(msg);
  }

  private setupEventListeners() {
    // Toolbar buttons
    this.toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playClick();
        this.toolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.dataset.tool || 'inspect';

        if (this.onToolChange) {
          this.onToolChange(this.activeTool);
        }
      });
    });

    // Speed buttons
    this.speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playClick();
        this.speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseInt(btn.dataset.speed || '1', 10);
        this.engine.setSpeed(speed);
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
