import { EventEmitter } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';

export enum WaveState {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  ACTIVE = 'ACTIVE',
  BOSS_FIGHT = 'BOSS_FIGHT'
}

export interface WaveData {
  waveNumber: number;
  enemyCount: number;
  spawnInterval: number;
  bossSpawn: boolean;
}

/**
 * Система управления волнами врагов.
 * Реализует логику подготовки, спавна и завершения волн.
 */
export class WaveSystem extends EventEmitter {
  private _currentWave: number = 0;
  private _state: WaveState = WaveState.IDLE;
  private _spawnTimer: number = 0;
  private _enemiesSpawned: number = 0;
  private _waveData: WaveData | null = null;

  constructor() {
    super();
  }

  public startNextWave(): void {
    this._currentWave++;
    this._state = WaveState.PREPARING;
    this._waveData = this.calculateWave(this._currentWave);
    this._enemiesSpawned = 0;
    
    // Фаза подготовки (3 секунды) перед началом спавна
    this.emit('wavePreparing', this._currentWave);
    
    setTimeout(() => {
      if (this._state === WaveState.PREPARING) {
        this._state = WaveState.ACTIVE;
        this.emit('waveStarted', this._waveData);
      }
    }, 3000);
  }

  private calculateWave(num: number): WaveData {
    const baseCount = GAME_CONFIG.waves.baseEnemyCount;
    const multiplier = 1 + (num - 1) * GAME_CONFIG.waves.difficultyMultiplier;
    
    return {
      waveNumber: num,
      enemyCount: Math.floor(baseCount * multiplier),
      spawnInterval: Math.max(500, GAME_CONFIG.waves.baseSpawnInterval - (num * 10)),
      bossSpawn: num % GAME_CONFIG.waves.bossEveryNWaves === 0
    };
  }

  public update(delta: number): void {
    if (this._state !== WaveState.ACTIVE) return;

    if (!this._waveData) return;

    this._spawnTimer += delta;

    if (this._spawnTimer >= this._waveData.spawnInterval && 
        this._enemiesSpawned < this._waveData.enemyCount) {
      
      this._spawnTimer = 0;
      this._enemiesSpawned++;
      
      // Событие для спавна одного врага
      // Координаты спавна должны быть определены в MapGridSystem или переданы отдельно
      this.emit('spawnEnemy', {
        type: this._enemiesSpawned === this._waveData.enemyCount && this._waveData.bossSpawn ? 'boss' : 'basic',
        wave: this._currentWave
      });
    }

    if (this._enemiesSpawned >= this._waveData.enemyCount) {
      // Проверка на окончание волны (все враги убиты) выносится наружу или слушается событие
      // Здесь просто ждем сигнала извне, что волна завершена
    }
  }

  public onWaveComplete(): void {
    this._state = WaveState.IDLE;
    this.emit('waveComplete', this._currentWave);
    
    // Автоматический старт следующей волны через паузу
    setTimeout(() => {
      this.startNextWave();
    }, 5000);
  }

  public get currentWave(): number {
    return this._currentWave;
  }

  public get state(): WaveState {
    return this._state;
  }
  
  public destroy(): void {
    this.removeAllListeners();
    this._waveData = null;
  }
}
