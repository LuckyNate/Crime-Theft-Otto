import * as THREE from "three";

export class ObstacleOctree {
  constructor(minX, minY, minZ, maxX, maxY, maxZ, depth = 5) {
    this.minX = minX;
    this.minY = minY;
    this.minZ = minZ;
    this.maxX = maxX;
    this.maxY = maxY;
    this.maxZ = maxZ;
    this.depth = depth;
    this.leaves = new Map();

    this.count = 1 << depth;

    this.sizeX =
      (maxX - minX) / this.count;

    this.sizeY =
      (maxY - minY) / this.count;

    this.sizeZ =
      (maxZ - minZ) / this.count;
  }

  clear() {
    this.leaves.clear();
  }

  key(ix, iy, iz) {
    return `${ix},${iy},${iz}`;
  }

  indexX(x) {
    return THREE.MathUtils.clamp(
      Math.floor(
        (x - this.minX) /
        this.sizeX
      ),
      0,
      this.count - 1
    );
  }

  indexY(y) {
    return THREE.MathUtils.clamp(
      Math.floor(
        (y - this.minY) /
        this.sizeY
      ),
      0,
      this.count - 1
    );
  }

  indexZ(z) {
    return THREE.MathUtils.clamp(
      Math.floor(
        (z - this.minZ) /
        this.sizeZ
      ),
      0,
      this.count - 1
    );
  }

  insert(object, box) {
    const minIX = this.indexX(box.min.x);
    const maxIX = this.indexX(box.max.x);
    const minIY = this.indexY(box.min.y);
    const maxIY = this.indexY(box.max.y);
    const minIZ = this.indexZ(box.min.z);
    const maxIZ = this.indexZ(box.max.z);

    for (let ix = minIX; ix <= maxIX; ix++) {
      for (let iy = minIY; iy <= maxIY; iy++) {
        for (let iz = minIZ; iz <= maxIZ; iz++) {
          const key =
            this.key(ix, iy, iz);

          let leaf =
            this.leaves.get(key);

          if (!leaf) {
            leaf = [];
            this.leaves.set(
              key,
              leaf
            );
          }

          leaf.push({
            object,
            box: box.clone()
          });
        }
      }
    }
  }

  query(box, ignore = null) {
    const minIX = this.indexX(box.min.x);
    const maxIX = this.indexX(box.max.x);
    const minIY = this.indexY(box.min.y);
    const maxIY = this.indexY(box.max.y);
    const minIZ = this.indexZ(box.min.z);
    const maxIZ = this.indexZ(box.max.z);

    const seen = new Set();
    const results = [];

    for (let ix = minIX; ix <= maxIX; ix++) {
      for (let iy = minIY; iy <= maxIY; iy++) {
        for (let iz = minIZ; iz <= maxIZ; iz++) {
          const leaf =
            this.leaves.get(
              this.key(ix, iy, iz)
            );

          if (!leaf) {
            continue;
          }

          for (const entry of leaf) {
            if (
              entry.object === ignore ||
              seen.has(entry.object)
            ) {
              continue;
            }

            seen.add(entry.object);

            if (
              entry.box.intersectsBox(box)
            ) {
              results.push(
                entry.box.clone()
              );
            }
          }
        }
      }
    }

    return results;
  }
}

export class Interactable {
  constructor(mesh, distance = 1.0) {
    this.mesh = mesh;
    this.distance = distance;
    this.enabled = true;
    this.sounds = [];
  }

  playSounds(game) {
    for (const sound of this.sounds) {
      const source =
        typeof sound.source === "function"
          ? sound.source()
          : sound.source ??
            this.mesh.getWorldPosition(
              new THREE.Vector3()
            );

      game.spawnSoundWord(
        sound.text,
        source,
        sound.loudness ?? 1,
        sound.tiny ?? false
      );
    }
  }

  interact(game) {}

  update(game, now) {}

  getHighlightPosition(game, out = new THREE.Vector3()) {
    return this.mesh.getWorldPosition(out);
  }

  isActivelyUsing(game) {
    return game.pendingInteraction === this;
  }
}

export class RotateInteractable extends Interactable {
  constructor(mesh, target, rotation, distance = 1.0) {
    super(mesh, distance);
    this.target = target;
    this.rotation = rotation;

    this.sounds = [
      {
        text: "CLICK",
        loudness: .45
      }
    ];
  }

