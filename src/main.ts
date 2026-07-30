import * as PIXI from 'pixi.js';
import { LayerManager, IDisposable } from './core/LayerManager';
import { TimeManager } from './core/TimeManager';
import { PauseSystem } from './systems/PauseSystem';
import { SaveManager } from './core/SaveManager';
import { ProceduralTextureFactory } from './core/ProceduralTextureFactory';
import { MapGridSystem } from './systems/MapGridSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { JuiceSystem } from './systems/JuiceSystem';
import { GAME_CONFIG } from './config/gameConfig';

/**
 * Основной класс игры "СТАЛЬНОЙ РУБЕЖ"
 * Интегрирует все системы Этапа 1-2:
 * - PixiJS v8 с Retina и WebGL (Правило 1, 5)
 * - Слои рендера (Правило 2)
 * - Fixed Timestep физика (Правило 4)
 * - Авто-пауза (Правило 13)
 * - SaveManager (Правило 14)
 * - ProceduralTextureFactory (CanvasSource v8)
 */
export class Game implements IDisposable {
  public readonly app: PIXI.Application;
  public readonly layerManager: LayerManager;
  public readonly timeManager: TimeManager;
  public readonly pauseSystem: PauseSystem;
  public readonly saveManager: SaveManager;
  public readonly mapGrid: MapGridSystem;
  public readonly physics: PhysicsSystem;
  public readonly juice: JuiceSystem;

  private _lastFrameTime: number = 0;
  private _isRunning: boolean = false;
  private _boundOnResize: () => void;

  constructor() {
    this.app = new PIXI.Application();
    this.layerManager = new LayerManager();
    this.timeManager = new TimeManager();
    this.pauseSystem = new PauseSystem();
    this.saveManager = new SaveManager();
    this.mapGrid = new MapGridSystem();
    this.physics = new PhysicsSystem(this.mapGrid);
    this.juice = new JuiceSystem(this.app);

    // Сохраняем ссылку на бинд для корректного removeEventListener (Правило 11: Zero-Allocation)
    this._boundOnResize = this.onResize.bind(this);

    // Настройка callback паузы
    this.pauseSystem.onPauseCallback = this.onPauseChanged.bind(this);

    // Настройка фиксированного обновления физики
    this.timeManager.onFixedUpdate = this.fixedUpdate.bind(this);
  }

  /**
   * Инициализация игры
   */
  public async init(): Promise<void> {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Инициализация процедурных текстур (CanvasSource v8)
    ProceduralTextureFactory.init();

    // 2. Создание PixiJS приложения с Retina и WebGL
    await this.app.init({
      width,
      height,
      backgroundColor: 0x0a0a0a,
      preference: 'webgl',
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false, // Отключаем сглаживание для пиксель-арта
    });

    // 3. Добавление canvas в DOM
    const container = document.getElementById('app');
    if (container) {
      container.appendChild(this.app.canvas as HTMLCanvasElement);
    } else {
      console.error('[Game] Container #app not found!');
    }

    // 4. Добавление корневого контейнера слоёв на сцену
    this.app.stage.addChild(this.layerManager.root);

    // 5. Добавление тестовых спрайтов для проверки рендера
    this.addTestSprites();

    // 6. Настройка обработки изменения размера окна (Правило 11: Zero-Allocation)
    window.addEventListener('resize', this._boundOnResize, { passive: true });

    console.log('[Game] Initialized with PixiJS v8, Retina DPI, WebGL, Procedural Textures');
    console.log(`[Game] Canvas size: ${width}x${height}, DPI: ${window.devicePixelRatio}`);
  }

  /**
   * Добавление тестовых спрайтов на слои для проверки рендера
   */
  private addTestSprites(): void {
    // Спрайт земли на GroundLayer
    const groundTexture = ProceduralTextureFactory.getTexture('ground');
    const groundSprite = new PIXI.Sprite(groundTexture);
    groundSprite.x = 100;
    groundSprite.y = 100;
    groundSprite.scale.set(3);
    this.layerManager.groundLayer.addChild(groundSprite);

    // Спрайт стены на WallLayer
    const wallTexture = ProceduralTextureFactory.getTexture('wall');
    const wallSprite = new PIXI.Sprite(wallTexture);
    wallSprite.x = 200;
    wallSprite.y = 200;
    wallSprite.scale.set(3);
    this.layerManager.wallLayer.addChild(wallSprite);

    // Тестовая кнопка на UILayer
    this.addTestUIButton();

    // Создаем тестовый танк с физикой
    this.createTestTank();

    console.log('[Game] Test sprites added to layers');
  }

  /**
   * Добавление тестовой кнопки UI
   */
  private addTestUIButton(): void {
    // Создаем простую кнопку из графики для теста UI слоя
    const buttonGraphics = new PIXI.Graphics();
    buttonGraphics.rect(0, 0, 150, 50);
    buttonGraphics.fill(0x4a90d9);
    buttonGraphics.stroke({ width: 2, color: 0xffffff });
    
    // Генерируем текстуру из графики (PixiJS v8 API)
    const buttonTexture = this.app.renderer.generateTexture(buttonGraphics);
    buttonGraphics.destroy();

    const buttonSprite = new PIXI.Sprite(buttonTexture);
    buttonSprite.x = 50;
    buttonSprite.y = 50;
    buttonSprite.eventMode = 'static';
    buttonSprite.cursor = 'pointer';

    // Обработчики событий
    buttonSprite.on('pointerover', () => {
      buttonSprite.alpha = 0.8;
    });
    buttonSprite.on('pointerout', () => {
      buttonSprite.alpha = 1.0;
    });
    buttonSprite.on('pointerdown', () => {
      console.log('[UI] Button clicked!');
      // Тест Juice системы при клике
      this.juice.startShake(10);
      this.juice.triggerHitStop(30);
    });

    this.layerManager.uiLayer.addChild(buttonSprite);
  }

