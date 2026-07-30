import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Perk Types for Roguelike system
 */
export enum PerkType {
  DAMAGE_UP = 'damage_up',
  SPEED_UP = 'speed_up',
  HEALTH_UP = 'health_up',
  FIRE_RATE_UP = 'fire_rate_up',
  BULLET_SPEED_UP = 'bullet_speed_up',
  MULTISHOT = 'multishot',
  PIERCING = 'piercing',
}

/**
 * Perk Configuration
 */
export interface PerkConfig {
  type: PerkType;
  name: string;
  description: string;
  value: number;
  icon: string;
}

/**
 * Available Perks
 */
export const PERK_CONFIGS: Record<PerkType, PerkConfig> = {
  [PerkType.DAMAGE_UP]: {
    type: PerkType.DAMAGE_UP,
    name: 'Урон+',
    description: '+20% к урону',
    value: 1.2,
    icon: 'dmg',
  },
  [PerkType.SPEED_UP]: {
    type: PerkType.SPEED_UP,
    name: 'Скорость+',
    description: '+15% к скорости',
    value: 1.15,
    icon: 'spd',
  },
  [PerkType.HEALTH_UP]: {
    type: PerkType.HEALTH_UP,
    name: 'Здоровье+',
    description: '+25% к здоровью',
    value: 1.25,
    icon: 'hp',
  },
  [PerkType.FIRE_RATE_UP]: {
    type: PerkType.FIRE_RATE_UP,
    name: 'Скорострельность+',
    description: '+20% к скорострельности',
    value: 1.2,
    icon: 'firerate',
  },
  [PerkType.BULLET_SPEED_UP]: {
    type: PerkType.BULLET_SPEED_UP,
    name: 'Скорость пули+',
    description: '+30% к скорости пули',
    value: 1.3,
    icon: 'bspeed',
  },
  [PerkType.MULTISHOT]: {
    type: PerkType.MULTISHOT,
    name: 'Двойной выстрел',
    description: 'Стреляет двумя пулями',
    value: 2,
    icon: 'multi',
  },
  [PerkType.PIERCING]: {
    type: PerkType.PIERCING,
    name: 'Бронебойный',
    description: 'Пули пробивают врагов',
    value: 1,
    icon: 'pierce',
  },
};

/**
 * Roguelike Perk System
 * Buffers perks and allows selection strictly in Preparation Phase
 */
export class RoguePerkSystem {
  private perkBuffer: PerkType[] = [];
  private selectedPerks: PerkType[] = [];
  private isSelectionActive: boolean = false;
  private onPerkSelectedCallback: ((perk: PerkType) => void) | null = null;

  constructor() {}

  /**
   * Add perks to buffer (called when enemy dies)
   */
  public bufferPerk(perkType: PerkType): void {
    if (this.perkBuffer.length < 3) {
      this.perkBuffer.push(perkType);
    }
  }

  /**
   * Start perk selection (only in Preparation Phase)
   */
  public startSelection(): void {
    if (this.perkBuffer.length === 0) return;
    this.isSelectionActive = true;
  }

  /**
   * Get buffered perks for display
   */
  public getBufferedPerks(): PerkType[] {
    return [...this.perkBuffer];
  }

  /**
   * Select a perk
   */
  public selectPerk(perkType: PerkType): void {
    if (!this.isSelectionActive) return;
    
    this.selectedPerks.push(perkType);
    
    // Remove from buffer
    const index = this.perkBuffer.indexOf(perkType);
    if (index > -1) {
      this.perkBuffer.splice(index, 1);
    }

    this.isSelectionActive = false;

    if (this.onPerkSelectedCallback) {
      this.onPerkSelectedCallback(perkType);
    }
  }

  /**
   * Check if selection is active
   */
  public isSelectionActiveNow(): boolean {
    return this.isSelectionActive;
  }

  /**
   * Get selected perks
   */
  public getSelectedPerks(): PerkType[] {
    return [...this.selectedPerks];
  }

  /**
   * Clear buffer (end of preparation phase)
   */
  public clearBuffer(): void {
    this.perkBuffer = [];
    this.isSelectionActive = false;
  }

  /**
   * Apply perk effects to player stats
   */
  public applyPerkEffects(stats: { 
    damage: number; 
    speed: number; 
    health: number; 
    fireRate: number; 
    bulletSpeed: number;
    multishot: boolean;
    piercing: boolean;
  }): void {
    for (const perkType of this.selectedPerks) {
      const config = PERK_CONFIGS[perkType];
      switch (perkType) {
        case PerkType.DAMAGE_UP:
          stats.damage *= config.value;
          break;
        case PerkType.SPEED_UP:
          stats.speed *= config.value;
          break;
        case PerkType.HEALTH_UP:
          stats.health *= config.value;
          break;
        case PerkType.FIRE_RATE_UP:
          stats.fireRate *= config.value;
          break;
        case PerkType.BULLET_SPEED_UP:
          stats.bulletSpeed *= config.value;
          break;
        case PerkType.MULTISHOT:
          stats.multishot = true;
          break;
        case PerkType.PIERCING:
          stats.piercing = true;
          break;
      }
    }
  }

  /**
   * Set callback for perk selection
   */
  public setOnPerkSelected(callback: (perk: PerkType) => void): void {
    this.onPerkSelectedCallback = callback;
  }

  public destroy(): void {
    this.perkBuffer = [];
    this.selectedPerks = [];
    this.isSelectionActive = false;
    this.onPerkSelectedCallback = null;
  }
}
