import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { LayerManager } from '../core/LayerManager';
import { LayerType } from '../core/LayerManager';

/**
 * Game Over Sequence Manager
 * Handles dramatic base destruction and game over modal
 */
export class GameOverSequence {
  private isPlaying: boolean = false;
  private hitStopTimer: number = 0;
  private shakeTimer: number = 0;
  private freezeTimer: number = 0;
  private phase: 'idle' | 'hitStop' | 'shake' | 'explode' | 'freeze' | 'showModal' = 'idle';
  private layerManager: LayerManager | null = null;
  private baseSprite: PIXI.Sprite | null = null;
  private particles: PIXI.Sprite[] = [];
  private modalContainer: PIXI.Container | null = null;

  constructor() {}

  public setLayerManager(layerManager: LayerManager): void {
    this.layerManager = layerManager;
  }

  /**
   * Start game over sequence
   */
  public start(baseSprite: PIXI.Sprite): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.baseSprite = baseSprite;
    this.phase = 'hitStop';
    this.hitStopTimer = 0.5; // 0.5s Hit Stop
  }

  /**
   * Update sequence (called in fixedUpdate)
   */
  public fixedUpdate(delta: number): void {
    if (!this.isPlaying) return;

    switch (this.phase) {
      case 'hitStop':
        this.updateHitStop(delta);
        break;
      case 'shake':
        this.updateShake(delta);
        break;
      case 'explode':
        this.explodeBase();
        this.phase = 'freeze';
        break;
      case 'freeze':
        this.updateFreeze(delta);
        break;
      case 'showModal':
        // Modal is shown, no update needed
        break;
    }
  }

  /**
   * Hit Stop phase (30-50ms freeze)
   */
  private updateHitStop(delta: number): void {
    this.hitStopTimer -= delta;
    if (this.hitStopTimer <= 0) {
      this.phase = 'shake';
      this.shakeTimer = 1.0; // 1 second shake
    }
  }

  /**
   * Shake phase
   */
  private updateShake(delta: number): void {
    this.shakeTimer -= delta;
    if (this.shakeTimer <= 0) {
      this.phase = 'explode';
      this.explodeBase();
    }
  }

  /**
   * Explode base into particles
   */
  private explodeBase(): void {
    if (!this.baseSprite || !this.layerManager) return;

    const baseX = this.baseSprite.x;
    const baseY = this.baseSprite.y;

    // Create explosion particles
    for (let i = 0; i < 20; i++) {
      const particle = new PIXI.Sprite(this.baseSprite.texture);
      particle.x = baseX;
      particle.y = baseY;
      particle.scale.set(0.3);
      particle.alpha = 1;
      this.particles.push(particle);
      this.layerManager.getLayer(LayerType.Particle).addChild(particle);
    }

    // Hide original base
    this.baseSprite.visible = false;

    this.phase = 'freeze';
    this.freezeTimer = 0.5; // 0.5s freeze
  }

  /**
   * Freeze world phase
   */
  private updateFreeze(delta: number): void {
    this.freezeTimer -= delta;
    if (this.freezeTimer <= 0) {
      this.phase = 'showModal';
      this.showModal();
    }
  }

  /**
   * Show Game Over Modal
   */
  private showModal(): void {
    if (!this.layerManager) return;

    this.modalContainer = new PIXI.Container();
    
    // Background overlay
    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.7);
    overlay.drawRect(0, 0, GAME_CONFIG.screen.width, GAME_CONFIG.screen.height);
    overlay.endFill();
    this.modalContainer.addChild(overlay);

    // Game Over text would be added here
    // Using BitmapText from existing UI system

    this.layerManager.getLayer(LayerType.UI).addChild(this.modalContainer);
  }

  /**
   * Update particles
   */
  public updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += (Math.random() - 0.5) * 100 * delta;
      p.y += (Math.random() - 0.5) * 100 * delta;
      p.alpha -= delta * 0.5;
      p.rotation += delta * 2;

      if (p.alpha <= 0) {
        this.layerManager?.getLayer(LayerType.Particle).removeChild(p);
        p.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Check if sequence is playing
   */
  public isSequencePlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if world is frozen
   */
  public isWorldFrozen(): boolean {
    return this.phase === 'freeze' || this.phase === 'showModal';
  }

  public destroy(): void {
    this.isPlaying = false;
    this.phase = 'idle';
    
    // Clean up particles
    for (const p of this.particles) {
      p.destroy();
    }
    this.particles = [];

    // Clean up modal
    if (this.modalContainer) {
      this.modalContainer.destroy({ children: true });
      this.modalContainer = null;
    }

    this.baseSprite = null;
    this.layerManager = null;
  }
}
