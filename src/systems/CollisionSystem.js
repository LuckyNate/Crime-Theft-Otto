import * as THREE from "three";
import { GameSystem } from "./GameSystem.js";

export class CollisionSystem extends GameSystem {
  constructor(game) {
    super(game, {});
  }

  getSolidObjects(ignore = null, includeTargets = true) {
    const solids = [];
    const seen = new Set();

    const add = object => {
      if (
        !object ||
        object === ignore ||
        seen.has(object) ||
        !object.visible
      ) {
        return;
      }

      seen.add(object);
      solids.push(object);
    };

    for (const obstacle of this.obstacles) {
      add(obstacle);
    }

    for (const item of this.interactables) {
      if (
        item.enabled &&
        item.mesh.visible
      ) {
        add(item.mesh);
      }
    }

    if (includeTargets) {
      for (const target of this.targets) {
        if (
          target.alive &&
          target.targetable &&
          target.mesh.visible
        ) {
          add(target.mesh);
        }
      }
    }

    return solids;
  }

  playerIntersectsSolids(center, ignore = null) {
    const radius = this.player.radius;

    for (const object of this.getSolidObjects(ignore, true)) {
      object.updateWorldMatrix(true, true);

      const box =
        new THREE.Box3().setFromObject(
          object
        );

      const halfHeight =
        this.player.bodyHeight * .5;

      if (
        center.y + halfHeight < box.min.y ||
        center.y - halfHeight > box.max.y
      ) {
        continue;
      }

      const closestX =
        THREE.MathUtils.clamp(
          center.x,
          box.min.x,
          box.max.x
        );

      const closestZ =
        THREE.MathUtils.clamp(
          center.z,
          box.min.z,
          box.max.z
        );

      const dx = center.x - closestX;
      const dz = center.z - closestZ;

      if (
        dx * dx + dz * dz <
        radius * radius
      ) {
        return true;
      }
    }

    return false;
  }

  movePlayerSolid(delta, ignore = null) {
    this.player.translate(delta);

    const radius =
      this.player.radius;

    for (let pass = 0; pass < 4; pass++) {
      let resolved = false;

      const center =
        this.player.getCenter(
          new THREE.Vector3()
        );

      for (const object of this.getSolidObjects(ignore, true)) {
        object.updateWorldMatrix(true, true);

        const box =
          new THREE.Box3().setFromObject(
            object
          );

        const halfHeight =
          this.player.bodyHeight * .5;

        if (
          center.y + halfHeight < box.min.y ||
          center.y - halfHeight > box.max.y
        ) {
          continue;
        }

        const closestX =
          THREE.MathUtils.clamp(
            center.x,
            box.min.x,
            box.max.x
          );

        const closestZ =
          THREE.MathUtils.clamp(
            center.z,
            box.min.z,
            box.max.z
          );

        let dx =
          center.x - closestX;

        let dz =
          center.z - closestZ;

        const distSq =
          dx * dx + dz * dz;

        if (distSq >= radius * radius) {
          continue;
        }

        let pushX = 0;
        let pushZ = 0;

        if (distSq > .000001) {
          const dist =
            Math.sqrt(distSq);

          const penetration =
            radius - dist;

          pushX =
            dx / dist *
            penetration;

          pushZ =
            dz / dist *
            penetration;
        } else {
          const left =
            Math.abs(
              center.x - box.min.x
            );

          const right =
            Math.abs(
              box.max.x - center.x
            );

          const back =
            Math.abs(
              center.z - box.min.z
            );

          const front =
            Math.abs(
              box.max.z - center.z
            );

          const min =
            Math.min(
              left,
              right,
              back,
              front
            );

          if (min === left) {
            pushX =
              -(left + radius);
          } else if (min === right) {
            pushX =
              right + radius;
          } else if (min === back) {
            pushZ =
              -(back + radius);
          } else {
            pushZ =
              front + radius;
          }
        }

        this.player.translate(
          new THREE.Vector3(
            pushX,
            0,
            pushZ
          )
        );

        center.add(
          new THREE.Vector3(
            pushX,
            0,
            pushZ
          )
        );

        resolved = true;
      }

      if (!resolved) {
        break;
      }
    }
  }

  vehicleIntersectsSolids(vehicle) {
    vehicle.updateWorldMatrix(true, true);

    const vehicleBox =
      new THREE.Box3().setFromObject(
        vehicle
      );

    for (const object of this.getSolidObjects(vehicle, false)) {
      object.updateWorldMatrix(true, true);

      const box =
        new THREE.Box3().setFromObject(
          object
        );

      if (
        vehicleBox.intersectsBox(box)
      ) {
        return true;
      }
    }

    return false;
  }
}
