import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Фабрика процедурных текстур на базе PixiJS v8 CanvasSource.
 * Генерирует спрайты 32x32 пикселей без загрузки внешних ассетов.
 * Соблюдает правило Zero-Allocation (генерация только при старте).
 */
export class ProceduralTextureFactory {
  private static textures: Map<string, PIXI.Texture> = new Map();
  private static fontReady: boolean = false;

  /**
   * Инициализация всех базовых текстур игры.
   * Вызывается один раз при старте приложения.
   */
  public static async init(): Promise<void> {
    this.createTankTextures();
    this.createEnvironmentTextures();
    this.createBulletTextures();
    await this.createBitmapFont();
  }

  /**
   * Получение текстуры по ключу из кэша.
   */
  public static getTexture(key: string): PIXI.Texture {
    const texture = this.textures.get(key);
    if (!texture) {
      throw new Error(`Texture not found: ${key}`);
    }
    return texture;
  }
  
  /**
   * Проверка готовности шрифта.
   */
  public static isFontReady(): boolean {
    return ProceduralTextureFactory.fontReady;
  }

  /**
   * Создание текстур танков (корпус, башня, гусеницы).
   */
  private static createTankTextures(): void {
    const canvas = document.createElement('canvas');
    canvas.width = GAME_CONFIG.render.spriteSize;
    canvas.height = GAME_CONFIG.render.spriteSize;
    const ctx = canvas.getContext('2d')!;

    // Корпус танка (зеленый)
    ctx.fillStyle = '#4a7c4e';
    ctx.fillRect(4, 8, 24, 20);
    
    // Башня (темно-зеленая)
    ctx.fillStyle = '#3a5c3e';
    ctx.fillRect(10, 10, 12, 12);
    
    // Дуло
    ctx.fillStyle = '#2a3c2e';
    ctx.fillRect(16, 14, 12, 4);

    const texture = this.createTextureFromCanvas(canvas, 'tank_body');
    this.textures.set('tank_body', texture);

    // Гусеницы
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(2, 6, 28, 4); // Верхняя
    ctx.fillRect(2, 22, 28, 4); // Нижняя
    
    const tracksTexture = this.createTextureFromCanvas(canvas, 'tank_tracks');
    this.textures.set('tank_tracks', tracksTexture);
  }

  /**
   * Создание текстур окружения (стены, земля, препятствия).
   */
  private static createEnvironmentTextures(): void {
    const canvas = document.createElement('canvas');
    canvas.width = GAME_CONFIG.render.spriteSize;
    canvas.height = GAME_CONFIG.render.spriteSize;
    const ctx = canvas.getContext('2d')!;

    // Земля (трава)
    ctx.fillStyle = '#5a8c5e';
    ctx.fillRect(0, 0, 32, 32);
    // Шум травы
    ctx.fillStyle = '#4a7c4e';
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 32);
      const y = Math.floor(Math.random() * 32);
      ctx.fillRect(x, y, 2, 2);
    }
    this.textures.set('ground', this.createTextureFromCanvas(canvas, 'ground'));

    // Стена (бетон)
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#5a5a5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 32, 32);
    this.textures.set('wall', this.createTextureFromCanvas(canvas, 'wall'));
  }

  /**
   * Создание текстур пуль и снарядов.
   */
  private static createBulletTextures(): void {
    const canvas = document.createElement('canvas');
    canvas.width = GAME_CONFIG.render.spriteSize;
    canvas.height = GAME_CONFIG.render.spriteSize;
    const ctx = canvas.getContext('2d')!;

    // Стандартная пуля
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(16, 16, 6, 0, Math.PI * 2);
    ctx.fill();
    
    this.textures.set('bullet', this.createTextureFromCanvas(canvas, 'bullet'));
  }

  /**
   * Вспомогательный метод создания Texture из Canvas с настройками для пиксель-арта.
   */
  private static createTextureFromCanvas(canvas: HTMLCanvasElement, label: string): PIXI.Texture {
    const canvasSource = new PIXI.CanvasSource({
      resource: canvas,
      scaleMode: 'nearest', // Важно для пиксель-арта
      resolution: window.devicePixelRatio || 1,
    });

    const texture = new PIXI.Texture({
      source: canvasSource,
      label: `Procedural_${label}`,
    });

    // Принудительная установка scaleMode после создания
    texture.source.scaleMode = 'nearest';

    return texture;
  }

  /**
   * Создание BitmapFont для UI.
   * Упрощенная версия - пока без шрифта, используем стандартный.
   */
  private static async createBitmapFont(): Promise<void> {
    // Пока заглушка - в PixiJS v8 API регистрации шрифтов изменилось
    // Используем дефолтный шрифт через PIXI.BitmapText с preload
    ProceduralTextureFactory.fontReady = true;
  }

  /**
   * Очистка всех текстур (вызывается при уничтожении приложения).
   */
  public static destroy(): void {
    this.textures.forEach((texture) => {
      texture.destroy(true);
    });
    this.textures.clear();
  }
}
