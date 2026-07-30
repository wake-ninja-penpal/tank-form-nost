import * as PIXI from 'pixi.js';
import { LayerManager } from './core/LayerManager';
import { TimeManager } from './core/TimeManager';
import { PauseSystem } from './systems/PauseSystem';
import { MapGridSystem } from './systems/MapGridSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { JuiceSystem } from './systems/JuiceSystem';
import { WaveSystem } from './systems/WaveSystem';
import { RoguePerkSystem } from './systems/RoguePerkSystem';
import { UIButton } from './ui/components/UIButton';
import { VirtualScrollingContainer } from './ui/components/VirtualScrollingContainer';
import { UIBitmapText } from './ui/components/UIBitmapText';
import { TankPreview } from './ui/garage/TankPreview';
import { GAME_CONFIG } from './config/gameConfig';

class Game {
  private app!: PIXI.Application;
  private layers!: LayerManager;
  private time!: TimeManager;
  
  private pause!: PauseSystem;
  private grid!: MapGridSystem;
  private physics!: PhysicsSystem;
  private juice!: JuiceSystem;
  
  private waves!: WaveSystem;
  
  private _perks!: RoguePerkSystem;

  private isGarageMode: boolean = true;
  
  private garageContainer!: PIXI.Container;
  private battleContainer!: PIXI.Container;
  private tabs: Record<string, { container: PIXI.Container; bg: PIXI.Graphics }> = {};
  private tankPreview!: TankPreview;
  private virtualScroll!: VirtualScrollingContainer;

  private playerTank!: PIXI.Sprite;
  private inputKeys: Record<string, boolean> = {};

  public async init(): Promise<void> {
    this.app = new PIXI.Application({
      preference: 'webgl',
      resolution: window.devicePixelRatio,
      autoDensity: true,
      backgroundAlpha: 1,
      backgroundColor: 0x1a1a2e,
      resizeTo: window,
    });
    document.body.appendChild(this.app.canvas);

    this.layers = new LayerManager();
    this.time = new TimeManager();
    
    this.pause = new PauseSystem();
    
    this.grid = new MapGridSystem();
    this.physics = new PhysicsSystem(this.grid);
    this.juice = new JuiceSystem(this.app);
    
    this.waves = new WaveSystem();
    
    this._perks = new RoguePerkSystem();

    this.time.onFixedUpdate = this.fixedUpdate.bind(this);
    this.app.ticker.add((delta) => {
      const deltaMS: number = Number(delta) * 16.67;
      this.time.update(deltaMS);
      this.update(deltaMS);
    });

    this.initGarageScene();
    this.initBattleScene();

    this.waves.startNextWave();

    console.log('✅ СТАЛЬНОЙ РУБЕЖ запущен');
  }

  private initGarageScene(): void {
    this.garageContainer = new PIXI.Container();
    this.layers.uiLayer.addChild(this.garageContainer);

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.fill(0x2d2d44);
    this.garageContainer.addChild(bg);

    const title = new UIBitmapText({ text: 'СТАЛЬНОЙ РУБЕЖ - ГАРАЖ', fontSize: 32 });
    title.x = this.app.screen.width / 2;
    title.y = 40;
    this.garageContainer.addChild(title);

    const tabY = 100;
    const tabHeight = 40;
    const tabWidth = 120;
    const tabSpacing = 10;
    const startX = (this.app.screen.width - (tabWidth * 4 + tabSpacing * 3)) / 2;

    const tabNames = ['СБОРКА', 'АНГАР', 'КРАФТ', 'БОКСЫ'];
    tabNames.forEach((name, index) => {
      const tab = new PIXI.Container();
      const tabBg = new PIXI.Graphics();
      tabBg.roundRect(0, 0, tabWidth, tabHeight, 8);
      tabBg.fill(index === 0 ? 0x4a90d9 : 0x3d3d5c);
      tab.addChild(tabBg);

      const label = new UIBitmapText({ text: name, fontSize: 14 });
      label.x = tabWidth / 2;
      label.y = tabHeight / 2;
      tab.addChild(label);

      tab.x = startX + index * (tabWidth + tabSpacing);
      tab.y = tabY;
      tab.eventMode = 'static';
      tab.cursor = 'pointer';

      tab.on('pointerdown', () => this.switchTab(name));
      this.garageContainer.addChild(tab);
      
      const contentContainer = new PIXI.Container();
      contentContainer.visible = index === 0;
      contentContainer.y = 160;
      this.garageContainer.addChild(contentContainer);
      
      this.tabs[name] = { container: contentContainer, bg: tabBg };
    });

    this.initAssemblyTab();
    this.initHangarTab();
    this.initCraftTab();
    this.initBoxesTab();

    const modeBtn = new UIButton('В БОЙ >>>', 150, 50);
    modeBtn.x = this.app.screen.width - 170;
    modeBtn.y = this.app.screen.height - 70;
    modeBtn.on('pointerdown', () => this.toggleMode());
    this.garageContainer.addChild(modeBtn);
  }

