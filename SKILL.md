---
name: pixi-game-developer
description: Скилл для профессиональной разработки 2D-игр на Pixi.js (v8+). Гарантирует архитектурную чистоту, отсутствие дублирования (DRY), оптимальную производительность (60 FPS), следование SOLID и применение игровых паттернов проектирования.
version: 1.0.0
author: Lead Game Developer
tools_required:
  - bash
  - file_writer
---

# Pixi.js Architecture, Clean Code & Game Design Patterns Skill

## Overview
Данный скилл обязывает агента разрабатывать 2D-игры на **Pixi.js (v8+)** с использованием **TypeScript** по строгим стандартам GameDev. Код должен быть модульным, готовым к масштабированию, защищенным от утечек памяти (Memory Leaks) и оптимизированным под Garbage Collector (GC).

---

## Architectural Principles & Rules

### 1. Game Architecture & Project Structure
- **Изоляция сцен (Scene Management):** Никакой игровой логики в точке входа (`index.ts`). Каждая сцена — изолированный класс, наследуемый от `PIXI.Container`.
- **Разделение ответственности (Separation of Concerns):** 
  - `Core/` — менеджеры сцен, ресурсов, звука, ввода.
  - `Entities/` — игровые объекты (Player, Enemy, Bullet), инкапсулирующие свою визуализацию и состояние.
  - `Systems/` — глобальные системы (Physics, Collision, Score, Sound).
  - `UI/` — интерфейсы (HUD, Меню, Пауза), отделенные от игровой логики.
- **Единый источник конфигурации:** Запрещены «магические числа» (координаты, скорость, здоровье, пути к ассетам). Все параметры хранятся в `src/config/gameConfig.ts`.

### 2. Design Patterns to Apply
- **Object Pool Pattern:** **Обязателен** для всех часто создаваемых/уничтожаемых объектов (снаряды, частицы, враги, монеты). Запрещено делать `new` и `destroy()` во время игрового цикла.
- **State Machine (FSM):** Обязательна для управления состояниями игры (Boot, Menu, Playing, GameOver) и состояниями сущностей (Idle, Run, Attack, Die).
- **Factory Pattern:** Использовать для спавна игровых сущностей и создания UI-элементов (`EntityFactory`, `UIFactory`).
- **Observer / Event Emitter Pattern:** Компоненты и UI общаются между собой **только через события** (`PIXI.EventEmitter` или ваш `EventBus`). UI никогда не держит прямую ссылку на игровую сцену.
- **Component / ECS System:** Для сложного поведения сущностей использовать компонентный подход (например, добавление `HealthComponent`, `MovementComponent` к контейнерам).

### 3. Performance & Memory Management (Pixi.js Best Practices)
- **Garbage Collection Optimization:** Внутри метода `update(delta)` **запрещено** создавать новые объекты (`new PIXI.Point()`, `new Array()`, `{}`). Используйте повторно выделенную память.
- **Очистка ресурсов (Memory Leak Prevention):** Все классы сущностей и сцен ДОЛЖНЫ реализовывать метод `destroy()`. Обязательно отписываться от событий (`off()`), останавливать тикеры и вызывать `super.destroy({ children: true, texture: false })`.
- **Render Optimization:** 
  - Для массовых статичных/динамичных объектов использовать `ParticleContainer` или `Spritesheet` / `TextureAtlas`.
  - Избегать частой перерисовки `PIXI.Graphics` в тикре — преобразовывать их в текстуры (`app.renderer.generateTexture()`).

### 4. Component Cleanliness & Limits
- **Максимум 150 строк на файл:** Если сущность или сцена превышает 150–200 строк, разбей её на системы, кастомные компоненты или вынеси логику в паттерн State.
- **Чистый Ticker Loop:** Основной игровой цикл сцены содержит **только** вызовы `update(delta)` у подсистем и сущностей. Никакой прямой математики или условий в самом цикле.
- **TypeScript Strictness:** Никаких `any`. Все события, ассеты, конфигурации и сущности строго типизированы через `interface` / `type` / `enum`.

---

## Refactoring Workflow (Обязательный чек-лист перед завершением задачи)

Перед выдачей кода агент ДОЛЖЕН выполнить самоаудит:

1. **Проверка Ticker (`update`):** Создаются ли внутри игрового цикла новые объекты через `new`? (Если да — переписать на переиспользование/Object Pool).
2. **Проверка утечек памяти:** Очищаются ли подписки на события и дочерние элементы при уничтожении сцены/сущности в `destroy()`?
3. **Проверка на хардкод:** Вынесены ли все размеры, настройки баланса, пути к текстурам и ключи событий в `gameConfig.ts` или перечисления?
4. **Проверка размера и паттернов:** Разделены ли логика и отображение? Общается ли UI с игрой через события? Не превышает ли файл 150 строк?

---

## Code Example: Good vs Bad

❌ **BAD (Спагетти, утечки памяти, хардкод, создание объектов в тикре):**
```typescript
// index.ts — Все в одном файле, 300+ строк
const app = new PIXI.Application();
let bullets = [];

app.ticker.add(() => {
  // ❌ Хардкод скорости и создание объекта прямо в тикре
  if (keys['Space']) {
    const bullet = new PIXI.Sprite(PIXI.Texture.from('bullet.png')); // GC плачет
    bullet.x = player.x + 10; // Хардкод смещения
    app.stage.addChild(bullet);
    bullets.push(bullet);
  }
  
  // ❌ Логика, физика и удаление без очистки памяти прямо тут
  bullets.forEach((b, index) => {
    b.y -= 5;
    if (b.y < 0) {
      app.stage.removeChild(b); // ❌ Забыли вызвать destroy(), текстура и объект зависли в памяти
      bullets.splice(index, 1);
    }
  });
});

✅ GOOD (Архитектура, Object Pool, события, чистый код):

src/config/gameConfig.ts

TypeScript
export const GAME_CONFIG = {
  bullet: {
    speed: 12,
    offsetY: -20,
    poolSize: 30,
  },
} as const;
src/entities/BulletPool.ts

TypeScript
import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet';
import { GAME_CONFIG } from '../config/gameConfig';

// ✅ Переиспользование объектов без нагрузки на GC
export class BulletPool {
  private pool: Bullet[] = [];

  constructor(texture: PIXI.Texture) {
    for (let i = 0; i < GAME_CONFIG.bullet.poolSize; i++) {
      const bullet = new Bullet(texture);
      bullet.visible = false;
      this.pool.push(bullet);
    }
  }

  public get(x: number, y: number): Bullet | null {
    const bullet = this.pool.find((b) => !b.visible);
    if (bullet) {
      bullet.spawn(x, y + GAME_CONFIG.bullet.offsetY);
    }
    return bullet || null;
  }
}
src/scenes/GameScene.ts

TypeScript
import * as PIXI from 'pixi.js';
import { Scene } from '../core/Scene';
import { Player } from '../entities/Player';
import { BulletPool } from '../entities/BulletPool';

// ✅ Чистая сцена до 100 строк, разделение ответственности
export class GameScene extends Scene {
  private player!: Player;
  private bulletPool!: BulletPool;

  public async init(): Promise<void> {
    // Инициализация компонентов
  }

  public update(delta: number): void {
    // ✅ Короткий тикер, делегирование обновления
    this.player.update(delta);
    this.updateBullets(delta);
  }

  private updateBullets(delta: number): void {
    // Логика обновления только активных пуль из пула
  }

  public destroy(): void {
    // ✅ Полная очистка ресурсов при смене сцены
    super.destroy({ children: true });
  }
}
