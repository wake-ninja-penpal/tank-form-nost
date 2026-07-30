import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '../../config/gameConfig';
import { ProceduralTextureFactory } from '../../core/ProceduralTextureFactory';

/**
 * Превью танка в гараже.
 * Сборка модели по 7 слотам с анимациями на UITime.
 */
export class TankPreview extends PIXI.Container {
  private slots: Map<string, PIXI.Sprite> = new Map();
  private baseSprite: PIXI.Sprite;
  
  // Анимационные параметры (Zero-Allocation: переиспользуются)
  private hoverOffsetX = 0;
  private targetHoverOffsetX = 0;
  private rotationAngle = 0;
  private targetRotationAngle = 0;

  constructor() {
    super();
    
    // Базовый спрайт танка
    const texture = ProceduralTextureFactory.getTexture('tank_body');
    this.baseSprite = new PIXI.Sprite(texture);
    this.baseSprite.anchor.set(0.5);
    this.baseSprite.scale.set(GAME_CONFIG.garage.tankPreviewScale);
    this.addChild(this.baseSprite);
    
    // Инициализация слотов
    this.initSlots();
    
    // Центрирование
    this.x = 0;
    this.y = 0;
  }

  private initSlots(): void {
    const slotNames = ['turret', 'gun', 'engine', 'tracks_left', 'tracks_right', 'armor_front', 'armor_rear'];
    
    slotNames.forEach((slotName) => {
      const sprite = new PIXI.Sprite(ProceduralTextureFactory.getTexture('tank_body'));
      sprite.anchor.set(0.5);
      sprite.visible = false; // Скрыт по умолчанию
      this.addChild(sprite);
      this.slots.set(slotName, sprite);
    });
  }

  /**
   * Обновление слота装备ления.
   */
  public updateSlot(slotName: string, textureKey: string | null): void {
    const slot = this.slots.get(slotName);
    if (!slot) return;
    
    if (textureKey) {
      slot.texture = ProceduralTextureFactory.getTexture(textureKey);
      slot.visible = true;
    } else {
      slot.visible = false;
    }
  }

  /**
   * Установка позиции для превью (анимация покачивания).
   */
  public setHover(hovered: boolean): void {
    this.targetHoverOffsetX = hovered ? 10 : 0;
    this.targetRotationAngle = hovered ? 0.05 : 0;
  }

  /**
   * Update на основе UITime (плавные анимации интерфейса).
   * Zero-Allocation: никаких new объектов.
   */
  public updateUITime(delta: number): void {
    // Плавное движение к целевой позиции (LERP)
    const lerpSpeed = 5 * delta;
    
    this.hoverOffsetX += (this.targetHoverOffsetX - this.hoverOffsetX) * lerpSpeed;
    this.rotationAngle += (this.targetRotationAngle - this.rotationAngle) * lerpSpeed;
    
    this.baseSprite.x = this.hoverOffsetX;
    this.baseSprite.rotation = this.rotationAngle * Math.sin(Date.now() / 500);
    
    // Обновление всех слотов
    this.slots.forEach((slot) => {
      slot.x = this.hoverOffsetX;
      slot.rotation = this.baseSprite.rotation;
    });
  }

  public destroy(options?: PIXI.DestroyOptions): void {
    this.slots.forEach((sprite) => {
      sprite.destroy(options);
    });
    this.slots.clear();
    
    this.baseSprite.destroy(options);
    super.destroy(options);
  }
}
