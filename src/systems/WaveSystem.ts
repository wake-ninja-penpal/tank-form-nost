/**
 * Система волн врагов (Этап 5)
 * Управляет спавном, фазой подготовки и формулами сложности
 */
export class WaveSystem {
  private waveNumber: number = 0;
  private enemiesToSpawn: number = 0;
  private spawnTimer: number = 0;
  private prepPhase: boolean = true;
  private prepTimer: number = 0;

  private readonly PREP_DURATION = 3000; // 3 сек подготовка
  private readonly SPAWN_INTERVAL = 800; // 800 мс между спавнами

  public startWave(wave: number): void {
    this.waveNumber = wave;
    this.prepPhase = true;
    this.prepTimer = this.PREP_DURATION;
    
    // Формула сложности: база + рост
    this.enemiesToSpawn = 3 + Math.floor(wave * 1.5);
  }

  public fixedUpdate(delta: number): void {
    if (this.prepPhase) {
      this.prepTimer -= delta;
      if (this.prepTimer <= 0) {
        this.prepPhase = false;
        this.spawnTimer = 0;
      }
      return;
    }

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.enemiesToSpawn > 0) {
      this.spawnEnemy();
      this.enemiesToSpawn--;
      this.spawnTimer = this.SPAWN_INTERVAL;
    }
  }

  private spawnEnemy(): void {
    // Логика спавна через Factory (будет в Этапе 5)
    console.log(`Spawning enemy for wave ${this.waveNumber}`);
  }

  public isPrepPhase(): boolean {
    return this.prepPhase;
  }

  public getWaveNumber(): number {
    return this.waveNumber;
  }

  public destroy(): void {
    // Очистка ресурсов
  }
}
