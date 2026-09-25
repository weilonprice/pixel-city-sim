import { SimulationEngine } from '../simulation/SimulationEngine.ts';
import { sounds } from '../core/SoundEffects.ts';

export class SnapshotTool {
  private canvas: HTMLCanvasElement;
  private engine: SimulationEngine;
  private onToast?: (msg: string) => void;

  constructor(canvas: HTMLCanvasElement, engine: SimulationEngine, onToast?: (msg: string) => void) {
    this.canvas = canvas;
    this.engine = engine;
    this.onToast = onToast;
  }

  public takeSnapshot() {
    sounds.playCameraShutter();

    // Trigger visual camera flash
    this.triggerFlashEffect();

    try {
      // Export canvas to high-res PNG
      const dataUrl = this.canvas.toDataURL('image/png');
      const filename = `PixelCity_${this.engine.year}_M${this.engine.month + 1}_Pop${this.engine.population}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (this.onToast) {
        this.onToast(`📸 Snapshot saved: ${filename}`);
      }
    } catch (e) {
      console.error('Failed to export snapshot:', e);
      if (this.onToast) {
        this.onToast('⚠️ Could not export snapshot from canvas.');
      }
    }
  }

  private triggerFlashEffect() {
    const flashEl = document.createElement('div');
    flashEl.style.position = 'fixed';
    flashEl.style.top = '0';
    flashEl.style.left = '0';
    flashEl.style.width = '100vw';
    flashEl.style.height = '100vh';
    flashEl.style.backgroundColor = '#ffffff';
    flashEl.style.opacity = '0.7';
    flashEl.style.zIndex = '9999';
    flashEl.style.pointerEvents = 'none';
    flashEl.style.transition = 'opacity 0.35s ease-out';

    document.body.appendChild(flashEl);

    // Fade out immediately
    requestAnimationFrame(() => {
      flashEl.style.opacity = '0';
      setTimeout(() => {
        if (flashEl.parentNode) {
          flashEl.parentNode.removeChild(flashEl);
        }
      }, 400);
    });
  }
}
