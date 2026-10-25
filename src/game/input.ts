/** Discrete keyboard gate. No DOM dependency, and no queued presses. */
export class SpaceInput {
  private held = false;

  down(code: string, repeat: boolean, playing: boolean, attack: () => boolean): boolean {
    if (code !== 'Space') return false;
    if (repeat || this.held) return false;
    this.held = true;
    return playing && attack();
  }

  up(code: string): void {
    if (code === 'Space') this.held = false;
  }

  clear(): void { this.held = false; }
}
