import { SimulationEngine, FinancialLedger } from '../simulation/SimulationEngine.ts';
import { sounds } from '../core/SoundEffects.ts';

export class BudgetModal {
  private engine: SimulationEngine;
  private container: HTMLElement;
  private isVisible: boolean = false;
  private activeTab: 'taxes' | 'ordinances' = 'taxes';

  // DOM Elements - Tabs
  private tabBtnTaxes!: HTMLButtonElement;
  private tabBtnOrdinances!: HTMLButtonElement;
  private tabContentTaxes!: HTMLElement;
  private tabContentOrdinances!: HTMLElement;

  // DOM Elements - Tax Sliders
  private resTaxSlider!: HTMLInputElement;
  private resTaxVal!: HTMLElement;
  private resRevVal!: HTMLElement;

  private comTaxSlider!: HTMLInputElement;
  private comTaxVal!: HTMLElement;
  private comRevVal!: HTMLElement;

  private indTaxSlider!: HTMLInputElement;
  private indTaxVal!: HTMLElement;
  private indRevVal!: HTMLElement;

  private totalRevVal!: HTMLElement;

  // Department Sliders
  private roadFundSlider!: HTMLInputElement;
  private roadFundVal!: HTMLElement;
  private roadCostVal!: HTMLElement;

  private fireFundSlider!: HTMLInputElement;
  private fireFundVal!: HTMLElement;
  private fireCostVal!: HTMLElement;
  private fireRadiusVal!: HTMLElement;

  private policeFundSlider!: HTMLInputElement;
  private policeFundVal!: HTMLElement;
  private policeCostVal!: HTMLElement;
  private policeRadiusVal!: HTMLElement;

  private healthFundSlider!: HTMLInputElement;
  private healthFundVal!: HTMLElement;
  private healthCostVal!: HTMLElement;
  private healthRadiusVal!: HTMLElement;

  private eduFundSlider!: HTMLInputElement;
  private eduFundVal!: HTMLElement;
  private eduCostVal!: HTMLElement;
  private eduRadiusVal!: HTMLElement;

  private utilCostVal!: HTMLElement;
  private ordCostVal!: HTMLElement;
  private totalExpVal!: HTMLElement;

  // Ordinances Toggle Elements
  private ordToggleSmoke!: HTMLButtonElement;
  private ordToggleTransit!: HTMLButtonElement;
  private ordToggleClean!: HTMLButtonElement;
  private ordToggleWatch!: HTMLButtonElement;
  private ordToggleReading!: HTMLButtonElement;

  // Bottom Summary
  private treasuryVal!: HTMLElement;
  private netFlowVal!: HTMLElement;

  public onApply?: () => void;

  constructor(engine: SimulationEngine) {
    this.engine = engine;
    this.container = document.createElement('div');
    this.container.id = 'budget-modal-overlay';
    this.container.className = 'budget-overlay hidden';

    this.render();
    document.body.appendChild(this.container);
    this.bindEvents();
  }

