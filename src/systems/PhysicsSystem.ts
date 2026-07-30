import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { MapGridSystem, Faction, COLLISION_MATRIX } from './MapGridSystem';

export interface IPhysicsEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  faction: Faction;
  isSolid: boolean; // Может ли толкать другие объекты
  onCollide?: (other: IPhysicsEntity, normal: PIXI.Point) => void;
}

/**
 * Физическая система на базе Fixed Swept AABB.
 * Работает строго в fixedUpdate с шагом 16.6мс.
 * Zero-Allocation: переиспользует объекты Point для расчетов.
 */
export class PhysicsSystem {
  private entities: IPhysicsEntity[] = [];
  // Переиспользуемые объекты для Zero-Allocation
  private tempNormal: PIXI.Point;
  private tempNextPos: PIXI.Point;

  constructor(private grid: MapGridSystem) {
    this.tempNormal = new PIXI.Point();
    this.tempNextPos = new PIXI.Point();
  }

  public addEntity(entity: IPhysicsEntity): void {
    this.entities.push(entity);
  }

  public removeEntity(entity: IPhysicsEntity): void {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      // Swap with last for O(1) removal without allocation
      this.entities[idx] = this.entities[this.entities.length - 1];
      this.entities.pop();
    }
  }

  /**
   * Основной цикл физики. Вызывается из TimeManager.fixedUpdate.
   * @param fixedDelta Фиксированный шаг времени (обычно 1.0 при 60fps логике)
   */
  public fixedUpdate(fixedDelta: number): void {
    const speedScale = fixedDelta * GAME_CONFIG.physics.speedFactor;

    // 1. Движение и коллизии с картой
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      
      // Применяем скорость
      this.tempNextPos.x = entity.x + entity.vx * speedScale;
      this.tempNextPos.y = entity.y + entity.vy * speedScale;

      // Swept AABB против сетки
      this.resolveMapCollisions(entity, this.tempNextPos.x, this.tempNextPos.y);
    }

    // 2. Коллизии между объектами (Entity vs Entity)
    // Используем простую пару N^2, так как объектов пока мало (<50)
    // Для оптимизации можно добавить Spatial Hash позже
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const A = this.entities[i];
        const B = this.entities[j];

        // Проверка матрицы фракций
        if (!COLLISION_MATRIX[A.faction][B.faction]) {
          continue;
        }

        // Быстрая проверка AABB
        if (this.checkAABB(A, B)) {
          this.resolveEntityCollision(A, B);
        }
      }
    }
  }

  private checkAABB(a: IPhysicsEntity, b: IPhysicsEntity): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private resolveMapCollisions(entity: IPhysicsEntity, nextX: number, nextY: number): void {
    const ts = this.grid.tileSize;
    
    // Проверяем углы хитбокса 40x40
    // Хитбокс сущности обычно 40x40, но спрайт может быть 32x32 по центру
    const left = Math.floor(nextX / ts);
    const right = Math.floor((nextX + entity.width - 0.01) / ts);
    const top = Math.floor(nextY / ts);
    const bottom = Math.floor((nextY + entity.height - 0.01) / ts);

    let collided = false;

    // Проверка по X
    if (entity.vx !== 0) {
      for (let y = top; y <= bottom; y++) {
        for (let x = (entity.vx > 0 ? right : left); x <= (entity.vx > 0 ? right : left); x++) {
          if (this.grid.isSolid(x, y)) {
            collided = true;
            // Соскальзывание: обнуляем скорость и ставим вплотную
            if (entity.vx > 0) {
              entity.x = x * ts - entity.width;
            } else {
              entity.x = (x + 1) * ts;
            }
            entity.vx = 0;
            break;
          }
        }
        if (collided) break;
      }
    }

    // Если по X не врезались, применяем движение X
    if (!collided) {
      entity.x = nextX;
    } else {
      collided = false; // Сброс для проверки Y
    }

    // Проверка по Y
    if (entity.vy !== 0) {
      // Пересчитываем границы после движения по X
      const curLeft = Math.floor(entity.x / ts);
      const curRight = Math.floor((entity.x + entity.width - 0.01) / ts);
      const curTop = Math.floor(nextY / ts);
      const curBottom = Math.floor((nextY + entity.height - 0.01) / ts);

      for (let x = curLeft; x <= curRight; x++) {
        for (let y = (entity.vy > 0 ? curBottom : curTop); y <= (entity.vy > 0 ? curBottom : curTop); y++) {
          if (this.grid.isSolid(x, y)) {
            collided = true;
            if (entity.vy > 0) {
              entity.y = y * ts - entity.height;
            } else {
              entity.y = (y + 1) * ts;
            }
            entity.vy = 0;
            break;
          }
        }
        if (collided) break;
      }
    }

    if (!collided) {
      entity.y = nextY;
    }
    
    // Ограничение мира
    const maxW = this.grid.width * ts;
    const maxH = this.grid.height * ts;
    if (entity.x < 0) { entity.x = 0; entity.vx = 0; }
    if (entity.y < 0) { entity.y = 0; entity.vy = 0; }
    if (entity.x + entity.width > maxW) { entity.x = maxW - entity.width; entity.vx = 0; }
    if (entity.y + entity.height > maxH) { entity.y = maxH - entity.height; entity.vy = 0; }
  }

  private resolveEntityCollision(A: IPhysicsEntity, B: IPhysicsEntity): void {
    // Простейшее разрешение: раздвигаем по кратчайшей оси
    const cxA = A.x + A.width / 2;
    const cyA = A.y + A.height / 2;
    const cxB = B.x + B.width / 2;
    const cyB = B.y + B.height / 2;

    const dx = cxA - cxB;
    const dy = cyA - cyB;
    const overlapX = (A.width + B.width) / 2 - Math.abs(dx);
    const overlapY = (A.height + B.height) / 2 - Math.abs(dy);

    if (overlapX < overlapY) {
      // Раздел по X
      const normal = dx > 0 ? 1 : -1;
      if (A.isSolid && B.isSolid) {
        A.x += overlapX / 2 * normal;
        B.x -= overlapX / 2 * normal;
      } else if (A.isSolid) {
        B.x -= overlapX * normal;
      } else {
        A.x += overlapX * normal;
      }
      
      // Обнуляем относительную скорость по X
      if (A.vx * normal > B.vx * normal) {
         // Упрощенно: просто гасим
         const temp = A.vx; A.vx = B.vx; B.vx = temp; 
      }
    } else {
      // Раздел по Y
      const normal = dy > 0 ? 1 : -1;
      if (A.isSolid && B.isSolid) {
        A.y += overlapY / 2 * normal;
        B.y -= overlapY / 2 * normal;
      } else if (A.isSolid) {
        B.y -= overlapY * normal;
      } else {
        A.y += overlapY * normal;
      }
      
      if (A.vy * normal > B.vy * normal) {
         const temp = A.vy; A.vy = B.vy; B.vy = temp;
      }
    }

    if (A.onCollide) A.onCollide(B, this.tempNormal);
    if (B.onCollide) B.onCollide(A, this.tempNormal);
  }

  public destroy(): void {
    this.entities.length = 0;
  }
}
