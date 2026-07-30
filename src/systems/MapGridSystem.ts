import { GAME_CONFIG } from '../config/gameConfig';

export enum TileType {
  EMPTY = 0,
  BRICK = 1,      // Разрушаемый (1 HP)
  STEEL = 2,      // Вечная сталь
  BASE = 3,       // База (Game Over при разрушении)
  WATER = 4,      // Вода (снаряды летят над ней)
}

export enum Faction {
  NONE = 0,
  PLAYER = 1,
  ENEMY = 2,
  NEUTRAL = 3,
}

// Матрица коллизий: [FactionA][FactionB] = true/false
// Игрок не сталкивается со своими пулями, Враг не сталкивается со своими
export const COLLISION_MATRIX: Record<Faction, Record<Faction, boolean>> = {
  [Faction.NONE]: {
    [Faction.NONE]: false,
    [Faction.PLAYER]: false,
    [Faction.ENEMY]: false,
    [Faction.NEUTRAL]: false,
  },
  [Faction.PLAYER]: {
    [Faction.NONE]: false,
    [Faction.PLAYER]: false, // Игрок не толкает игрока
    [Faction.ENEMY]: true,   // Игрок таранит врага
    [Faction.NEUTRAL]: true,
  },
  [Faction.ENEMY]: {
    [Faction.NONE]: false,
    [Faction.PLAYER]: true,
    [Faction.ENEMY]: false,  // Враги не толкают друг друга (можно изменить)
    [Faction.NEUTRAL]: true,
  },
  [Faction.NEUTRAL]: {
    [Faction.NONE]: false,
    [Faction.PLAYER]: true,
    [Faction.ENEMY]: true,
    [Faction.NEUTRAL]: false,
  },
};

export interface GridCell {
  type: TileType;
  hp: number;
  faction?: Faction; // Для динамических объектов на сетке (турели и т.д.)
}

/**
 * Система карты 13x13.
 * Логический размер: 520x520px (13 * 40).
 */
export class MapGridSystem {
  public readonly width: number = GAME_CONFIG.grid.width;
  public readonly height: number = GAME_CONFIG.grid.height;
  public readonly tileSize: number = GAME_CONFIG.grid.tileSize;
  
  // Одномерный массив для производительности (cache friendly)
  private grid: GridCell[];

  constructor() {
    this.grid = new Array(this.width * this.height);
    this.initGrid();
  }

  private initGrid(): void {
    // Заполняем пустотой
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = { type: TileType.EMPTY, hp: 0 };
    }

    // Генерация простой тестовой карты
    // Границы - сталь
    for (let x = 0; x < this.width; x++) {
      this.setTile(x, 0, TileType.STEEL, 999);
      this.setTile(x, this.height - 1, TileType.STEEL, 999);
    }
    for (let y = 0; y < this.height; y++) {
      this.setTile(0, y, TileType.STEEL, 999);
      this.setTile(this.width - 1, y, TileType.STEEL, 999);
    }

    // База в [12][6] (справа по центру, как в ТЗ) или классическая внизу?
    // ТЗ говорит [12][6]. Сделаем там.
    this.setTile(12, 6, TileType.BASE, 1);

    // Несколько кирпичей для теста
    this.setTile(5, 5, TileType.BRICK, 1);
    this.setTile(6, 5, TileType.BRICK, 1);
    this.setTile(5, 6, TileType.BRICK, 1);
    this.setTile(6, 6, TileType.BRICK, 1);
    
    // Стена посередине
    for(let i=2; i<11; i++) {
        if(i !== 6) this.setTile(8, i, TileType.BRICK, 1);
    }
  }

  public getTile(x: number, y: number): GridCell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.grid[y * this.width + x];
  }

  public setTile(x: number, y: number, type: TileType, hp: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const index = y * this.width + x;
    const cell = this.grid[index];
    cell.type = type;
    cell.hp = hp;
  }

  public damageTile(x: number, y: number, damage: number): boolean {
    const cell = this.getTile(x, y);
    if (!cell || cell.type === TileType.EMPTY || cell.type === TileType.STEEL) {
      return false;
    }

    cell.hp -= damage;
    if (cell.hp <= 0) {
      cell.type = TileType.EMPTY;
      cell.hp = 0;
      return true; // Разрушено
    }
    return false; // Просто повреждено
  }

  public isSolid(x: number, y: number): boolean {
    const cell = this.getTile(x, y);
    if (!cell) return true; // Границы мира твердые
    return cell.type === TileType.BRICK || cell.type === TileType.STEEL || cell.type === TileType.BASE;
  }

  public getBaseCell(): GridCell | null {
    return this.getTile(12, 6);
  }

  public destroy(): void {
    this.grid.length = 0;
  }
}