  private render() {
    this.container.innerHTML = `
      <div class="budget-modal">
        <div class="budget-header">
          <div class="budget-title">
            <span class="budget-icon">🏛️</span>
            <span>CITY TREASURY & MUNICIPAL BUDGET</span>
          </div>

          <div class="budget-tabs">
            <button class="budget-tab-btn active" id="tab-btn-taxes">📊 Taxes & Budgets</button>
            <button class="budget-tab-btn" id="tab-btn-ordinances">📜 City Ordinances</button>
          </div>

          <button class="budget-close-btn" id="budget-btn-close" title="Close [ESC]">&times;</button>
        </div>

        <div class="budget-body">
          <!-- TAB 1: TAXES & DEPARTMENTS -->
          <div class="tab-pane active" id="tab-content-taxes">
            <div class="budget-grid-columns">
              <!-- LEFT COLUMN: TAX REVENUES -->
              <div class="budget-column">
                <div class="budget-section-title">
                  <span>📈 TAXATION RATES & REVENUES</span>
                </div>

                <div class="budget-row">
                  <div class="budget-row-info">
                    <span class="budget-label"><span class="badge badge-r">R</span> Residential Tax</span>
                    <span class="budget-stat" id="tax-r-rev">+$0/mo</span>
                  </div>
                  <div class="budget-slider-container">
                    <input type="range" min="0" max="20" step="1" id="slider-tax-r" class="budget-slider">
                    <span class="budget-slider-val" id="val-tax-r">9%</span>
                  </div>
                </div>

                <div class="budget-row">
                  <div class="budget-row-info">
                    <span class="budget-label"><span class="badge badge-c">C</span> Commercial Tax</span>
                    <span class="budget-stat" id="tax-c-rev">+$0/mo</span>
                  </div>
                  <div class="budget-slider-container">
                    <input type="range" min="0" max="20" step="1" id="slider-tax-c" class="budget-slider">
                    <span class="budget-slider-val" id="val-tax-c">9%</span>
                  </div>
                </div>

                <div class="budget-row">
                  <div class="budget-row-info">
                    <span class="budget-label"><span class="badge badge-i">I</span> Industrial Tax</span>
                    <span class="budget-stat" id="tax-i-rev">+$0/mo</span>
                  </div>
                  <div class="budget-slider-container">
                    <input type="range" min="0" max="20" step="1" id="slider-tax-i" class="budget-slider">
                    <span class="budget-slider-val" id="val-tax-i">9%</span>
                  </div>
                </div>

                <div class="budget-hint">
                  💡 9% is neutral. Lower tax rates spur citizen & business migration; higher tax rates raise funds but discourage growth.
                </div>

                <div class="budget-subtotal revenue-subtotal">
                  <span>TOTAL ESTIMATED REVENUE</span>
                  <span id="budget-total-rev" class="highlight-green">+$0/mo</span>
                </div>
              </div>

              <!-- RIGHT COLUMN: DEPARTMENTAL EXPENDITURES -->
              <div class="budget-column">
                <div class="budget-section-title">
                  <span>📉 DEPARTMENTAL FUNDING & EXPENSES</span>
                </div>

                <div class="budget-row">
                  <div class="budget-row-info">
                    <span class="budget-label">🛣️ Roads & Bridges</span>
                    <span class="budget-stat" id="fund-road-cost">-$0/mo</span>
                  </div>
                  <div class="budget-slider-container">
                    <input type="range" min="50" max="150" step="5" id="slider-fund-road" class="budget-slider">
                    <span class="budget-slider-val" id="val-fund-road">100%</span>
                  </div>
                </div>

                <div class="budget-row">
                  <div class="budget-row-info">
                    <span class="budget-label">🚒 Fire Department <small id="lbl-fire-radius">(Radius: 14)</small></span>
                    <span class="budget-stat" id="fund-fire-cost">-$0/mo</span>
                  </div>
                  <div class="budget-slider-container">
                    <input type="range" min="50" max="150" step="5" id="slider-fund-fire" class="budget-slider">
                    <span class="budget-slider-val" id="val-fund-fire">100%</span>
                  </div>
                </div>

                <div class="budget-row">
                  <div class="budget-row-info">
                    <span class="budget-label">🚓 Police Precincts <small id="lbl-police-radius">(Radius: 14)</small></span>
                    <span class="budget-stat" id="fund-police-cost">-$0/mo</span>
                  </div>
                  <div class="budget-slider-container">
                    <input type="range" min="50" max="150" step="5" id="slider-fund-police" class="budget-slider">
                    <span class="budget-slider-val" id="val-fund-police">100%</span>
                  </div>
                </div>

                <div class="budget-row">
                  <div class="budget-row-info">
                    <span class="budget-label">🏥 Health & Clinics <small id="lbl-health-radius">(Radius: 16)</small></span>
                    <span class="budget-stat" id="fund-health-cost">-$0/mo</span>
                  </div>
                  <div class="budget-slider-container">
                    <input type="range" min="50" max="150" step="5" id="slider-fund-health" class="budget-slider">
                    <span class="budget-slider-val" id="val-fund-health">100%</span>
                  </div>
                </div>

                <div class="budget-row">
                  <div class="budget-row-info">
                    <span class="budget-label">🏫 Education & Schools <small id="lbl-edu-radius">(Radius: 14)</small></span>
                    <span class="budget-stat" id="fund-edu-cost">-$0/mo</span>
                  </div>
                  <div class="budget-slider-container">
                    <input type="range" min="50" max="150" step="5" id="slider-fund-edu" class="budget-slider">
                    <span class="budget-slider-val" id="val-fund-edu">100%</span>
                  </div>
                </div>

                <div class="budget-row" style="opacity: 0.85;">
                  <div class="budget-row-info">
                    <span class="budget-label">⚡ Power, Water & Parks</span>
                    <span class="budget-stat" id="fund-util-cost">-$0/mo</span>
                  </div>
                  <div class="budget-fixed-tag">100% FIXED UPKEEP</div>
                </div>

                <div class="budget-row" style="opacity: 0.85;">
                  <div class="budget-row-info">
                    <span class="budget-label">📜 Active City Ordinances</span>
                    <span class="budget-stat" id="fund-ord-cost">-$0/mo</span>
                  </div>
                </div>

                <div class="budget-subtotal expense-subtotal">
                  <span>TOTAL ESTIMATED EXPENSES</span>
                  <span id="budget-total-exp" class="highlight-red">-$0/mo</span>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: MUNICIPAL ORDINANCES -->
          <div class="tab-pane hidden" id="tab-content-ordinances">
            <div class="ordinances-list">
              <div class="ordinance-card">
                <div class="ord-info">
                  <div class="ord-title">
                    <span>🧯 Smoke Detector Mandate</span>
                    <span class="ord-cost">-$20/mo</span>
                  </div>
                  <div class="ord-desc">Requires mandatory smoke alarms in all buildings. Reduces building fire outbreak risk by 60%.</div>
                </div>
                <button class="ord-toggle-btn" id="ord-toggle-smoke">OFF</button>
              </div>

              <div class="ordinance-card">
                <div class="ord-info">
                  <div class="ord-title">
                    <span>🚌 Free Public Transit Promotion</span>
                    <span class="ord-cost">-$60/mo</span>
                  </div>
                  <div class="ord-desc">Subsidizes municipal transit. Boosts Commercial (+15) and Residential (+10) demand, and cuts road maintenance wear by 15%.</div>
                </div>
                <button class="ord-toggle-btn" id="ord-toggle-transit">OFF</button>
              </div>

              <div class="ordinance-card">
                <div class="ord-info">
                  <div class="ord-title">
                    <span>🌱 Clean Air & Smog Scrubbers</span>
                    <span class="ord-cost">-$40/mo</span>
                  </div>
                  <div class="ord-desc">Mandates industrial filters and scrubbers on coal power plants, reducing emission pollution spread by 40%.</div>
                </div>
                <button class="ord-toggle-btn" id="ord-toggle-clean">OFF</button>
              </div>

              <div class="ordinance-card">
                <div class="ord-info">
                  <div class="ord-title">
                    <span>🚨 Neighborhood Watch Patrols</span>
                    <span class="ord-cost">-$30/mo</span>
                  </div>
                  <div class="ord-desc">Empowers neighborhood citizen patrols, reducing petty crime rates in residential zones by 35%.</div>
                </div>
                <button class="ord-toggle-btn" id="ord-toggle-watch">OFF</button>
              </div>

              <div class="ordinance-card">
                <div class="ord-info">
                  <div class="ord-title">
                    <span>📚 Pro-Reading Literacy Campaign</span>
                    <span class="ord-cost">-$25/mo</span>
                  </div>
                  <div class="ord-desc">Funds library books and school literacy competitions, boosting school education coverage radius by 25%.</div>
                </div>
                <button class="ord-toggle-btn" id="ord-toggle-reading">OFF</button>
              </div>
            </div>
          </div>
        </div>

        <!-- FOOTER: CASH FLOW & CONTROLS -->
        <div class="budget-footer">
          <div class="budget-footer-stats">
            <div class="budget-summary-box">
              <span class="summary-label">CURRENT TREASURY</span>
              <span class="summary-val" id="budget-treasury">$0</span>
            </div>
            <div class="budget-summary-box">
              <span class="summary-label">NET MONTHLY CASH FLOW</span>
              <span class="summary-val" id="budget-net-flow">+$0/mo</span>
            </div>
          </div>

          <div class="budget-actions">
            <button class="budget-btn secondary" id="budget-btn-reset">Reset Defaults</button>
            <button class="budget-btn primary" id="budget-btn-apply">Done</button>
          </div>
        </div>
      </div>
    `;

    // Query tab elements
    this.tabBtnTaxes = this.container.querySelector('#tab-btn-taxes')!;
    this.tabBtnOrdinances = this.container.querySelector('#tab-btn-ordinances')!;
    this.tabContentTaxes = this.container.querySelector('#tab-content-taxes')!;
    this.tabContentOrdinances = this.container.querySelector('#tab-content-ordinances')!;

    // Query sliders
    this.resTaxSlider = this.container.querySelector('#slider-tax-r')!;
    this.resTaxVal = this.container.querySelector('#val-tax-r')!;
    this.resRevVal = this.container.querySelector('#tax-r-rev')!;

    this.comTaxSlider = this.container.querySelector('#slider-tax-c')!;
    this.comTaxVal = this.container.querySelector('#val-tax-c')!;
    this.comRevVal = this.container.querySelector('#tax-c-rev')!;

    this.indTaxSlider = this.container.querySelector('#slider-tax-i')!;
    this.indTaxVal = this.container.querySelector('#val-tax-i')!;
    this.indRevVal = this.container.querySelector('#tax-i-rev')!;

    this.totalRevVal = this.container.querySelector('#budget-total-rev')!;

    this.roadFundSlider = this.container.querySelector('#slider-fund-road')!;
    this.roadFundVal = this.container.querySelector('#val-fund-road')!;
    this.roadCostVal = this.container.querySelector('#fund-road-cost')!;

    this.fireFundSlider = this.container.querySelector('#slider-fund-fire')!;
    this.fireFundVal = this.container.querySelector('#val-fund-fire')!;
    this.fireCostVal = this.container.querySelector('#fund-fire-cost')!;
    this.fireRadiusVal = this.container.querySelector('#lbl-fire-radius')!;

    this.policeFundSlider = this.container.querySelector('#slider-fund-police')!;
    this.policeFundVal = this.container.querySelector('#val-fund-police')!;
    this.policeCostVal = this.container.querySelector('#fund-police-cost')!;
    this.policeRadiusVal = this.container.querySelector('#lbl-police-radius')!;

    this.healthFundSlider = this.container.querySelector('#slider-fund-health')!;
    this.healthFundVal = this.container.querySelector('#val-fund-health')!;
    this.healthCostVal = this.container.querySelector('#fund-health-cost')!;
    this.healthRadiusVal = this.container.querySelector('#lbl-health-radius')!;

    this.eduFundSlider = this.container.querySelector('#slider-fund-edu')!;
    this.eduFundVal = this.container.querySelector('#val-fund-edu')!;
    this.eduCostVal = this.container.querySelector('#fund-edu-cost')!;
    this.eduRadiusVal = this.container.querySelector('#lbl-edu-radius')!;

    this.utilCostVal = this.container.querySelector('#fund-util-cost')!;
    this.ordCostVal = this.container.querySelector('#fund-ord-cost')!;
    this.totalExpVal = this.container.querySelector('#budget-total-exp')!;

    // Query Ordinance Toggles
    this.ordToggleSmoke = this.container.querySelector('#ord-toggle-smoke')!;
    this.ordToggleTransit = this.container.querySelector('#ord-toggle-transit')!;
    this.ordToggleClean = this.container.querySelector('#ord-toggle-clean')!;
    this.ordToggleWatch = this.container.querySelector('#ord-toggle-watch')!;
    this.ordToggleReading = this.container.querySelector('#ord-toggle-reading')!;

    this.treasuryVal = this.container.querySelector('#budget-treasury')!;
    this.netFlowVal = this.container.querySelector('#budget-net-flow')!;
  }

