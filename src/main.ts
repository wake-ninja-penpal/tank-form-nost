import * as PIXI from 'pixi.js';
import { LayerManager, IDisposable } from './core/LayerManager';
import { TimeManager } from './core/TimeManager';
import { PauseSystem } from './systems/PauseSystem';
import { SaveManager } from './core/SaveManager';
import { ProceduralTextureFactory } from './core/ProceduralTextureFactory';
import { MapGridSystem } from './systems/MapGridSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { JuiceSystem } from './systems/JuiceSystem';
import { PathfindingSystem } from './systems/PathfindingSystem';
import { WaveSystem } from './entities/enemies/EnemyTypes';
import { GameOverSequence } from './systems/GameOverSequence';
import { RoguePerkSystem } from './systems/RoguePerkSystem';
import { GAME_CONFIG } from './config/gameConfig';
import { UIButton } from './ui/components/UIButton';
import { VirtualScrollingContainer } from './ui/components/VirtualScrollingContainer';
import { TankPreview } from './ui/garage/TankPreview';

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
  public readonly pathfinding: PathfindingSystem;
  public readonly waveSystem: WaveSystem;
  public readonly gameOverSequence: GameOverSequence;
  public readonly roguePerkSystem: RoguePerkSystem;
  
  // Garage UI components
  private garageContainer: PIXI.Container | null = null;
  private tankPreview: TankPreview | null = null;
  private virtualScroll: VirtualScrollingContainer | null = null;
  private isGarageMode: boolean = true;

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
    this.pathfinding = new PathfindingSystem(13, 13);
    this.waveSystem = new WaveSystem();
    this.gameOverSequence = new GameOverSequence();
    this.roguePerkSystem = new RoguePerkSystem();

    // Настройка связей между системами
    this.pathfinding.setMapGrid(this.mapGrid);
    this.gameOverSequence.setLayerManager(this.layerManager);

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
    // Создаем UI Гаража
    this.createGarageUI();
    
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

    // Создаем тестовый танк с физикой
    this.createTestTank();

    console.log('[Game] Test sprites and Garage UI added to layers');
  }

  /**
   * Создание UI Гаража с вкладками
   */
  private createGarageUI(): void {
    this.garageContainer = new PIXI.Container();
    
    // Фон гаража
    const bgGraphics = new PIXI.Graphics();
    bgGraphics.rect(0, 0, GAME_CONFIG.screen.width, GAME_CONFIG.screen.height);
    bgGraphics.fill(0x1a1a2e);
    this.garageContainer.addChild(bgGraphics);

    // Заголовок
    const titleText = new PIXI.BitmapText('СТАЛЬНОЙ РУБЕЖ - ГАРАЖ', {
      fontFamily: 'PressStart2P',
      fontSize: 24,
      fill: 0xffd700,
    });
    titleText.x = GAME_CONFIG.screen.width / 2 - titleText.width / 2;
    titleText.y = 20;
    this.garageContainer.addChild(titleText);

    // Вкладки
    const tabs = ['СБОРКА', 'АНГАР', 'КРАФТ', 'БОКСЫ'];
    let tabX = 50;
    for (let i = 0; i < tabs.length; i++) {
      const tabBtn = new UIButton(tabs[i], 16);
      tabBtn.x = tabX;
      tabBtn.y = 70;
      tabBtn.on('pointerdown', () => {
        this.switchTab(tabs[i]);
      });
      this.garageContainer.addChild(tabBtn as unknown as PIXI.Container);
      tabX += 180;
    }

    // TankPreview на вкладке СБОРКА
    this.tankPreview = new TankPreview();
    this.tankPreview.x = GAME_CONFIG.screen.width / 2;
    this.tankPreview.y = 300;
    this.tankPreview.setHover(true);
    this.garageContainer.addChild(this.tankPreview as unknown as PIXI.Container);

    // Авто-обновление слотов для демонстрации
    setTimeout(() => {
      if (this.tankPreview) {
        this.tankPreview.updateSlot('chassis', 'tank_chassis');
        console.log('[Garage] Chassis slot updated');
      }
    }, 1000);
    setTimeout(() => {
      if (this.tankPreview) {
        this.tankPreview.updateSlot('turret', 'tank_turret');
        console.log('[Garage] Turret slot updated');
      }
    }, 2000);
    setTimeout(() => {
      if (this.tankPreview) {
        this.tankPreview.updateSlot('weapon', 'tank_weapon');
        console.log('[Garage] Weapon slot updated');
      }
    }, 3000);

    // VirtualScrollingContainer на вкладке АНГАР (скрыт по умолчанию)
    this.virtualScroll = new VirtualScrollingContainer(400, 300);
    this.virtualScroll.x = GAME_CONFIG.screen.width / 2 - 200;
    this.virtualScroll.y = 150;
    this.virtualScroll.visible = false;
    
    // Заполняем 100 элементами
    const items: PIXI.Container[] = [];
    for (let i = 0; i < 100; i++) {
      const item = new PIXI.Graphics();
      item.rect(0, 0, 380, 50);
      item.fill(0x333355);
      item.stroke({ width: 1, color: 0x666688 });
      items.push(item as unknown as PIXI.Container);
    }
    this.virtualScroll.setItems(items);
    
    this.garageContainer.addChild(this.virtualScroll as unknown as PIXI.Container);

    // Кнопка переключения режима
    const modeBtn = new UIButton('В БОЙ >>>', 18);
    modeBtn.x = GAME_CONFIG.screen.width - 200;
    modeBtn.y = GAME_CONFIG.screen.height - 80;
    modeBtn.on('pointerdown', () => {
      this.toggleGameMode();
    });
    this.garageContainer.addChild(modeBtn as unknown as PIXI.Container);

    this.layerManager.uiLayer.addChild(this.garageContainer);
    console.log('[Garage] UI created with tabs, TankPreview, and VirtualScroll');
  }

  /**
   * Переключение вкладки гаража
   */
  private switchTab(tabName: string): void {
    console.log(`[Garage] Switched to tab: ${tabName}`);
    
    if (this.tankPreview) {
      this.tankPreview.visible = (tabName === 'сборка');
    }
    if (this.virtualScroll) {
      this.virtualScroll.visible = (tabName === 'ангар');
    }
  }

  /**
   * Переключение режима Гараж/Бой
   */
  private toggleGameMode(): void {
    this.isGarageMode = !this.isGarageMode;
    if (this.garageContainer) {
      this.garageContainer.visible = this.isGarageMode;
    }
    console.log(`[Game] Mode switched: ${this.isGarageMode ? 'GARAGE' : 'BATTLE'}`);
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
