export const GAME_CONFIG = {
  render: {
    preference: 'webgl' as const,
    pixelArtScale: 1,
    spriteSize: 32,
  },
  ui: {
    fontName: 'steelFont',
  },
  time: {
    fixedDelta: 16.67,
    maxAccumulator: 0.25,
  },
  physics: {
    entitySize: 40,
    playerSpeed: 0.15,
    bulletSpeed: 12,
    speedFactor: 1.0,
  },
  map: {
    width: 13,
    height: 13,
    tileSize: 40,
    baseX: 6,
    baseY: 12,
    grid: { width: 13, height: 13 },
  },
  waves: {
    baseEnemyCount: 5,
    difficultyMultiplier: 0.5,
    baseSpawnInterval: 1000,
    bossEveryNWaves: 5,
  },
  juice: {
    shakeIntensity: 10,
    shakeDuration: 300,
    hitStopDuration: 50,
  },
  garage: {
    tankPreviewScale: 2,
  },
  audio: {
    poolSize: 16,
    masterVolume: 0.5,
    lowPassFreq: 800,
    lowPassFrequency: 800,
  },
  screen: {
    width: 800,
    height: 600,
  },
} as const;
