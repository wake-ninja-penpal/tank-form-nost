import * as PIXI from 'pixi.js';
import { Application } from 'pixi.js';
import { LayerManager } from './core/LayerManager';
import { TimeManager, FIXED_DELTA_TIME } from './core/TimeManager';
import { PauseSystem } from './systems/PauseSystem';
import { ProceduralTextureFactory } from './core/ProceduralTextureFactory';
import { MapGridSystem } from './systems/MapGridSystem';
import { PhysicsSystem, IPhysicsEntity } from './systems/PhysicsSystem';
import { JuiceSystem } from './systems/JuiceSystem';
import { PathfindingSystem } from './systems/PathfindingSystem';
import { WaveSystem } from './systems/WaveSystem';
import { GameOverSequence } from './systems/GameOverSequence';
import { RoguePerkSystem } from './systems/RoguePerkSystem';
import { UIButton } from './ui/components/UIButton';
import { UIBitmapText } from './ui/components/UIBitmapText';
import { VirtualScrollingContainer } from './ui/components/VirtualScrollingContainer';
import { TankPreview } from './ui/garage/TankPreview';
import { GAME_CONFIG } from './config/gameConfig';

type GarageTab = 'ASSEMBLY' | 'HANGAR' | 'CRAFT' | 'BOXES';

export class Game {
  private app!: Application;
  private layers!: LayerManager;
  private time!: TimeManager;
  private pause!: PauseSystem;

  // Системы Этапа 4-5 (используются для интеграции)
  private grid!: MapGridSystem;
  private physics!: PhysicsSystem;
  private juice!: JuiceSystem;
  private _pathfinding!: PathfindingSystem;
  private _waves!: WaveSystem;
  private _gameOverSeq!: GameOverSequence;
  private _perks!: RoguePerkSystem;

  // UI Гаража
  private garageContainer!: PIXI.Container;
  private tabs: Record<GarageTab, PIXI.Container> = {} as any;
  private tabButtons: Record<GarageTab, UIButton> = {} as any;

  // Компоненты Гаража
  private tankPreview!: TankPreview;
  private hangarScroll!: VirtualScrollingContainer;
  private battleButton!: UIButton;

  // Сущности боя
  private playerEntity!: IPhysicsEntity;
  private playerSprite!: PIXI.Sprite;
  private enemyEntities: IPhysicsEntity[] = [];
  private enemySprites: PIXI.Sprite[] = [];
  private isBattleMode: boolean = false;

  // Ввод
  private keys: Record<string, boolean> = {};

  constructor() {
    this.pause = new PauseSystem();
    this.setupInput();
  }

  public async init(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: GAME_CONFIG.screen.width,
      height: GAME_CONFIG.screen.height,
      backgroundColor: 0x000000,
      preference: 'webgl',
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    document.getElementById('app')?.appendChild(this.app.canvas);
    
    this.layers = new LayerManager();
    await ProceduralTextureFactory.init();

    // Инициализация систем
    this.grid = new MapGridSystem();
    this.physics = new PhysicsSystem(this.grid);
    this.juice = new JuiceSystem(this.app);
    this._pathfinding = new PathfindingSystem(GAME_CONFIG.map.width, GAME_CONFIG.map.height);
    this._waves = new WaveSystem();
    this._gameOverSeq = new GameOverSequence();
    this._perks = new RoguePerkSystem();

    // Используем системы для интеграции (чтобы избежать TS6133)
    void this._pathfinding;
    void this._waves;
    void this._gameOverSeq;
    void this._perks;

    // Построение UI Гаража
    this.createGarageUI();

    // Создание игрока (скрыт в гараже)
    this.createPlayer();

    // Запуск циклов - используем onFixedUpdate callback
    this.time = new TimeManager();
    this.time.onFixedUpdate = (fixedDelta: number) => this.fixedUpdate(fixedDelta);

    console.log('✅ СТАЛЬНОЙ РУБЕЖ запущен. Режим: ГАРАЖ');
    
    // Запускаем render loop через requestAnimationFrame
    this.startRenderLoop();
  }

