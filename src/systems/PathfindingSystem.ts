import { GAME_CONFIG } from '../config/gameConfig';
import { MapGridSystem, TileType } from './MapGridSystem';

/**
 * Node for A* pathfinding
 */
interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

/**
 * Pathfinding System with A* and Instant Evade logic
 * Follows Zero-Allocation: reuses arrays, no new objects in update
 */
export class PathfindingSystem {
  private gridWidth: number;
  private gridHeight: number;
  private openSet: PathNode[] = [];
  private closedSet: boolean[][];
  private nodePool: PathNode[] = [];
  private lastRecalcTime: number = 0;
  private recalcInterval: number = 500; // 2-3 times per second max
  private mapGrid: MapGridSystem | null = null;

  // Pre-allocated directions
  private readonly directions = [
    { x: 0, y: -1 }, // Up
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }, // Left
    { x: 1, y: 0 },  // Right
  ];

  constructor(gridWidth: number, gridHeight: number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.closedSet = [];
    for (let y = 0; y < gridHeight; y++) {
      this.closedSet[y] = [];
      for (let x = 0; x < gridWidth; x++) {
        this.closedSet[y][x] = false;
      }
    }
    
    // Pre-allocate node pool
    for (let i = 0; i < 200; i++) {
      this.nodePool.push({ x: 0, y: 0, g: 0, h: 0, f: 0, parent: null });
    }
  }

  public setMapGrid(mapGrid: MapGridSystem): void {
    this.mapGrid = mapGrid;
  }

  /**
   * Get node from pool (Zero-Allocation)
   */
  private getNode(x: number, y: number, g: number, h: number, parent: PathNode | null): PathNode {
    const node = this.nodePool.pop() || { x: 0, y: 0, g: 0, h: 0, f: 0, parent: null };
    node.x = x;
    node.y = y;
    node.g = g;
    node.h = h;
    node.f = g + h;
    node.parent = parent;
    return node;
  }

  /**
   * Return node to pool
   */
  private releaseNode(node: PathNode): void {
    if (this.nodePool.length < 300) {
      node.parent = null;
      this.nodePool.push(node);
    }
  }

  /**
   * A* Pathfinding to base [12][6]
   * Throttled to 2-3 recalcs per second
   */
  public findPath(startX: number, startY: number, currentTime: number): number[] | null {
    if (!this.mapGrid) return null;

    // Throttle recalculation
    if (currentTime - this.lastRecalcTime < this.recalcInterval) {
      return null;
    }

    const targetX = GAME_CONFIG.map.baseX;
    const targetY = GAME_CONFIG.map.baseY;

    // Clear sets (Zero-Allocation: reuse arrays)
    this.openSet.length = 0;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.closedSet[y][x] = false;
      }
    }

    const startNode = this.getNode(startX, startY, 0, this.heuristic(startX, startY, targetX, targetY), null);
    this.openSet.push(startNode);

    let iterations = 0;
    const maxIterations = 500;

    while (this.openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest F
      let lowestIndex = 0;
      let lowestF = this.openSet[0].f;
      for (let i = 1; i < this.openSet.length; i++) {
        if (this.openSet[i].f < lowestF) {
          lowestF = this.openSet[i].f;
          lowestIndex = i;
        }
      }

      const current = this.openSet.splice(lowestIndex, 1)[0];
      
      // Check if reached target
      if (current.x === targetX && current.y === targetY) {
        const path = this.reconstructPath(current);
        this.releaseNode(current);
        this.lastRecalcTime = currentTime;
        return path;
      }

      this.closedSet[current.y][current.x] = true;

      // Check neighbors
      for (let i = 0; i < 4; i++) {
        const dir = this.directions[i];
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;

        if (!this.isValid(nx, ny)) continue;
        if (this.closedSet[ny][nx]) continue;
        if (this.isWall(nx, ny)) continue;

        const newG = current.g + 1;
        const h = this.heuristic(nx, ny, targetX, targetY);
        
        // Check if in openSet
        let inOpenSet = false;
        for (let j = 0; j < this.openSet.length; j++) {
          if (this.openSet[j].x === nx && this.openSet[j].y === ny) {
            inOpenSet = true;
            if (newG < this.openSet[j].g) {
              this.openSet[j].g = newG;
              this.openSet[j].f = newG + h;
              this.openSet[j].parent = current;
            }
            break;
          }
        }

        if (!inOpenSet) {
          const neighbor = this.getNode(nx, ny, newG, h, current);
          this.openSet.push(neighbor);
        }
      }

      this.releaseNode(current);
    }

    // Clean up remaining nodes
    for (let i = 0; i < this.openSet.length; i++) {
      this.releaseNode(this.openSet[i]);
    }
    this.openSet.length = 0;

    this.lastRecalcTime = currentTime;
    return null;
  }

  /**
   * Instant Evade: Step-back logic when hitting fresh wall (<1 sec)
   */
  public evadeObstacle(currentX: number, currentY: number, moveDirX: number, moveDirY: number): { x: number, y: number } {
    const nextX = currentX + moveDirX;
    const nextY = currentY + moveDirY;

    if (this.isValid(nextX, nextY) && !this.isWall(nextX, nextY)) {
      return { x: nextX, y: nextY };
    }

    // Try perpendicular directions (evade)
    const perpDirs = [
      { x: -moveDirY, y: moveDirX },
      { x: moveDirY, y: -moveDirX },
    ];

    for (let i = 0; i < 2; i++) {
      const evadeX = currentX + perpDirs[i].x;
      const evadeY = currentY + perpDirs[i].y;
      if (this.isValid(evadeX, evadeY) && !this.isWall(evadeX, evadeY)) {
        return { x: evadeX, y: evadeY };
      }
    }

    // Step back
    return { x: currentX - moveDirX, y: currentY - moveDirY };
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private isValid(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }

  private isWall(x: number, y: number): boolean {
    if (!this.mapGrid) return false;
    const cell = this.mapGrid.getTile(x, y);
    if (!cell) return false;
    return cell.type === TileType.BRICK || cell.type === TileType.STEEL || cell.type === TileType.WATER;
  }

  private reconstructPath(endNode: PathNode): number[] {
    const path: number[] = [];
    let current: PathNode | null = endNode;
    while (current !== null) {
      path.unshift(current.x);
      path.unshift(current.y);
      current = current.parent;
    }
    return path;
  }

  public destroy(): void {
    this.openSet.length = 0;
    this.nodePool.length = 0;
    this.mapGrid = null;
  }
}
