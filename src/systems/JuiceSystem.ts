import * as PIXI from 'pixi.js';

/**
 * Интерфейс для объектов, поддерживающих эффект мигания при попадании.
 */
export interface IFlashable {
  tint: number;
  alpha: number;
}

/**
 * Система "Game Juice": Screen Shake, Hit Stop, Flash.
 * Zero-Allocation: все вычисления производятся без создания новых объектов в цикле.
 */
export class JuiceSystem {
  private app: PIXI.Application;
  
  // Screen Shake параметры
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;
  
  // Hit Stop параметры
  private hitStopTime: number = 0; // оставшееся время заморозки в мс
  
  // Пул частиц (упрощенно)
  private particles: PIXI.Sprite[] = [];
  private particlePool: PIXI.Sprite[] = [];
  
  // Пул всплывающего текста
  private floatingTexts: PIXI.BitmapText[] = [];
  private textPool: PIXI.BitmapText[] = [];

  constructor(app: PIXI.Application) {
    this.app = app;
  }

  /**
   * Активация тряски экрана.
   * @param intensity Сила тряски (в пикселях смещения)
   */
  public startShake(intensity: number): void {
    if (intensity > this.shakeIntensity) {
      this.shakeIntensity = intensity;
    }
  }

  /**
   * Активация Hit Stop (заморозка времени).
   * @param durationMs Длительность в миллисекундах (30-50мс обычно)
   */
  public triggerHitStop(durationMs: number): void {
    if (durationMs > this.hitStopTime) {
      this.hitStopTime = durationMs;
    }
  }

  /**
   * Эффект мигания для спрайта.
   */
  public flashSprite(sprite: IFlashable): void {
    sprite.tint = 0xFFFFFF;
  }

  /**
   * Создание всплывающего текста (урон, очки).
   * Использует Object Pool.
   */
  public showFloatingText(text: string, x: number, y: number, color: number = 0xFFFFFF): void {
    // Пока заглушка - BitmapFont будет добавлен позже
    // Используем обычный PIXI.Text для совместимости
    const txt = new PIXI.Text(text, {
      fontSize: 24,
      fill: color,
      fontFamily: 'monospace',
    });
    txt.x = x;
    txt.y = y;
    txt.anchor.set(0.5);
    this.floatingTexts.push(txt as any);
    this.app.stage.addChild(txt);
  }

  /**
   * Обновление системы. Вызывается каждый кадр (render), а не fixedUpdate.
   * @param deltaMS Время с прошлого кадра в миллисекундах
   */
  public update(deltaMS: number): void {
    // 1. Обработка Hit Stop
    if (this.hitStopTime > 0) {
      this.hitStopTime -= deltaMS;
      
      // Если хитстоп активен, мы НЕ обновляем логику, но рендер идет.
      // Возвращаем сразу, чтобы пропустить тряску и частицы (эффект заморозки)
      if (this.hitStopTime > 0) return;
      this.hitStopTime = 0;
    }

    // 2. Screen Shake
    if (this.shakeIntensity > 0.5) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      
      this.app.stage.x = dx;
      this.app.stage.y = dy;

      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
      this.app.stage.x = 0;
      this.app.stage.y = 0;
    }

    // 3. Обновление всплывающего текста (простая анимация вверх + fade)
    // Идем с конца, чтобы безопасно удалять
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.y -= 1.0; // Скорость подъема
      txt.alpha -= 0.02;

      if (txt.alpha <= 0) {
        txt.visible = false;
        this.app.stage.removeChild(txt);
        this.textPool.push(txt);
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /**
   * Сброс состояния (при паузе или смене сцены).
   */
  public reset(): void {
    this.shakeIntensity = 0;
    this.hitStopTime = 0;
    this.app.stage.x = 0;
    this.app.stage.y = 0;
  }

  public destroy(): void {
    this.reset();
    // Очистка пулов
    for (const txt of this.textPool) {
      txt.destroy({ children: true });
    }
    this.textPool.length = 0;
    this.floatingTexts.length = 0;
    
    for (const p of this.particlePool) {
      p.destroy({ children: true });
    }
    this.particlePool.length = 0;
    this.particles.length = 0;
  }
}