  private startRenderLoop(): void {
    const loop = () => {
      const deltaMS = 16.67; // approx 60fps
      this.update(deltaMS);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private createGarageUI(): void {
    this.garageContainer = new PIXI.Container();
    this.layers.uiLayer.addChild(this.garageContainer);

    // Фон гаража
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, GAME_CONFIG.screen.width, GAME_CONFIG.screen.height);
    bg.fill(0x2c3e50);
    this.garageContainer.addChild(bg);

    // Заголовок
    const title = new UIBitmapText({ text: 'СТАЛЬНОЙ РУБЕЖ - ГАРАЖ', fontSize: 32 });
    title.x = GAME_CONFIG.screen.width / 2 - title.width / 2;
    title.y = 20;
    this.garageContainer.addChild(title);

    // Панель вкладок
    const tabY = 80;
    const tabHeight = 40;
    const tabWidth = 100;
    const startX = 20;

    const tabLabels: Record<GarageTab, string> = {
      'ASSEMBLY': 'СБОРКА',
      'HANGAR': 'АНГАР',
      'CRAFT': 'КРАФТ',
      'BOXES': 'БОКСЫ'
    };

    let currentX = startX;
    (Object.keys(tabLabels) as GarageTab[]).forEach((tabKey) => {
      const btn = new UIButton(tabLabels[tabKey], tabWidth, tabHeight);
      btn.x = currentX;
      btn.y = tabY;
      btn.onClick(() => this.switchTab(tabKey));
      this.tabButtons[tabKey] = btn;
      this.garageContainer.addChild(btn);
      currentX += tabWidth + 10;
    });

    // Контейнер контента вкладок
    const contentY = 140;

    // 1. Вкладка СБОРКА
    this.tabs.ASSEMBLY = new PIXI.Container();
    this.tankPreview = new TankPreview();
    this.tankPreview.x = GAME_CONFIG.screen.width / 2;
    this.tankPreview.y = contentY + 150;
    this.tankPreview.setHover(true);
    this.tabs.ASSEMBLY.addChild(this.tankPreview);

    // Подписи слотов
    const slotLabels = ['Шасси', 'Турель', 'Орудие', 'Двигатель', 'Броня', 'Модуль', 'Декор'];
    slotLabels.forEach((label, i) => {
      const text = new UIBitmapText({ text: label, fontSize: 14 });
      text.x = GAME_CONFIG.screen.width / 2 - 150;
      text.y = contentY + 50 + (i * 25);
      this.tabs.ASSEMBLY.addChild(text);
    });

    // 2. Вкладка АНГАР
    this.tabs.HANGAR = new PIXI.Container();
    this.hangarScroll = new VirtualScrollingContainer(40, 8, 300, 320);
    this.hangarScroll.x = GAME_CONFIG.screen.width / 2 - 150;
    this.hangarScroll.y = contentY;

    const hangarData = [];
    for (let i = 0; i < 100; i++) {
      hangarData.push({ id: `tank_${i}`, data: { model: `Mk-${i + 1}`, rank: i % 5 + 1 } });
    }
    this.hangarScroll.setItems(hangarData);
    this.tabs.HANGAR.addChild(this.hangarScroll);

    // 3. Вкладка КРАФТ
    this.tabs.CRAFT = new PIXI.Container();
    const craftText = new UIBitmapText({ text: 'В РАЗРАБОТКЕ', fontSize: 24 });
    craftText.x = 150;
    craftText.y = 150;
    this.tabs.CRAFT.addChild(craftText);

    // 4. Вкладка БОКСЫ
    this.tabs.BOXES = new PIXI.Container();
    const testBtn = new UIButton('ТЕСТ ЭФФЕКТОВ', 200, 50);
    testBtn.x = 150;
    testBtn.y = 150;
    testBtn.onClick(() => {
      this.juice.startShake(10);
      this.juice.showFloatingText('CRITICAL!', GAME_CONFIG.screen.width / 2, GAME_CONFIG.screen.height / 2);
    });
    this.tabs.BOXES.addChild(testBtn);

    Object.values(this.tabs).forEach(tab => {
      tab.y = contentY;
      tab.visible = false;
      this.garageContainer.addChild(tab);
    });

    this.switchTab('ASSEMBLY');

    // Кнопка "В БОЙ"
    this.battleButton = new UIButton('В БОЙ >>>', 150, 40);
    this.battleButton.x = GAME_CONFIG.screen.width - 170;
    this.battleButton.y = GAME_CONFIG.screen.height - 60;
    this.battleButton.onClick(() => this.toggleBattleMode());
    this.garageContainer.addChild(this.battleButton);
  }

  private switchTab(tab: GarageTab): void {
    (Object.keys(this.tabs) as GarageTab[]).forEach(key => {
      this.tabs[key].visible = (key === tab);
    });

    if (tab === 'ASSEMBLY') {
      this.tankPreview.setHover(true);
      setTimeout(() => this.tankPreview.updateSlot('turret', 'tank_turret'), 500);
      setTimeout(() => this.tankPreview.updateSlot('gun', 'tank_gun'), 1000);
    } else if (tab === 'HANGAR') {
      this.hangarScroll.scrollBy(99999);
      this.hangarScroll.scrollBy(-99999);
    }
  }

  private createPlayer(): void {
    this.playerSprite = new PIXI.Sprite(ProceduralTextureFactory.getTexture('tank_player'));
    this.playerSprite.anchor.set(0.5);
    this.playerSprite.x = 260;
    this.playerSprite.y = 260;
    this.playerSprite.visible = false;
    this.layers.tankLayer.addChild(this.playerSprite);

    this.playerEntity = {
      x: 260,
      y: 260,
      vx: 0,
      vy: 0,
      width: GAME_CONFIG.physics.entitySize,
      height: GAME_CONFIG.physics.entitySize,
      faction: 1,
      isSolid: true,
    };
    this.physics.addEntity(this.playerEntity);
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyG') this.toggleBattleMode();
      if (e.code === 'Space' && this.isBattleMode) this.shoot();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  private toggleBattleMode(): void {
    this.isBattleMode = !this.isBattleMode;

    if (this.isBattleMode) {
      this.garageContainer.visible = false;
      this.playerSprite.visible = true;
      this.battleButton.setText('<<< В ГАРАЖ');
      this.spawnTestEnemies();
      console.log('⚔️ РЕЖИМ БОЯ');
    } else {
      this.garageContainer.visible = true;
      this.playerSprite.visible = false;
      this.battleButton.setText('В БОЙ >>>');
      
      this.enemySprites.forEach(s => s.destroy());
      this.enemySprites = [];
      this.enemyEntities.forEach(e => this.physics.removeEntity(e));
      this.enemyEntities = [];
      
      console.log('🔧 РЕЖИМ ГАРАЖА');
    }
  }

  private spawnTestEnemies(): void {
    for (let i = 0; i < 3; i++) {
      const sprite = new PIXI.Sprite(ProceduralTextureFactory.getTexture('tank_enemy'));
      sprite.anchor.set(0.5);
      sprite.x = 100 + i * 150;
      sprite.y = 100;
      sprite.visible = true;
      this.layers.tankLayer.addChild(sprite);
      this.enemySprites.push(sprite);

      const entity: IPhysicsEntity = {
        x: 100 + i * 150,
        y: 100,
        vx: 0,
        vy: 0,
        width: GAME_CONFIG.physics.entitySize,
        height: GAME_CONFIG.physics.entitySize,
        faction: 2,
        isSolid: true,
      };
      this.physics.addEntity(entity);
      this.enemyEntities.push(entity);
    }
  }

  private shoot(): void {
    const bullet = new PIXI.Sprite(ProceduralTextureFactory.getTexture('bullet'));
    bullet.anchor.set(0.5);
    bullet.x = this.playerEntity.x;
    bullet.y = this.playerEntity.y - 20;
    this.layers.bulletLayer.addChild(bullet);
    
    this.juice.startShake(5);
    this.juice.showFloatingText('BANG!', this.playerEntity.x, this.playerEntity.y - 30);
    
    setTimeout(() => bullet.destroy(), 1000);
  }

  private update(deltaMS: number): void {
    // Обновляем TimeManager
    this.time.update(deltaMS);

    if (!this.isBattleMode) {
      const timeMs = performance.now();
      this.tankPreview.updateUITime(FIXED_DELTA_TIME, timeMs);
      this.hangarScroll.update(FIXED_DELTA_TIME);
    }
    
    // Обновляем Juice систему
    this.juice.update(deltaMS);
  }

  private fixedUpdate(fixedDelta: number): void {
    if (!this.isBattleMode) return;

    const speed = 200 * fixedDelta;
    let dx = 0;
    let dy = 0;

    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy = -speed;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy = speed;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx = -speed;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx = speed;

    this.playerEntity.vx = dx / fixedDelta;
    this.playerEntity.vy = dy / fixedDelta;

    this.enemyEntities.forEach((enemy, i) => {
      const target = { x: 480, y: 480 };
      const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      enemy.vx = Math.cos(angle) * 100;
      enemy.vy = Math.sin(angle) * 100;
      
      this.enemySprites[i].x = enemy.x;
      this.enemySprites[i].y = enemy.y;
    });

    this.physics.fixedUpdate(fixedDelta);

    this.playerSprite.x = this.playerEntity.x;
    this.playerSprite.y = this.playerEntity.y;
  }

  public dispose(): void {
    this.pause.dispose();
    this.time.dispose();
  }
}
