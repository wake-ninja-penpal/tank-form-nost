import { IDisposable } from '../core/LayerManager';

/**
 * PauseSystem — управление авто-паузой при потере фокуса (Правило 13).
 * Подписывается на visibilitychange и blur события.
 * Реализует IDisposable для корректной отписки от событий.
 */
export class PauseSystem implements IDisposable {
  private _isPaused: boolean = false;
  private _onPauseCallback: ((paused: boolean) => void) | null = null;

  constructor() {
    this.bindEvents();
  }

  /**
   * Получение текущего состояния паузы
   */
  public get isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Установка callback на изменение состояния паузы
   */
  public set onPauseCallback(callback: ((paused: boolean) => void) | null) {
    this._onPauseCallback = callback;
  }

  /**
   * Привязка событий visibilitychange и blur
   */
  private bindEvents(): void {
    // Обработка сворачивания вкладки / окна
    document.addEventListener('visibilitychange', this.onVisibilityChange, { passive: true });
    
    // Обработка потери фокуса окном
    window.addEventListener('blur', this.onWindowBlur, { passive: true });
    
    // Обработка получения фокуса
    window.addEventListener('focus', this.onWindowFocus, { passive: true });
  }

  /**
   * Обработчик visibilitychange
   */
  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.setPaused(true);
    }
  };

  /**
   * Обработчик blur (потеря фокуса)
   */
  private onWindowBlur = (): void => {
    this.setPaused(true);
  };

  /**
   * Обработчик focus (получение фокуса)
   */
  private onWindowFocus = (): void => {
    // Не снимаем паузу автоматически — игрок должен сам решить
    // Но можно реализовать опциональное авто-снятие
  };

  /**
   * Установка состояния паузы
   */
  private setPaused(paused: boolean): void {
    if (this._isPaused === paused) {
      return;
    }

    this._isPaused = paused;

    if (this._onPauseCallback) {
      this._onPauseCallback(paused);
    }
  }

  /**
   * Принудительная установка паузы извне
   */
  public pause(): void {
    this.setPaused(true);
  }

  /**
   * Принудительное снятие паузы
   */
  public resume(): void {
    this.setPaused(false);
  }

  /**
   * Правило 13: Dispose Pattern — отписка от всех событий
   */
  public dispose(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('focus', this.onWindowFocus);
    this._onPauseCallback = null;
  }
}
