import * as PIXI from 'pixi.js';

/**
 * Базовая кнопка для UI на PixiJS.
 * Использует процедурные текстуры и не создает новых объектов в update.
 */
export class UIButton extends PIXI.Container {
  private bg: PIXI.Graphics;
  private text: PIXI.Text;
  private isHovered = false;
  private isPressed = false;
  
  private onClickCallback?: () => void;

  constructor(label: string, width: number = 120, height: number = 40) {
    super();
    
    this.bg = new PIXI.Graphics();
    this.addChild(this.bg);

    this.text = new PIXI.Text(label, {
      fontFamily: 'monospace',
      fontSize: 16,
      fill: 0xffffff,
      dropShadow: {
        color: 0x000000,
        blur: 2,
        angle: Math.PI / 4,
        distance: 2,
        alpha: 0.8,
      },
    });
    this.text.anchor.set(0.5);
    this.addChild(this.text);

    this.width = width;
    this.height = height;
    this.text.x = width / 2;
    this.text.y = height / 2 + 2;

    this.drawBg();
    this.setupInteractions();
  }

  private drawBg(): void {
    this.bg.clear();
    this.bg.beginFill(this.isPressed ? 0x5a5a5a : (this.isHovered ? 0x7a7a7a : 0x4a4a4a));
    this.bg.lineStyle(2, 0x9a9a9a);
    this.bg.drawRect(0, 0, this.width, this.height);
    this.bg.endFill();
  }

  private setupInteractions(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', () => {
      this.isHovered = true;
      this.drawBg();
    });

    this.on('pointerout', () => {
      this.isHovered = false;
      this.isPressed = false;
      this.drawBg();
    });

    this.on('pointerdown', () => {
      this.isPressed = true;
      this.drawBg();
    });

    this.on('pointerup', () => {
      this.isPressed = false;
      this.drawBg();
      if (this.onClickCallback) {
        this.onClickCallback();
      }
    });

    this.on('pointerupoutside', () => {
      this.isPressed = false;
      this.drawBg();
    });
  }

  public setText(label: string): void {
    this.text.text = label;
  }

  public onClick(callback: () => void): void {
    this.onClickCallback = callback;
  }

  public destroy(options?: PIXI.DestroyOptions): void {
    this.off('pointerover');
    this.off('pointerout');
    this.off('pointerdown');
    this.off('pointerup');
    this.off('pointerupoutside');
    super.destroy(options);
  }
}
