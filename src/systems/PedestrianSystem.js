import * as THREE from "three";
import { GameSystem } from "./GameSystem.js";

export class PedestrianSystem extends GameSystem {
  constructor(game) {
    super(game, { targets: [] });
  }

  build() {
    // Local pedestrian pool. Pedestrians are recycled around the
    // controlled position and stay on one block's sidewalk perimeter.
    const pedestrianCount = 28;

    for (
      let i = 0;
      i < pedestrianCount;
      i++
    ) {
      const mesh =
        new THREE.Mesh(
          new THREE.CapsuleGeometry(
            .34,
            1.05,
            6,
            12
          ),
          new THREE.MeshStandardMaterial({
            color: 0xe8893a,
            emissive: 0x000000,
            emissiveIntensity: 0
          })
        );

      mesh.castShadow = true;
      mesh.visible = false;

      this.scene.add(mesh);

      this.targets.push({
        mesh,
        targetable: false,
        alive: true,
        spawn: new THREE.Vector3(),
        respawnAt: 0,
        sidewalkBlockX: 0,
        sidewalkBlockZ: 0,
        sidewalkDistance: 0,
        sidewalkDirection:
          Math.random() < .5
            ? -1
            : 1,
        walkSpeed:
          1.0 +
          Math.random() * .8
      });
    }

  }

  getSidewalkPoint(
    blockX,
    blockZ,
    distance,
    out = new THREE.Vector3()
  ) {
    const half = 29.25;
    const sideLength = half * 2;
    const perimeter =
      sideLength * 4;

    distance =
      (
        distance % perimeter +
        perimeter
      ) % perimeter;

    if (distance < sideLength) {
      out.set(
        blockX - half + distance,
        .9,
        blockZ - half
      );
    } else if (
      distance < sideLength * 2
    ) {
      const d =
        distance - sideLength;

      out.set(
        blockX + half,
        .9,
        blockZ - half + d
      );
    } else if (
      distance < sideLength * 3
    ) {
      const d =
        distance - sideLength * 2;

      out.set(
        blockX + half - d,
        .9,
        blockZ + half
      );
    } else {
      const d =
        distance - sideLength * 3;

      out.set(
        blockX - half,
        .9,
        blockZ + half - d
      );
    }

    return out;
  }

  placePedestrianNear(
    target,
    center,
    initial = false
  ) {
    const roadSpacing = 80;

    const minRadius =
      initial ? 18 : 75;

    const maxRadius =
      initial ? 95 : 110;

    const angle =
      Math.random() *
      Math.PI * 2;

    const radius =
      minRadius +
      Math.random() *
      (maxRadius - minRadius);

    const sampleX =
      center.x +
      Math.cos(angle) *
      radius;

    const sampleZ =
      center.z +
      Math.sin(angle) *
      radius;

    const blockX =
      Math.round(
        (sampleX - 40) /
        roadSpacing
      ) *
      roadSpacing +
      40;

    const blockZ =
      Math.round(
        (sampleZ - 40) /
        roadSpacing
      ) *
      roadSpacing +
      40;

    target.sidewalkBlockX =
      THREE.MathUtils.clamp(
        blockX,
        -920,
        920
      );

    target.sidewalkBlockZ =
      THREE.MathUtils.clamp(
        blockZ,
        -920,
        920
      );

    target.sidewalkDistance =
      Math.random() *
      (58.5 * 4);

    target.sidewalkDirection =
      Math.random() < .5
        ? -1
        : 1;

    this.getSidewalkPoint(
      target.sidewalkBlockX,
      target.sidewalkBlockZ,
      target.sidewalkDistance,
      target.mesh.position
    );

    target.spawn.copy(
      target.mesh.position
    );

    target.mesh.visible = true;
    target.targetable = true;
    target.alive = true;
  }

  updateEnemies(now, dt) {
    const center =
      this.getControlledCenter(
        new THREE.Vector3()
      );

    for (const target of this.targets) {
      if (!target.mesh.visible) {
        if (
          target.alive ||
          now >= target.respawnAt
        ) {
          this.placePedestrianNear(
            target,
            center,
            true
          );
        }

        continue;
      }

      const dx =
        target.mesh.position.x -
        center.x;

      const dz =
        target.mesh.position.z -
        center.z;

      const distance =
        Math.hypot(dx, dz);

      if (distance > 120) {
        this.placePedestrianNear(
          target,
          center,
          false
        );
        continue;
      }

      if (!target.alive) {
        if (now >= target.respawnAt) {
          this.placePedestrianNear(
            target,
            center,
            false
          );
        }

        continue;
      }

      target.sidewalkDistance +=
        target.sidewalkDirection *
        target.walkSpeed *
        dt;

      const previous =
        target.mesh.position.clone();

      this.getSidewalkPoint(
        target.sidewalkBlockX,
        target.sidewalkBlockZ,
        target.sidewalkDistance,
        target.mesh.position
      );

      const moveX =
        target.mesh.position.x -
        previous.x;

      const moveZ =
        target.mesh.position.z -
        previous.z;

      if (
        Math.abs(moveX) +
        Math.abs(moveZ) >
        .0001
      ) {
        target.mesh.rotation.y =
          Math.atan2(
            moveX,
            moveZ
          );
      }

      target.spawn.copy(
        target.mesh.position
      );

      target.mesh.visible = true;
      target.targetable = true;
    }
  }
}