  /**
   * Создание тестового танка с физикой
   */
  private createTestTank(): void {
    const tankTexture = ProceduralTextureFactory.getTexture('tank_body');
    const tankSprite = new PIXI.Sprite(tankTexture);
    tankSprite.scale.set(3);
    
    // Танк 32x32 * 3 = 96px, но хитбокс 40x40
    tankSprite.x = 100;
    tankSprite.y = 100;
    
    this.layerManager.tankLayer.addChild(tankSprite);

    // Добавляем физику танку
    const tankPhysics = {
      x: 100,
      y: 100,
      vx: 100, // пикселей в секунду
      vy: 50,
      width: GAME_CONFIG.physics.entitySize, // 40px
      height: GAME_CONFIG.physics.entitySize, // 40px
      faction: 1, // PLAYER
      isSolid: true,
      sprite: tankSprite,
      onCollide: undefined,
    };

    this.physics.addEntity(tankPhysics as any);

    // Простое обновление позиции танка каждый кадр
    const updateTank = () => {
      if (!this.pauseSystem.isPaused) {
        tankSprite.x = tankPhysics.x;
        tankSprite.y = tankPhysics.y;
        
        // Отскок от стен для демонстрации физики
        if (tankPhysics.x <= 0 || tankPhysics.x >= 520 - 40) {
          tankPhysics.vx *= -1;
        }
        if (tankPhysics.y <= 0 || tankPhysics.y >= 520 - 40) {
          tankPhysics.vy *= -1;
        }
      }
      requestAnimationFrame(updateTank);
    };
    updateTank();
  }

  /**
   * Запуск игрового цикла
   */
  public start(): void {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;
    this._lastFrameTime = performance.now();
    
    // Подписка на тикер PixiJS
    this.app.ticker.add(this.gameLoop, this);

    console.log('[Game] Started');
  }

  /**
   * Остановка игрового цикла
   */
  public stop(): void {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;
    this.app.ticker.remove(this.gameLoop, this);

    console.log('[Game] Stopped');
  }

  /**
   * Основной игровой цикл (вызывается каждый кадр рендера)
   * Zero-Allocation: нет аллокаций внутри (Правило 11)
   */
  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTimeMs = currentTime - this._lastFrameTime;
    this._lastFrameTime = currentTime;

    // Конвертация в секунды
    const deltaSeconds = deltaTimeMs / 1000;

    // Обновление менеджера времени (с фиксированным шагом внутри)
    this.timeManager.update(deltaSeconds);

    // Обновление Juice системы (рендер эффектов, тряска, частицы)
    this.juice.update(this.app.ticker.deltaMS);
  };

  /**
   * Фиксированное обновление физики (вызывается TimeManager с шагом 16.6 мс)
   * Правило 4: Fixed Timestep 60 Hz
   * Правило 11: Zero-Allocation
   */
  private fixedUpdate(_fixedDelta: number): void {
    // Вызов физики
    this.physics.fixedUpdate(_fixedDelta);
    
    // Проверка разрушения базы
    const baseCell = this.mapGrid.getBaseCell();
    if (baseCell && baseCell.type === 0) {
      // База разрушена - Game Over
      console.log('[Game] BASE DESTROYED! Game Over');
      this.juice.startShake(20);
      this.juice.triggerHitStop(50);
    }
  }

  /**
   * Обработчик изменения состояния паузы
   */
  private onPauseChanged(paused: boolean): void {
    this.timeManager.setPaused(paused);
    
    if (paused) {
      console.log('[Game] Paused (auto)');
    } else {
      console.log('[Game] Resumed');
      // Сброс lastFrameTime чтобы избежать скачка дельты
      this._lastFrameTime = performance.now();
    }
  }

  /**
   * Обработка изменения размера окна
   */
  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.app.renderer.resize(width, height);
    
    // Центрирование камеры или адаптация UI может быть добавлена здесь
    console.log(`[Game] Resized to ${width}x${height}`);
  }

  /**
   * Правило 13: Dispose Pattern — полная очистка ресурсов
   */
  public dispose(): void {
    this.stop();
    
    // Отписка от событий resize (Правило 11: Zero-Allocation)
    window.removeEventListener('resize', this._boundOnResize);

    // Dispose систем
    this.pauseSystem.dispose();
    this.timeManager.dispose();
    this.saveManager.dispose();
    this.layerManager.dispose();
    this.mapGrid.destroy();
    this.physics.destroy();
    this.juice.destroy();

    // Удаление canvas из DOM
    if (this.app.canvas.parentNode) {
      this.app.canvas.parentNode.removeChild(this.app.canvas);
    }

    // Уничтожение PixiJS приложения
    this.app.destroy(true);

    console.log('[Game] Disposed');
  }
}

// Точка входа для запуска игры
async function main(): Promise<void> {
  const game = new Game();
  
  try {
    await game.init();
    game.start();
    
    // Сохраняем ссылку на game для отладки в консоли
    (window as unknown as Record<string, unknown>)['game'] = game;
    
  } catch (error) {
    console.error('[Game] Failed to initialize:', error);
  }
}

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
