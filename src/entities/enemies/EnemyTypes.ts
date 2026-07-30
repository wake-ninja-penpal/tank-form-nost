// Enemy Types and Wave System

/**
 * Enemy Types
 */
export enum EnemyType {
  BUGGY = 'buggy',
  TANK = 'tank',
  HEAVY = 'heavy',
  ARTILLERY = 'artillery',
  BOSS = 'boss',
}

/**
 * Enemy Configuration
 */
export interface EnemyConfig {
  type: EnemyType;
  speed: number;
  health: number;
  damage: number;
  score: number;
  fireRate: number;
  bulletSpeed: number;
}

/**
 * Enemy Configurations by Type
 */
export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  [EnemyType.BUGGY]: {
    type: EnemyType.BUGGY,
    speed: 180,
    health: 1,
    damage: 10,
    score: 100,
    fireRate: 2.0,
    bulletSpeed: 200,
  },
  [EnemyType.TANK]: {
    type: EnemyType.TANK,
    speed: 100,
    health: 3,
    damage: 20,
    score: 200,
    fireRate: 1.5,
    bulletSpeed: 250,
  },
  [EnemyType.HEAVY]: {
    type: EnemyType.HEAVY,
    speed: 60,
    health: 6,
    damage: 40,
    score: 400,
    fireRate: 1.0,
    bulletSpeed: 180,
  },
  [EnemyType.ARTILLERY]: {
    type: EnemyType.ARTILLERY,
    speed: 50,
    health: 2,
    damage: 30,
    score: 350,
    fireRate: 3.0,
    bulletSpeed: 300,
  },
  [EnemyType.BOSS]: {
    type: EnemyType.BOSS,
    speed: 40,
    health: 20,
    damage: 50,
    score: 2000,
    fireRate: 0.5,
    bulletSpeed: 220,
  },
};

/**
 * Wave Configuration
 */
export interface WaveConfig {
  waveNumber: number;
  enemies: { type: EnemyType; count: number }[];
  preparationTime: number; // seconds
  spawnInterval: number; // ms
}

/**
 * Wave System Manager
 * Handles enemy spawning, wave progression, and difficulty scaling
 */
export class WaveSystem {
  private currentWave: number = 0;
  private isPreparationPhase: boolean = true;
  private preparationTimer: number = 0;
  private spawnTimer: number = 0;
  private activeEnemies: number = 0;
  private waveConfigs: WaveConfig[] = [];
  private onWaveStartCallback: ((wave: number) => void) | null = null;
  private onPreparationEndCallback: (() => void) | null = null;

  constructor() {
    this.generateWaveConfigs();
  }

  /**
   * Generate wave configurations with scaling difficulty
   */
  private generateWaveConfigs(): void {
    for (let i = 1; i <= 20; i++) {
      const config = this.createWaveConfig(i);
      this.waveConfigs.push(config);
    }
  }

  /**
   * Create wave configuration based on wave number
   */
  private createWaveConfig(waveNumber: number): WaveConfig {
    const enemies: { type: EnemyType; count: number }[] = [];
    
    // Base enemies: Buggy
    let buggyCount = 2 + Math.floor(waveNumber * 1.5);
    if (buggyCount > 0) {
      enemies.push({ type: EnemyType.BUGGY, count: buggyCount });
    }

    // Add Tanks from wave 2
    if (waveNumber >= 2) {
      const tankCount = Math.floor(waveNumber / 2);
      if (tankCount > 0) {
        enemies.push({ type: EnemyType.TANK, count: tankCount });
      }
    }

    // Add Heavy from wave 4
    if (waveNumber >= 4) {
      const heavyCount = Math.floor(waveNumber / 4);
      if (heavyCount > 0) {
        enemies.push({ type: EnemyType.HEAVY, count: heavyCount });
      }
    }

    // Add Artillery from wave 6
    if (waveNumber >= 6) {
      const artilleryCount = Math.floor(waveNumber / 6);
      if (artilleryCount > 0) {
        enemies.push({ type: EnemyType.ARTILLERY, count: artilleryCount });
      }
    }

    // Boss every 5 waves
    if (waveNumber % 5 === 0) {
      enemies.push({ type: EnemyType.BOSS, count: 1 });
    }

    // Preparation time decreases with wave number (min 2s)
    const preparationTime = Math.max(2, 5 - Math.floor(waveNumber / 5));
    
    // Spawn interval decreases with wave number (min 500ms)
    const spawnInterval = Math.max(500, 1500 - waveNumber * 50);

    return {
      waveNumber,
      enemies,
      preparationTime,
      spawnInterval,
    };
  }

  /**
   * Start a new wave
   */
  public startWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    this.isPreparationPhase = true;
    this.preparationTimer = this.getCurrentWaveConfig().preparationTime;
    this.activeEnemies = 0;
    
    if (this.onWaveStartCallback) {
      this.onWaveStartCallback(waveNumber);
    }
  }

  /**
   * Update wave system (called in fixedUpdate)
   */
  public fixedUpdate(delta: number): void {
    if (!this.isPreparationPhase) {
      // Spawning phase
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnNextEnemy();
        this.spawnTimer = this.getCurrentWaveConfig().spawnInterval;
      }
    } else {
      // Preparation phase
      this.preparationTimer -= delta;
      if (this.preparationTimer <= 0) {
        this.endPreparation();
      }
    }
  }

  /**
   * Spawn next enemy based on wave config
   */
  private spawnNextEnemy(): void {
    // Implementation would call EntityFactory to spawn enemy
    // This is handled by the game scene
  }

  /**
   * End preparation phase
   */
  private endPreparation(): void {
    this.isPreparationPhase = false;
    if (this.onPreparationEndCallback) {
      this.onPreparationEndCallback();
    }
  }

  /**
   * Get current wave configuration
   */
  public getCurrentWaveConfig(): WaveConfig {
    const index = Math.min(this.currentWave - 1, this.waveConfigs.length - 1);
    return this.waveConfigs[index];
  }

  /**
   * Check if in preparation phase
   */
  public isInPreparation(): boolean {
    return this.isPreparationPhase;
  }

  /**
   * Get preparation time remaining
   */
  public getPreparationTimeRemaining(): number {
    return Math.max(0, this.preparationTimer);
  }

  /**
   * Increment active enemy count
   */
  public incrementActiveEnemies(): void {
    this.activeEnemies++;
  }

  /**
   * Decrement active enemy count
   */
  public decrementActiveEnemies(): void {
    this.activeEnemies--;
  }

  /**
   * Check if wave is complete
   */
  public isWaveComplete(): boolean {
    return !this.isPreparationPhase && this.activeEnemies === 0;
  }

  /**
   * Get current wave number
   */
  public getCurrentWave(): number {
    return this.currentWave;
  }

  /**
   * Set callbacks
   */
  public setOnWaveStart(callback: (wave: number) => void): void {
    this.onWaveStartCallback = callback;
  }

  public setOnPreparationEnd(callback: () => void): void {
    this.onPreparationEndCallback = callback;
  }

  public destroy(): void {
    this.onWaveStartCallback = null;
    this.onPreparationEndCallback = null;
    this.waveConfigs = [];
  }
}