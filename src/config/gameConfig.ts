/**
 * Конфигурация игры "СТАЛЬНОЙ РУБЕЖ"
 * Единый источник истины для всех магических чисел, балансов и путей.
 */

export const GAME_CONFIG = {
  // Рендер
  render: {
    preference: 'webgl' as const,
    pixelArtScale: 1,
    spriteSize: 32,
  },
  
  // Время (Fixed Timestep)
  time: {
    fixedDelta: 1 / 60, // 16.6мс
    maxAccumulator: 0.25, // Защита от спирали смерти
  },
  
  // Аудио
  audio: {
    poolSize: 16,
    lowPassFrequency: 800, // Hz для режима "Боевой Транс"
    masterVolume: 0.7,
  },
  
  // Гараж
  garage: {
    slotsCount: 7,
    tankPreviewScale: 2,
    virtualScrollItemHeight: 60,
    visibleItemsCount: 5,
  },
  
  // Пулы объектов
  pools: {
    bullets: 50,
    particles: 100,
    enemies: 20,
    maxFloatingTexts: 20,
  },
  
  // Сетка карты
  grid: {
    width: 13,
    height: 13,
    tileSize: 40,
  },
  
  // Физика
  physics: {
    speedFactor: 1.0,
    entitySize: 40, // Хитбокс 40x40 px
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