  private initAssemblyTab(): void {
    const tabData = this.tabs['СБОРКА'];
    if (!tabData) return;
    
    this.tankPreview = new TankPreview();
    this.tankPreview.x = this.app.screen.width / 2;
    this.tankPreview.y = 200;
    this.tankPreview.setHover(true);
    tabData.container.addChild(this.tankPreview);

    setTimeout(() => this.tankPreview.updateSlot('chassis', 'tank_body'), 1000);
    setTimeout(() => this.tankPreview.updateSlot('turret', 'tank_body'), 2000);
    setTimeout(() => this.tankPreview.updateSlot('weapon', 'tank_body'), 3000);
  }

  private initHangarTab(): void {
    const tabData = this.tabs['АНГАР'];
    if (!tabData) return;

    this.virtualScroll = new VirtualScrollingContainer(50, 10, 400, 500);
    this.virtualScroll.x = (this.app.screen.width - 400) / 2;
    this.virtualScroll.y = 0;

    const items = [];
    for (let i = 0; i < 100; i++) {
      items.push({ id: `item_${i}`, data: { name: `Танк #${i + 1}` } });
    }
    this.virtualScroll.setItems(items);

    tabData.container.addChild(this.virtualScroll);
  }

  private initCraftTab(): void {
    const tabData = this.tabs['КРАФТ'];
    if (!tabData) return;

    const craftText = new UIBitmapText({ text: 'В РАЗРАБОТКЕ', fontSize: 24 });
    craftText.x = this.app.screen.width / 2;
    craftText.y = 0;
    tabData.container.addChild(craftText);
  }

  private initBoxesTab(): void {
    const tabData = this.tabs['БОКСЫ'];
    if (!tabData) return;

    const boxBtn = new UIButton('ТЕСТ ЭФФЕКТОВ', 200, 50);
    boxBtn.x = (this.app.screen.width - 200) / 2;
    boxBtn.y = 0;
    boxBtn.on('pointerdown', () => {
      this.juice.startShake(10);
      this.juice.showFloatingText('BOX OPENED!', this.app.screen.width / 2, this.app.screen.height / 2);
    });
    tabData.container.addChild(boxBtn);
  }

  private switchTab(tabName: string): void {
    Object.keys(this.tabs).forEach((name) => {
      const tabData = this.tabs[name];
      tabData.container.visible = name === tabName;
      
      tabData.bg.clear();
      tabData.bg.roundRect(0, 0, 120, 40, 8);
      tabData.bg.fill(name === tabName ? 0x4a90d9 : 0x3d3d5c);
    });
  }

  private initBattleScene(): void {
    this.battleContainer = new PIXI.Container();
    this.battleContainer.visible = false;
    this.layers.tankLayer.addChild(this.battleContainer);

    this.playerTank = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.playerTank.tint = 0x00ff00;
    this.playerTank.width = 32;
    this.playerTank.height = 32;
    this.playerTank.x = 200;
    this.playerTank.y = 200;
    this.battleContainer.addChild(this.playerTank);

    for (let i = 0; i < 3; i++) {
      const enemy = new PIXI.Sprite(PIXI.Texture.WHITE);
      enemy.tint = 0xff0000;
      enemy.width = 32;
      enemy.height = 32;
      enemy.x = 300 + i * 50;
      enemy.y = 300;
      this.battleContainer.addChild(enemy);
    }

    window.addEventListener('keydown', (e) => this.inputKeys[e.code] = true);
    window.addEventListener('keyup', (e) => this.inputKeys[e.code] = false);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyG') this.toggleMode();
      if (e.code === 'Space' && !this.isGarageMode) {
        this.juice.startShake(5);
        this.juice.showFloatingText('BANG!', this.playerTank.x, this.playerTank.y - 20);
      }
    });
  }

  private toggleMode(): void {
    this.isGarageMode = !this.isGarageMode;
    this.garageContainer.visible = this.isGarageMode;
    this.battleContainer.visible = !this.isGarageMode;
  }

  private fixedUpdate(fixedDelta: number): void {
    if (!this.isGarageMode) {
      this.physics.fixedUpdate(fixedDelta);
    }
  }

  private update(delta: number): void {
    if (this.isGarageMode && this.tankPreview) {
      this.tankPreview.updateUITime(delta / 1000, Date.now());
    }

    if (!this.isGarageMode) {
      const speed = GAME_CONFIG.physics.playerSpeed;
      if (this.inputKeys['ArrowUp'] || this.inputKeys['KeyW']) this.playerTank.y -= speed * delta;
      if (this.inputKeys['ArrowDown'] || this.inputKeys['KeyS']) this.playerTank.y += speed * delta;
      if (this.inputKeys['ArrowLeft'] || this.inputKeys['KeyA']) this.playerTank.x -= speed * delta;
      if (this.inputKeys['ArrowRight'] || this.inputKeys['KeyD']) this.playerTank.x += speed * delta;

      this.playerTank.x = Math.max(0, Math.min(this.app.screen.width - 32, this.playerTank.x));
      this.playerTank.y = Math.max(0, Math.min(this.app.screen.height - 32, this.playerTank.y));
    }

    this.waves.update(delta);
    this.juice.update(delta);
  }

  public destroy(): void {
    this.pause.dispose();
    this.juice.destroy();
    this.waves.destroy();
    this._perks.destroy();
    this.app.destroy(true);
  }
}

const game = new Game();
game.init().catch(console.error);
