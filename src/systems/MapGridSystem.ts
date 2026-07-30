import { GAME_CONFIG } from '../config/gameConfig';

export enum TileType {
  EMPTY = 0,
  BRICK = 1,
  STEEL = 2,
  BASE = 3,
  WATER = 4,
}

export enum Faction {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY',
  NEUTRAL = 'NEUTRAL',
}

export interface TileData {
  type: TileType;
  hp: number;
  destructible: boolean;
}

/**
 * Система карты 13×13.
 * Клетка 40×40, логический буфер 520×520px.
 */
export class MapGridSystem {
  private grid: TileData[][];
  public readonly width: number;
  public readonly height: number;
  public readonly tileSize: number;

  constructor() {
    this.width = GAME_CONFIG.map.width;
    this.height = GAME_CONFIG.map.height;
    this.tileSize = GAME_CONFIG.map.tileSize;
    
    // Инициализация сетки
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: TileData[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({ type: TileType.EMPTY, hp: 0, destructible: false });
      }
      this.grid.push(row);
    }

    // Генерация тестовой карты
    this.generateTestMap();
  }

  private generateTestMap(): void {
    // Границы - сталь
    for (let x = 0; x < this.width; x++) {
      this.setTile(x, 0, TileType.STEEL);
      this.setTile(x, this.height - 1, TileType.STEEL);
    }
    for (let y = 0; y < this.height; y++) {
      this.setTile(0, y, TileType.STEEL);
      this.setTile(this.width - 1, y, TileType.STEEL);
    }

    // База в [12][6]
    this.setTile(6, 12, TileType.BASE);

    // Несколько кирпичных стен
    for (let i = 2; i < 5; i++) {
      this.setTile(i, 5, TileType.BRICK);
      this.setTile(i, 6, TileType.BRICK);
    }

    for (let i = 8; i < 11; i++) {
      this.setTile(i, 7, TileType.BRICK);
    }
  }

  public getTile(x: number, y: number): TileData | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.grid[y][x];
  }

  public setTile(x: number, y: number, type: TileType): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const tile = this.grid[y][x];
    tile.type = type;
    
    switch (type) {
      case TileType.BRICK:
        tile.hp = 1;
        tile.destructible = true;
        break;
      case TileType.BASE:
        tile.hp = 1;
        tile.destructible = true;
        break;
      case TileType.STEEL:
        tile.hp = 999;
        tile.destructible = false;
        break;
      case TileType.WATER:
        tile.hp = 0;
        tile.destructible = false;
        break;
      default:
        tile.hp = 0;
        tile.destructible = false;
    }
  }

  public damageTile(x: number, y: number, damage: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.destructible) return false;

    tile.hp -= damage;
    if (tile.hp <= 0) {
      this.setTile(x, y, TileType.EMPTY);
      return true;
    }
    return false;
  }

  public isSolid(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return true; // За пределами карты - твердо
    
    return tile.type === TileType.STEEL || 
           tile.type === TileType.BRICK || 
           tile.type === TileType.BASE ||
           tile.type === TileType.WATER;
  }

  public getBasePosition(): { x: number; y: number } {
    return { x: GAME_CONFIG.map.baseX, y: GAME_CONFIG.map.baseY };
  }

  public destroy(): void {
    this.grid.length = 0;
  }
}

export const COLLISION_MATRIX: Record<Faction, Record<Faction, boolean>> = {
  [Faction.PLAYER]: {
    [Faction.PLAYER]: false,
    [Faction.ENEMY]: true,
    [Faction.NEUTRAL]: false,
  },
  [Faction.ENEMY]: {
    [Faction.PLAYER]: true,
    [Faction.ENEMY]: false,
    [Faction.NEUTRAL]: false,
  },
  [Faction.NEUTRAL]: {
    [Faction.PLAYER]: false,
    [Faction.ENEMY]: false,
    [Faction.NEUTRAL]: false,
  },
};
