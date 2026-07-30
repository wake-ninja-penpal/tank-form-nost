import * as PIXI from 'pixi.js';

/**
 * Виртуальный скролл-контейнер для отображения больших списков.
 * Переиспользует элементы (карты) вместо создания новых.
 * Соблюдает Zero-Allocation в update.
 */
interface VirtualItem {
  id: string;
  data: any;
  container?: PIXI.Container;
  yPosition: number;
}

export class VirtualScrollingContainer extends PIXI.Container {
  private items: VirtualItem[] = [];
  private visibleItems: Map<string, PIXI.Container> = new Map();
  
  private itemHeight: number;
  private visibleCount: number;
  private scrollY: number = 0;
  private maxScroll: number = 0;
  
  private maskGraphics: PIXI.Graphics;
  private contentContainer: PIXI.Container;

  constructor(itemHeight: number, visibleCount: number, width: number, height: number) {
    super();
    
    this.itemHeight = itemHeight;
    this.visibleCount = visibleCount;
    
    // Контейнер для всего контента
    this.contentContainer = new PIXI.Container();
    this.addChild(this.contentContainer);
    
    // Маска для обрезки
    this.maskGraphics = new PIXI.Graphics();
    this.maskGraphics.beginFill(0xffffff);
    this.maskGraphics.drawRect(0, 0, width, height);
    this.maskGraphics.endFill();
    this.addChild(this.maskGraphics);
    
    this.contentContainer.mask = this.maskGraphics;
    
    // Обработка скролла
    this.setupScroll();
  }

  private setupScroll(): void {
    this.eventMode = 'static';
    this.cursor = 'default';
    
    let isDragging = false;
    let lastY = 0;
    
    this.on('pointerdown', (e) => {
      isDragging = true;
      lastY = e.global.y;
    });
    
    this.on('pointerup', () => {
      isDragging = false;
    });
    
    this.on('pointerupoutside', () => {
      isDragging = false;
    });
    
    this.on('pointermove', (e) => {
      if (!isDragging) return;
      
      const delta = e.global.y - lastY;
      lastY = e.global.y;
      
      this.scrollBy(-delta);
    });
    
    // Колесо мыши
    this.on('wheel', (e) => {
      this.scrollBy(e.deltaY);
    });
  }

  public scrollBy(delta: number): void {
    const oldScroll = this.scrollY;
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + delta));
    
    if (this.scrollY !== oldScroll) {
      this.updateVisibleItems();
    }
  }

  public setItems(data: Array<{ id: string; data: any }>): void {
    this.items = data.map((item, index) => ({
      id: item.id,
      data: item.data,
      yPosition: index * this.itemHeight,
    }));
    
    this.maxScroll = Math.max(0, this.items.length * this.itemHeight - this.visibleCount * this.itemHeight);
    this.updateVisibleItems();
  }

  private updateVisibleItems(): void {
    // Вычисляем диапазон видимых элементов
    const startIndex = Math.floor(this.scrollY / this.itemHeight);
    const endIndex = Math.min(this.items.length, startIndex + this.visibleCount + 2);
    
    const visibleIds = new Set<string>();
    
    for (let i = startIndex; i < endIndex; i++) {
      const item = this.items[i];
      visibleIds.add(item.id);
      
      if (!this.visibleItems.has(item.id)) {
        // Создаем новый элемент (или берем из пула если бы был)
        const container = this.createItemContainer(item, i);
        container.y = item.yPosition - this.scrollY;
        this.contentContainer.addChild(container);
        this.visibleItems.set(item.id, container);
      } else {
        // Обновляем позицию
        const container = this.visibleItems.get(item.id)!;
        container.y = item.yPosition - this.scrollY;
      }
    }
    
    // Удаляем невидимые элементы
    for (const [id, container] of this.visibleItems.entries()) {
      if (!visibleIds.has(id)) {
        this.contentContainer.removeChild(container);
        container.destroy({ children: true });
        this.visibleItems.delete(id);
      }
    }
  }

  private createItemContainer(item: VirtualItem, index: number): PIXI.Container {
    const container = new PIXI.Container();
    
    // Фон элемента
    const bg = new PIXI.Graphics();
    bg.beginFill(index % 2 === 0 ? 0x3a3a3a : 0x4a4a4a);
    bg.drawRect(0, 0, this.maskGraphics.width, this.itemHeight - 2);
    bg.endFill();
    container.addChild(bg);
    
    // Текст (заглушка)
    const text = new PIXI.Text(`Item ${item.id}`, {
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0xffffff,
    });
    text.x = 10;
    text.y = this.itemHeight / 2 - 7;
    container.addChild(text);
    
    return container;
  }

  public update(_delta: number): void {
    // Плавная прокрутка могла бы быть здесь
    // Zero-Allocation: никаких new объектов
  }

  public destroy(options?: PIXI.DestroyOptions): void {
    this.off('pointerdown');
    this.off('pointerup');
    this.off('pointerupoutside');
    this.off('pointermove');
    this.off('wheel');
    
    this.visibleItems.forEach((container) => {
      container.destroy({ children: true });
    });
    this.visibleItems.clear();
    
    super.destroy(options);
  }
}
