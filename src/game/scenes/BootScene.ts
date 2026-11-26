import Phaser from "phaser";

/** Grey-box build has no assets to load. Day 3 adds audio loading here. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    this.scene.start("Title");
  }
}