  private bindEvents() {
    // Tab switching
    this.tabBtnTaxes.addEventListener('click', () => {
      sounds.playClick();
      this.switchTab('taxes');
    });

    this.tabBtnOrdinances.addEventListener('click', () => {
      sounds.playClick();
      this.switchTab('ordinances');
    });

    // Close button
    this.container.querySelector('#budget-btn-close')?.addEventListener('click', () => {
      sounds.playClick();
      this.close();
    });

    // Apply button
    this.container.querySelector('#budget-btn-apply')?.addEventListener('click', () => {
      sounds.playClick();
      this.close();
    });

    // Reset button
    this.container.querySelector('#budget-btn-reset')?.addEventListener('click', () => {
      sounds.playClick();
      this.resetDefaults();
    });

    // Close on clicking backdrop
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        sounds.playClick();
        this.close();
      }
    });

    // Sliders input events
    const onTaxChange = () => {
      this.engine.taxRateR = parseInt(this.resTaxSlider.value, 10);
      this.engine.taxRateC = parseInt(this.comTaxSlider.value, 10);
      this.engine.taxRateI = parseInt(this.indTaxSlider.value, 10);
      this.updateDisplay();
    };

    const onFundChange = () => {
      this.engine.fundingRoads = parseInt(this.roadFundSlider.value, 10);
      this.engine.fundingFire = parseInt(this.fireFundSlider.value, 10);
      this.engine.fundingPolice = parseInt(this.policeFundSlider.value, 10);
      this.engine.fundingHealth = parseInt(this.healthFundSlider.value, 10);
      this.engine.fundingEducation = parseInt(this.eduFundSlider.value, 10);

      this.engine.grid.recalculateServiceCoverages(
        this.engine.fundingFire,
        this.engine.fundingPolice,
        this.engine.fundingHealth,
        this.engine.fundingEducation,
        this.engine.ordinances
      );

      this.updateDisplay();
    };

    this.resTaxSlider.addEventListener('input', onTaxChange);
    this.comTaxSlider.addEventListener('input', onTaxChange);
    this.indTaxSlider.addEventListener('input', onTaxChange);

    this.roadFundSlider.addEventListener('input', onFundChange);
    this.fireFundSlider.addEventListener('input', onFundChange);
    this.policeFundSlider.addEventListener('input', onFundChange);
    this.healthFundSlider.addEventListener('input', onFundChange);
    this.eduFundSlider.addEventListener('input', onFundChange);

    // Ordinance toggle click listeners
    const setupOrdToggle = (btn: HTMLButtonElement, key: keyof typeof this.engine.ordinances) => {
      btn.addEventListener('click', () => {
        sounds.playClick();
        this.engine.ordinances[key] = !this.engine.ordinances[key];
        this.engine.grid.recalculateServiceCoverages(
          this.engine.fundingFire,
          this.engine.fundingPolice,
          this.engine.fundingHealth,
          this.engine.fundingEducation,
          this.engine.ordinances
        );
        this.updateDisplay();
      });
    };

    setupOrdToggle(this.ordToggleSmoke, 'smokeDetectors');
    setupOrdToggle(this.ordToggleTransit, 'freeTransit');
    setupOrdToggle(this.ordToggleClean, 'cleanEnergy');
    setupOrdToggle(this.ordToggleWatch, 'neighborhoodWatch');
    setupOrdToggle(this.ordToggleReading, 'readingCampaign');
  }

  public switchTab(tab: 'taxes' | 'ordinances') {
    this.activeTab = tab;
    if (tab === 'taxes') {
      this.tabBtnTaxes.classList.add('active');
      this.tabBtnOrdinances.classList.remove('active');
      this.tabContentTaxes.classList.remove('hidden');
      this.tabContentOrdinances.classList.add('hidden');
    } else {
      this.tabBtnTaxes.classList.remove('active');
      this.tabBtnOrdinances.classList.add('active');
      this.tabContentTaxes.classList.add('hidden');
      this.tabContentOrdinances.classList.remove('hidden');
    }
  }

  public getActiveTab(): 'taxes' | 'ordinances' {
    return this.activeTab;
  }

  public open() {
    this.isVisible = true;
    this.container.classList.remove('hidden');

    // Sync sliders to current engine values
    this.resTaxSlider.value = this.engine.taxRateR.toString();
    this.comTaxSlider.value = this.engine.taxRateC.toString();
    this.indTaxSlider.value = this.engine.taxRateI.toString();

    this.roadFundSlider.value = this.engine.fundingRoads.toString();
    this.fireFundSlider.value = this.engine.fundingFire.toString();
    this.policeFundSlider.value = this.engine.fundingPolice.toString();
    this.healthFundSlider.value = this.engine.fundingHealth.toString();
    this.eduFundSlider.value = this.engine.fundingEducation.toString();

    this.updateDisplay();
  }

  public close() {
    this.isVisible = false;
    this.container.classList.add('hidden');
    if (this.onApply) {
      this.onApply();
    }
  }

  public toggle() {
    if (this.isVisible) this.close();
    else this.open();
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public resetDefaults() {
    this.engine.taxRateR = 9;
    this.engine.taxRateC = 9;
    this.engine.taxRateI = 9;
    this.engine.fundingRoads = 100;
    this.engine.fundingFire = 100;
    this.engine.fundingPolice = 100;
    this.engine.fundingHealth = 100;
    this.engine.fundingEducation = 100;

    this.engine.ordinances.smokeDetectors = false;
    this.engine.ordinances.freeTransit = false;
    this.engine.ordinances.cleanEnergy = false;
    this.engine.ordinances.neighborhoodWatch = false;
    this.engine.ordinances.readingCampaign = false;

    this.resTaxSlider.value = '9';
    this.comTaxSlider.value = '9';
    this.indTaxSlider.value = '9';
    this.roadFundSlider.value = '100';
    this.fireFundSlider.value = '100';
    this.policeFundSlider.value = '100';
    this.healthFundSlider.value = '100';
    this.eduFundSlider.value = '100';

    this.engine.grid.recalculateServiceCoverages(100, 100, 100, 100, this.engine.ordinances);
    this.updateDisplay();
  }

  public updateDisplay() {
    // Read current slider text
    this.resTaxVal.textContent = `${this.resTaxSlider.value}%`;
    this.comTaxVal.textContent = `${this.comTaxSlider.value}%`;
    this.indTaxVal.textContent = `${this.indTaxSlider.value}%`;

    this.roadFundVal.textContent = `${this.roadFundSlider.value}%`;
    this.fireFundVal.textContent = `${this.fireFundSlider.value}%`;
    this.policeFundVal.textContent = `${this.policeFundSlider.value}%`;
    this.healthFundVal.textContent = `${this.healthFundSlider.value}%`;
    this.eduFundVal.textContent = `${this.eduFundSlider.value}%`;

    // Dynamic radius indicators
    const fireR = Math.max(4, Math.round(14 * (parseInt(this.fireFundSlider.value, 10) / 100)));
    const polR = Math.max(4, Math.round(14 * (parseInt(this.policeFundSlider.value, 10) / 100)));
    const hlthR = Math.max(5, Math.round(16 * (parseInt(this.healthFundSlider.value, 10) / 100)));
    let eduR = Math.max(4, Math.round(14 * (parseInt(this.eduFundSlider.value, 10) / 100)));
    if (this.engine.ordinances.readingCampaign) {
      eduR = Math.round(eduR * 1.25);
    }

    this.fireRadiusVal.textContent = `(Radius: ${fireR})`;
    this.policeRadiusVal.textContent = `(Radius: ${polR})`;
    this.healthRadiusVal.textContent = `(Radius: ${hlthR})`;
    this.eduRadiusVal.textContent = `(Radius: ${eduR})`;

    const ledger: FinancialLedger = this.engine.getFinancialLedger();

    this.resRevVal.textContent = `+$${ledger.taxRevenueR.toLocaleString()}/mo`;
    this.comRevVal.textContent = `+$${ledger.taxRevenueC.toLocaleString()}/mo`;
    this.indRevVal.textContent = `+$${ledger.taxRevenueI.toLocaleString()}/mo`;
    this.totalRevVal.textContent = `+$${ledger.totalRevenue.toLocaleString()}/mo`;

    this.roadCostVal.textContent = `-$${ledger.expenseRoads.toLocaleString()}/mo`;
    this.fireCostVal.textContent = `-$${ledger.expenseFire.toLocaleString()}/mo`;
    this.policeCostVal.textContent = `-$${ledger.expensePolice.toLocaleString()}/mo`;
    this.healthCostVal.textContent = `-$${ledger.expenseHealth.toLocaleString()}/mo`;
    this.eduCostVal.textContent = `-$${ledger.expenseEducation.toLocaleString()}/mo`;
    this.utilCostVal.textContent = `-$${ledger.expenseUtilities.toLocaleString()}/mo`;
    this.ordCostVal.textContent = `-$${ledger.expenseOrdinances.toLocaleString()}/mo`;
    this.totalExpVal.textContent = `-$${ledger.totalExpenses.toLocaleString()}/mo`;

    // Update Ordinance Buttons State
    const updateOrdBtn = (btn: HTMLButtonElement, active: boolean) => {
      if (active) {
        btn.textContent = 'ON';
        btn.className = 'ord-toggle-btn active';
      } else {
        btn.textContent = 'OFF';
        btn.className = 'ord-toggle-btn';
      }
    };

    updateOrdBtn(this.ordToggleSmoke, this.engine.ordinances.smokeDetectors);
    updateOrdBtn(this.ordToggleTransit, this.engine.ordinances.freeTransit);
    updateOrdBtn(this.ordToggleClean, this.engine.ordinances.cleanEnergy);
    updateOrdBtn(this.ordToggleWatch, this.engine.ordinances.neighborhoodWatch);
    updateOrdBtn(this.ordToggleReading, this.engine.ordinances.readingCampaign);

    this.treasuryVal.textContent = `$${this.engine.funds.toLocaleString()}`;
    if (this.engine.funds < 0) {
      this.treasuryVal.className = 'summary-val highlight-red';
    } else {
      this.treasuryVal.className = 'summary-val highlight-green';
    }

    const sign = ledger.netMonthly >= 0 ? '+' : '';
    this.netFlowVal.textContent = `${sign}$${ledger.netMonthly.toLocaleString()}/mo`;
    if (ledger.netMonthly >= 0) {
      this.netFlowVal.className = 'summary-val highlight-green';
    } else {
      this.netFlowVal.className = 'summary-val highlight-red';
    }
  }
}
