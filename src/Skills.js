import * as THREE from "three";

export class Skills {
  constructor() {
    const saved = this.load();

    this.values = {
      shooting: 1.0,
      melee: 1.0,
      driving: 1.0,
      flying: 1.0,
      stamina: 1.0,
      strength: 1.0,
      toughness: 1.0,
      ...saved
    };
  }

  get(name) {
    return this.values[name] ?? 1.0;
  }

  add(name, amount) {
    this.values[name] = THREE.MathUtils.clamp(
      this.get(name) + amount,
      1.0,
      10.0
    );
    this.save();
  }

  save() {
    localStorage.setItem(
      "crime-game-skills-v1",
      JSON.stringify(this.values)
    );
  }

  load() {
    try {
      return JSON.parse(
        localStorage.getItem("crime-game-skills-v1")
      ) || {};
    } catch {
      return {};
    }
  }
}
