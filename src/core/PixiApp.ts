import { Application, type RendererPreference } from 'pixi.js';

/**
 * Конфигурация PixiJS Application с учётом 14 Золотых Правил:
 * - Правило 1: WebGL preference + CanvasSource API v8
 * - Правило 5: Retina DPI + autoDensity
 */
export interface AppInitOptions {
  width: number;
  height: number;
  backgroundColor: number;
  antialias?: boolean;
}

export async function createPixiApplication(options: AppInitOptions): Promise<Application> {
  const app = new Application();
  
  const initOptions = {
    width: options.width,
    height: options.height,
    backgroundColor: options.backgroundColor,
    antialias: options.antialias ?? false,
    // Правило 1: WebGL preference для совместимости
    preference: 'webgl' as RendererPreference,
    // Правило 5: Retina DPI чёткость
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    // PixiJS v8 использует CanvasSource по умолчанию
  };

  await app.init(initOptions);
  
  return app;
}