  interact(game) {
    this.playSounds(game);

    this.target.userData.opening = true;
    this.target.userData.open = true;
  }
}

export class DoorHandleInteractable extends Interactable {
  constructor(mesh, door, distance = 1.0) {
    super(mesh, distance);
    this.door = door;
    this.directApproach = true;

    this.sounds = [
      {
        text: "CLICK!",
        loudness: .45
      },
      {
        text: "CREEEAK...",
        loudness: .85,
        source: () =>
          this.door.getWorldPosition(
            new THREE.Vector3()
          )
      }
    ];
  }

  interact(game) {
    this.playSounds(game);

    const state =
      this.door.userData.state;

    if (
      state === "open" ||
      state === "opening"
    ) {
      this.door.userData.state =
        "closing";
    } else {
      this.door.userData.state =
        "opening";
    }

  }
}

export class ConsumableInteractable extends Interactable {
  constructor(mesh, respawnDelay = 3000, distance = 1.0) {
    super(mesh, distance);
    this.respawnDelay = respawnDelay;
    this.respawnAt = 0;

    this.sounds = [
      {
        text: "rustle",
        loudness: .35,
        tiny: true
      }
    ];
  }

  interact(game) {
    this.playSounds(game);

    this.mesh.visible = false;
    this.enabled = false;
    this.respawnAt =
      performance.now() + this.respawnDelay;
  }

  update(game, now) {
    if (
      !this.enabled &&
      now >= this.respawnAt
    ) {
      this.mesh.visible = true;
      this.enabled = true;
    }
  }
}

export class FoodInteractable extends ConsumableInteractable {}

export class DrinkInteractable extends ConsumableInteractable {}

export class SmokeInteractable extends ConsumableInteractable {}

export class DrugInteractable extends ConsumableInteractable {}

export class BeerInteractable extends DrinkInteractable {
  constructor(mesh, respawnDelay = 3000, distance = 1.0) {
    super(
      mesh,
      respawnDelay,
      distance
    );

    this.sounds = [
      {
        text: "rustle",
        loudness: .35,
        tiny: true
      },
      {
        text: "GLUG!",
        loudness: .7
      }
    ];
  }
}

export class SeatInteractable extends Interactable {
  constructor(mesh, seat, distance = 1.0) {
    super(mesh, distance);
    this.seat = seat;

    this.sounds = [
      {
        text: "THUMP",
        loudness: .45,
        source: () =>
          this.seat.getWorldPosition(
            new THREE.Vector3()
          )
      }
    ];
  }

  interact(game) {
    this.playSounds(game);
    game.sitOn(this.seat);
  }

  isActivelyUsing(game) {
    return (
      game.pendingInteraction === this ||
      game.sittingSeat === this.seat
    );
  }
}

export class MountInteractable extends Interactable {
  constructor(mesh, vehicle, distance = 1.5) {
    super(mesh, distance);
    this.vehicle = vehicle;

    this.sounds = [
      {
        text: "CLUNK!",
        loudness: .8,
        source: () =>
          this.vehicle.getWorldPosition(
            new THREE.Vector3()
          )
      }
    ];
  }

  interact(game) {
    this.playSounds(game);
    game.mount(this.vehicle);
  }

  isActivelyUsing(game) {
    return (
      game.pendingInteraction === this ||
      game.mounted === this.vehicle
    );
  }

  getHighlightPosition(game, out = new THREE.Vector3()) {
    const player =
      game.getControlledCenter(
        new THREE.Vector3()
      );

    const vehicleCenter =
      this.vehicle.getWorldPosition(
        new THREE.Vector3()
      );

    const heading =
      typeof this.vehicle.userData.heading === "number"
        ? this.vehicle.userData.heading
        : this.vehicle.rotation.y;

    const side =
      new THREE.Vector3(
        Math.cos(heading),
        0,
        -Math.sin(heading)
      );

    const toPlayer =
      player.clone().sub(
        vehicleCenter
      );

    const sign =
      toPlayer.dot(side) >= 0
        ? 1
        : -1;

    out.copy(vehicleCenter);
    out.addScaledVector(
      side,
      sign * 1.08
    );
    out.y += .45;

    return out;
  }
}
