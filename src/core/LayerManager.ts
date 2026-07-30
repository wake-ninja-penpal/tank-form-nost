import { Container } from 'pixi.js';

/**
 * Интерфейс IDisposable для корректной очистки ресурсов (Правило 13)
 */
export interface IDisposable {
  dispose(): void;
}

/**
 * Типы слоёв рендера согласно Правилу 2: Строгая Иерархия Слоёв
 */
export enum LayerType {
  Ground = 0,
  Wall = 1,
  Loot = 2,
  Tank = 3,
  Bullet = 4,
  Particle = 5,
  UI = 6,
}

/**
 * Менеджер слоёв рендера.
 * Реализует строгую иерархию Z-Index (Правило 2).
 * Каждый слой — отдельный Container с установленным zIndex.
 * TankLayer имеет sortableChildren = true для Y-сортировки танков.
 */
export class LayerManager implements IDisposable {
  public readonly root: Container;
  
  public readonly groundLayer: Container;
  public readonly wallLayer: Container;
  public readonly lootLayer: Container;
  public readonly tankLayer: Container;
  public readonly bulletLayer: Container;
  public readonly particleLayer: Container;
  public readonly uiLayer: Container;

  private readonly layers: Container[];

  constructor() {
    this.root = new Container();

    // Создание слоёв в строгом порядке иерархии
    this.groundLayer = new Container();
    this.wallLayer = new Container();
    this.lootLayer = new Container();
    this.tankLayer = new Container();
    this.bulletLayer = new Container();
    this.particleLayer = new Container();
    this.uiLayer = new Container();

    // Настройка zIndex для каждого слоя
    this.groundLayer.zIndex = LayerType.Ground;
    this.wallLayer.zIndex = LayerType.Wall;
    this.lootLayer.zIndex = LayerType.Loot;
    this.tankLayer.zIndex = LayerType.Tank;
    this.bulletLayer.zIndex = LayerType.Bullet;
    this.particleLayer.zIndex = LayerType.Particle;
    this.uiLayer.zIndex = LayerType.UI;

    // Правило 2: TankLayer с sortableChildren для Y-сортировки
    this.tankLayer.sortableChildren = true;

    // Добавление слоёв в корневой контейнер
    this.layers = [
      this.groundLayer,
      this.wallLayer,
      this.lootLayer,
      this.tankLayer,
      this.bulletLayer,
      this.particleLayer,
      this.uiLayer,
    ];

    for (let i = 0; i < this.layers.length; i++) {
      this.root.addChild(this.layers[i]);
    }

    // Включение сортировки детей по zIndex на корневом контейнере
    this.root.sortableChildren = true;
  }

  /**
   * Получение слоя по типу
   */
  public getLayer(type: LayerType): Container {
    switch (type) {
      case LayerType.Ground: return this.groundLayer;
      case LayerType.Wall: return this.wallLayer;
      case LayerType.Loot: return this.lootLayer;
      case LayerType.Tank: return this.tankLayer;
      case LayerType.Bullet: return this.bulletLayer;
      case LayerType.Particle: return this.particleLayer;
      case LayerType.UI: return this.uiLayer;
      default: throw new Error(`Unknown layer type: ${type}`);
    }
  }

  /**
   * Правило 13: Dispose Pattern для очистки ресурсов
   */
  public dispose(): void {
    // Удаляем все слои из корневого контейнера
    for (let i = this.root.children.length - 1; i >= 0; i--) {
      this.root.removeChildAt(i);
    }
    
    // Очистка массива ссылок
    this.layers.length = 0;
  }
}
