import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Тип для аудио-канала в пуле.
 */
interface AudioChannel {
  oscillator: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  isPlaying: boolean;
}

/**
 * Синтезатор звуков с использованием Web Audio API.
 * Реализует Object Pool Pattern для OscillatorNode.
 * Поддерживает Low-Pass фильтр для режима "Боевой Транс".
 */
export class SoundSynth {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private pool: AudioChannel[] = [];
  private isInitialized = false;
  private isCombatMode = false; // Режим "Боевой Транс"

  /**
   * Инициализация аудио-контекста (требует взаимодействия пользователя).
   */
  public init(): void {
    if (this.isInitialized) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      console.warn('Web Audio API not supported');
      return;
    }

    this.audioContext = new AudioCtx();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = GAME_CONFIG.audio.masterVolume;

    // Low-Pass фильтр для всего микса
    this.lowPassFilter = this.audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = GAME_CONFIG.audio.lowPassFrequency;
    this.lowPassFilter.Q.value = 1;

    // Цепочка: Master -> LowPass -> Destination
    this.masterGain.connect(this.lowPassFilter);
    this.lowPassFilter.connect(this.audioContext.destination);

    // Создание пула каналов
    for (let i = 0; i < GAME_CONFIG.audio.poolSize; i++) {
      this.pool.push(this.createChannel());
    }

    this.isInitialized = true;
  }

  /**
   * Создание одного аудио-канала.
   */
  private createChannel(): AudioChannel {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator.type = 'square';
    oscillator.frequency.value = 440;
    gain.gain.value = 0;
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    // Цепочка: Osc -> Filter -> Gain -> Master
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    oscillator.start();

    return { oscillator, gain, filter, isPlaying: false };
  }

  /**
   * Воспроизведение звука с заданными параметрами.
   * @param frequency Частота в Hz
   * @param duration Длительность в секундах
   * @param type Тип волны ('square', 'sine', 'triangle', 'sawtooth')
   */
  public play(frequency: number, duration: number, type: OscillatorType = 'square'): void {
    if (!this.isInitialized) {
      this.init();
    }
    if (!this.audioContext) return;

    // Разблокировка контекста если suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Поиск свободного канала
    const channel = this.pool.find((ch) => !ch.isPlaying);
    if (!channel) {
      console.warn('AudioPool exhausted');
      return;
    }

    // Настройка канала
    channel.oscillator.type = type;
    channel.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    // Применение Combat Mode фильтра
    if (this.isCombatMode) {
      channel.filter.frequency.value = GAME_CONFIG.audio.lowPassFrequency;
    } else {
      channel.filter.frequency.value = 5000; // Полный спектр
    }

    // ADSR огибающая
    const now = this.audioContext.currentTime;
    channel.gain.gain.cancelScheduledValues(now);
    channel.gain.gain.setValueAtTime(0, now);
    channel.gain.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    channel.gain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay

    channel.isPlaying = true;

    // Освобождение канала по окончанию
    channel.oscillator.onended = () => {
      channel.isPlaying = false;
    };

    channel.oscillator.stop(now + duration);
  }

  /**
   * Включение/выключение режима "Боевой Транс" (Low-Pass фильтр).
   */
  public setCombatMode(enabled: boolean): void {
    this.isCombatMode = enabled;
    if (this.lowPassFilter && this.audioContext) {
      const now = this.audioContext.currentTime;
      const targetFreq = enabled 
        ? GAME_CONFIG.audio.lowPassFrequency 
        : 20000; // Full range
      
      this.lowPassFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
    }
  }

  /**
   * Полная остановка всех звуков.
   */
  public stopAll(): void {
    if (!this.audioContext) return;
    
    this.pool.forEach((channel) => {
      channel.gain.gain.cancelScheduledValues(this.audioContext!.currentTime);
      channel.gain.gain.setTargetAtTime(0, this.audioContext!.currentTime, 0.01);
      channel.isPlaying = false;
    });
  }

  /**
   * Очистка ресурсов.
   */
  public destroy(): void {
    this.stopAll();
    
    this.pool.forEach((channel) => {
      channel.oscillator.disconnect();
      channel.gain.disconnect();
      channel.filter.disconnect();
    });
    this.pool = [];

    if (this.lowPassFilter) {
      this.lowPassFilter.disconnect();
      this.lowPassFilter = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}

// Экспорт синглтона
export const soundSynth = new SoundSynth();
