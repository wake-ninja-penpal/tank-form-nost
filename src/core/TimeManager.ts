/**
 * Константы временного шага физики (Правило 4: Fixed Timestep 60 Hz)
 */
export const FIXED_DELTA_TIME = 1 / 60; // 16.666... мс
export const MAX_FRAME_TIME = 0.25; // Максимальный дельта-тайм кадра (защита от спайков)
export const TIME_SCALE_PAUSE = 0.0;
export const TIME_SCALE_TRANSE = 0.25;
export const TIME_SCALE_NORMAL = 1.0;

/**
 * Структура состояния времени
 */
export interface TimeState {
  gameTime: number;        // Игровое время (замедляется в трансе, останавливается в паузе)
  uiTime: number;          // UI время (всегда реальное)
  accumulator: number;     // Накопитель для фиксированного шага
  isPaused: boolean;       // Флаг паузы
  timeScale: number;       // Множитель скорости игры
}

/**
 * TimeManager — управление временем с разделением GameTime и UITime (Правило 10).
 * Реализует фиксированный шаг физики 60 Hz через аккумулятор (Правило 4).
 * Zero-Allocation: никаких новых объектов в update цикле (Правило 11).
 */
export class TimeManager {
  private _gameTime: number = 0;
  private _uiTime: number = 0;
  private _accumulator: number = 0;
  private _isPaused: boolean = false;
  private _timeScale: number = TIME_SCALE_NORMAL;

  /**
   * Получение игрового времени (секунды)
   */
  public get gameTime(): number {
    return this._gameTime;
  }

  /**
   * Получение UI времени (секунды)
   */
  public get uiTime(): number {
    return this._uiTime;
  }

  /**
   * Получение флага паузы
   */
  public get isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Получение текущего таймскейла
   */
  public get timeScale(): number {
    return this._timeScale;
  }

  /**
   * Установка паузы
   */
  public setPaused(paused: boolean): void {
    this._isPaused = paused;
  }

  /**
   * Установка масштаба времени (для транса и других эффектов)
   */
  public setTimeScale(scale: number): void {
    this._timeScale = Math.max(0, scale);
  }

  /**
   * Обновление времени. Вызывается каждый кадр.
   * @param delta - время с последнего кадра в секундах
   * 
   * Zero-Allocation: нет аллокаций внутри метода (Правило 11)
   */
  public update(delta: number): void {
    // Ограничение максимального дельта-тайма (защита от лагов)
    if (delta > MAX_FRAME_TIME) {
      delta = MAX_FRAME_TIME;
    }

    // UI время всегда идёт реально (Правило 10)
    this._uiTime += delta;

    // Если на паузе — gameTime не обновляется
    if (this._isPaused) {
      return;
    }

    // Применяем таймскейл к игровому времени
    const scaledDelta = delta * this._timeScale;
    
    // Добавляем к аккумулятору
    this._accumulator += scaledDelta;

    // Выполняем фиксированные шаги физики пока есть накопленное время
    while (this._accumulator >= FIXED_DELTA_TIME) {
      this._gameTime += FIXED_DELTA_TIME;
      this._accumulator -= FIXED_DELTA_TIME;
      
      // Вызов callback фиксированного обновления (если установлен)
      if (this.onFixedUpdate) {
        this.onFixedUpdate(FIXED_DELTA_TIME);
      }
    }
  }

  /**
   * Callback для фиксированного обновления физики
   * Вызывается с шагом FIXED_DELTA_TIME (16.6 мс)
   */
  public onFixedUpdate: ((fixedDelta: number) => void) | null = null;

  /**
   * Сброс времени (для нового забега)
   */
  public reset(): void {
    this._gameTime = 0;
    this._uiTime = 0;
    this._accumulator = 0;
    this._isPaused = false;
    this._timeScale = TIME_SCALE_NORMAL;
  }

  /**
   * Правило 13: Dispose Pattern (хотя здесь ресурсов нет, но для консистентности)
   */
  public dispose(): void {
    this.onFixedUpdate = null;
  }
}
