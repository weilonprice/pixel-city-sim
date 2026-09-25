import { SimulationEngine } from '../simulation/SimulationEngine.ts';
import { DisasterType } from '../core/Constants.ts';
import { sounds } from '../core/SoundEffects.ts';

export class DisasterModal {
  private engine: SimulationEngine;
  private container: HTMLElement;
  private isVisible: boolean = false;

  private statusBanner!: HTMLElement;
  private statusText!: HTMLElement;
  private abortBtn!: HTMLElement;
  private rubbleCountText!: HTMLElement;
  private cleanupBtn!: HTMLButtonElement;
  private closeBtn!: HTMLElement;
  private doneBtn!: HTMLElement;

  constructor(engine: SimulationEngine) {
    this.engine = engine;

    this.container = document.createElement('div');
    this.container.id = 'disaster-modal-overlay';
    this.container.className = 'modal-overlay hidden';
    this.container.innerHTML = this.buildHTML();
    document.body.appendChild(this.container);

    this.bindElements();
    this.bindEvents();

    // Hook engine disaster events
    this.engine.onDisasterStarted = () => {
      this.updateState();
    };
    this.engine.onDisasterEnded = () => {
      this.updateState();
    };
  }

  private buildHTML(): string {
    return `
      <div id="disaster-modal" class="budget-modal" style="width: 540px; border: 2px solid #ef4444; box-shadow: 0 0 25px rgba(239, 68, 68, 0.4);">
        <!-- HEADER -->
        <div class="budget-header" style="background: linear-gradient(90deg, #7f1d1d, #991b1b, #7f1d1d); border-bottom: 2px solid #ef4444;">
          <div class="budget-title" style="color: #fef2f2; font-size: 11px; letter-spacing: 0.5px;">
            🚨 EMERGENCY OPERATIONS CENTER — DISASTER CONTROL
          </div>
          <button id="disaster-modal-close" class="modal-close-btn">&times;</button>
        </div>

        <div class="budget-body" style="padding: 16px; max-height: 500px; overflow-y: auto;">
          <!-- ACTIVE STATUS BANNER -->
          <div id="disaster-status-banner" style="background: rgba(15, 23, 42, 0.8); border: 1.5px solid #22c55e; border-radius: 6px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div id="disaster-status-text" style="font-size: 10px; color: #86efac; font-weight: bold;">
              🟢 STATUS: ALL CLEAR — No active emergency alerts in the metropolitan area.
            </div>
            <button id="disaster-abort-btn" class="utility-btn hidden" style="background: #991b1b; color: #fff; font-size: 9px; padding: 4px 8px; border: 1px solid #ef4444;">
              ⏹️ Abort Disaster
            </button>
          </div>

          <!-- DISASTER CARDS -->
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
            <!-- 1. TORNADO -->
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid #475569; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 11px; font-weight: bold; color: #f87171; margin-bottom: 4px;">
                  🌪️ Category F4 Tornado
                </div>
                <div style="font-size: 9px; color: #cbd5e1; line-height: 1.35;">
                  Spawn a violent cyclonic vortex that rips through city blocks, obliterating buildings into rubble, fracturing roads, and igniting electrical fires.
                </div>
              </div>
              <button class="disaster-trigger-btn" data-disaster="TORNADO" style="background: #7f1d1d; color: #fff; border: 1px solid #ef4444; border-radius: 4px; padding: 8px 12px; font-size: 9px; font-weight: bold; cursor: pointer; white-space: nowrap;">
                Unleash Tornado
              </button>
            </div>

            <!-- 2. EARTHQUAKE -->
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid #475569; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 11px; font-weight: bold; color: #fb923c; margin-bottom: 4px;">
                  🌋 Magnitude 7.2 Earthquake
                </div>
                <div style="font-size: 9px; color: #cbd5e1; line-height: 1.35;">
                  Trigger violent subterranean tremors. Fault lines fissure through roadways, collapse bridges into waterways, and cause structural collapses and fires.
                </div>
              </div>
              <button class="disaster-trigger-btn" data-disaster="EARTHQUAKE" style="background: #9a3412; color: #fff; border: 1px solid #f97316; border-radius: 4px; padding: 8px 12px; font-size: 9px; font-weight: bold; cursor: pointer; white-space: nowrap;">
                Trigger Earthquake
              </button>
            </div>

            <!-- 3. METEOR STRIKE -->
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid #475569; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 11px; font-weight: bold; color: #facc15; margin-bottom: 4px;">
                  ☄️ Meteor Strike
                </div>
                <div style="font-size: 9px; color: #cbd5e1; line-height: 1.35;">
                  Summon a cosmic asteroid from outer space. Detonates on impact with ground-shattering blast wave, scorched crater, and widespread fires.
                </div>
              </div>
              <button class="disaster-trigger-btn" data-disaster="METEOR" style="background: #854d0e; color: #fff; border: 1px solid #facc15; border-radius: 4px; padding: 8px 12px; font-size: 9px; font-weight: bold; cursor: pointer; white-space: nowrap;">
                Summon Meteor
              </button>
            </div>
          </div>

          <!-- MUNICIPAL DISASTER RELIEF & CLEANUP -->
          <div style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid #38bdf8; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="flex: 1;">
              <div style="font-size: 10.5px; font-weight: bold; color: #38bdf8; margin-bottom: 3px;">
                🚜 Municipal Emergency Cleanup Crews
              </div>
              <div style="font-size: 8.5px; color: #94a3b8; line-height: 1.3;">
                Dispatch municipal bulldozers to clear all disaster ruins and repair cracked roads citywide ($10 per rubble site).
              </div>
              <div id="rubble-count-text" style="font-size: 9px; color: #fde047; font-weight: bold; margin-top: 4px;">
                Ruins & Rubble Sites: 0
              </div>
            </div>
            <button id="btn-cleanup-rubble" style="background: #0284c7; color: #fff; border: 1px solid #38bdf8; border-radius: 4px; padding: 8px 12px; font-size: 9px; font-weight: bold; cursor: pointer; white-space: nowrap;">
              Clear All Rubble
            </button>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="budget-footer" style="padding: 10px 16px; background: #0f172a; border-top: 1px solid #334155; display: flex; justify-content: flex-end;">
          <button id="disaster-modal-done" class="budget-btn apply-btn" style="padding: 6px 14px; font-size: 9.5px;">Close</button>
        </div>
      </div>
    `;
  }

