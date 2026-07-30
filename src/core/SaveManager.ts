/**
 * Мета-данные сохранения (MetaSave) — хранятся в localStorage (Правило 14).
 * Включают прогресс игрока, открытия, настройки.
 */
export interface MetaSave {
  playerLevel: number;
  totalRuns: number;
  totalKills: number;
  unlockedTanks: string[];
  unlockedWeapons: string[];
  settings: GameSettings;
}

/**
 * Настройки игры
 */
export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  lowGraphics: boolean;
}

/**
 * Состояние текущего забега (RunState) — хранится только в RAM (Правило 14).
 * Сбрасывается при GameOver.
 */
export interface RunState {
  runId: string;
  startTime: number;
  currentWave: number;
  killsInRun: number;
  scrapCollected: number;
  isGameOver: boolean;
}

/**
 * SaveManager — управление сохранениями с изоляцией MetaSave и RunState (Правило 14).
 * - MetaSave -> localStorage (постоянное хранение)
 * - RunState -> RAM (чистый сброс при GameOver)
 */
export class SaveManager {
  private static readonly STORAGE_KEY = 'steel_frontier_meta_save';
  
  private _metaSave: MetaSave | null = null;
  private _runState: RunState | null = null;

  constructor() {
    this.loadMetaSave();
  }

  /**
   * Загрузка MetaSave из localStorage
   */
  public loadMetaSave(): void {
    try {
      const saved = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (saved) {
        this._metaSave = JSON.parse(saved) as MetaSave;
      } else {
        this._metaSave = this.createDefaultMetaSave();
      }
    } catch (e) {
      console.warn('Failed to load MetaSave, creating default:', e);
      this._metaSave = this.createDefaultMetaSave();
    }
  }

  /**
   * Сохранение MetaSave в localStorage
   */
  public saveMetaSave(): void {
    if (!this._metaSave) {
      return;
    }
    
    try {
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(this._metaSave));
    } catch (e) {
      console.warn('Failed to save MetaSave:', e);
    }
  }

  /**
   * Получение MetaSave
   */
  public getMetaSave(): MetaSave {
    if (!this._metaSave) {
      this._metaSave = this.createDefaultMetaSave();
    }
    return this._metaSave;
  }

  /**
   * Начало нового забега (создание RunState в RAM)
   */
  public startNewRun(): RunState {
    this._runState = {
      runId: this.generateRunId(),
      startTime: Date.now(),
      currentWave: 1,
      killsInRun: 0,
      scrapCollected: 0,
      isGameOver: false,
    };
    return this._runState;
  }

  /**
   * Получение текущего RunState
   */
  public getRunState(): RunState | null {
    return this._runState;
  }

  /**
   * Обновление RunState
   */
  public updateRunState(updater: (state: RunState) => void): void {
    if (this._runState && !this._runState.isGameOver) {
      updater(this._runState);
    }
  }

  /**
   * Завершение забега (Game Over)
   * RunState НЕ сохраняется, просто очищается (Правило 14)
   */
  public endRun(kills: number, scrap: number): void {
    if (this._runState) {
      this._runState.isGameOver = true;
      this._runState.killsInRun = kills;
      this._runState.scrapCollected = scrap;
      
      // Обновляем мета-прогресс
      if (this._metaSave) {
        this._metaSave.totalRuns++;
        this._metaSave.totalKills += kills;
        this.saveMetaSave();
      }
      
      // Очищаем RunState из RAM
      this._runState = null;
    }
  }

  /**
   * Проверка наличия активного забега
   */
  public hasActiveRun(): boolean {
    return this._runState !== null && !this._runState.isGameOver;
  }

  /**
   * Создание дефолтного MetaSave
   */
  private createDefaultMetaSave(): MetaSave {
    return {
      playerLevel: 1,
      totalRuns: 0,
      totalKills: 0,
      unlockedTanks: ['default'],
      unlockedWeapons: ['default'],
      settings: {
        musicVolume: 0.7,
        sfxVolume: 0.8,
        screenShake: true,
        lowGraphics: false,
      },
    };
  }

  /**
   * Генерация уникального ID для забега
   */
  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Правило 13: Dispose Pattern
   * Для SaveManager — сохранение данных перед уничтожением
   */
  public dispose(): void {
    this.saveMetaSave();
    this._metaSave = null;
    this._runState = null;
  }
}