  private bindElements() {
    this.statusBanner = this.container.querySelector('#disaster-status-banner')!;
    this.statusText = this.container.querySelector('#disaster-status-text')!;
    this.abortBtn = this.container.querySelector('#disaster-abort-btn')!;
    this.rubbleCountText = this.container.querySelector('#rubble-count-text')!;
    this.cleanupBtn = this.container.querySelector('#btn-cleanup-rubble') as HTMLButtonElement;
    this.closeBtn = this.container.querySelector('#disaster-modal-close')!;
    this.doneBtn = this.container.querySelector('#disaster-modal-done')!;
  }

  private bindEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.doneBtn.addEventListener('click', () => this.close());

    // Abort button
    this.abortBtn.addEventListener('click', () => {
      sounds.playClick();
      this.engine.abortAllDisasters();
      this.updateState();
    });

    // Cleanup rubble button
    this.cleanupBtn.addEventListener('click', () => {
      this.engine.cleanupAllRubble();
      this.updateState();
    });

    // Disaster trigger buttons
    const triggerButtons = this.container.querySelectorAll<HTMLButtonElement>('.disaster-trigger-btn');
    triggerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-disaster') as DisasterType;
        if (!type) return;
        sounds.playClick();
        this.engine.triggerDisaster(type);
        this.updateState();
      });
    });

    // Backdrop click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });
  }

  public updateState() {
    const activeTornadoes = this.engine.activeTornadoes.length;
    const activeEarthquakes = this.engine.activeEarthquakes.length;
    const activeMeteors = this.engine.activeMeteors.length;
    const isAnyActive = activeTornadoes > 0 || activeEarthquakes > 0 || activeMeteors > 0;

    if (isAnyActive) {
      this.statusBanner.style.borderColor = '#ef4444';
      this.statusBanner.style.background = 'rgba(127, 29, 29, 0.4)';
      let alertMsg = '🚨 ACTIVE EMERGENCY: ';
      if (activeTornadoes > 0) alertMsg += 'Category F4 Tornado active! ';
      if (activeEarthquakes > 0) alertMsg += 'Magnitude 7.2 Earthquake tremors! ';
      if (activeMeteors > 0) alertMsg += 'Meteor impact event! ';
      this.statusText.textContent = alertMsg;
      this.statusText.style.color = '#fca5a5';
      this.abortBtn.classList.remove('hidden');
    } else {
      this.statusBanner.style.borderColor = '#22c55e';
      this.statusBanner.style.background = 'rgba(15, 23, 42, 0.8)';
      this.statusText.textContent = '🟢 STATUS: ALL CLEAR — No active emergency alerts in the metropolitan area.';
      this.statusText.style.color = '#86efac';
      this.abortBtn.classList.add('hidden');
    }

    // Count rubble sites on grid
    let rubbleCount = 0;
    for (let x = 0; x < this.engine.grid.size; x++) {
      for (let y = 0; y < this.engine.grid.size; y++) {
        const t = this.engine.grid.tiles[x][y];
        if (t.isRubble || t.damaged) {
          rubbleCount++;
        }
      }
    }

    this.rubbleCountText.textContent = `Ruins & Rubble Sites: ${rubbleCount} (Est. Cleanup Cost: $${rubbleCount * 10})`;
    this.cleanupBtn.disabled = rubbleCount === 0;
    this.cleanupBtn.style.opacity = rubbleCount === 0 ? '0.5' : '1.0';
  }

  public open() {
    sounds.playClick();
    this.updateState();
    this.container.classList.remove('hidden');
    this.isVisible = true;
  }

  public close() {
    sounds.playClick();
    this.container.classList.add('hidden');
    this.isVisible = false;
  }

  public toggle() {
    if (this.isVisible) this.close();
    else this.open();
  }

  public getIsOpen(): boolean {
    return this.isVisible;
  }
}
