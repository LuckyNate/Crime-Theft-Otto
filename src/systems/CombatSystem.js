import * as THREE from "three";
import { GameSystem } from "./GameSystem.js";

export class CombatSystem extends GameSystem {
  constructor(game) {
    super(game, {
      currentTarget: null,
      directTapTarget: null,
      tapTargetRaycaster: new THREE.Raycaster()
    });
  }

  pickTargetAtScreenPoint(screenX, screenY) {
    const ndc = new THREE.Vector2(
      (screenX / innerWidth) * 2 - 1,
      -(screenY / innerHeight) * 2 + 1
    );

    this.camera.updateMatrixWorld(true);

    this.tapTargetRaycaster.setFromCamera(
      ndc,
      this.camera
    );

    const liveTargets =
      this.targets.filter(
        target =>
          target.alive &&
          target.targetable &&
          target.mesh.visible
      );

    const meshes =
      liveTargets.map(
        target => target.mesh
      );

    const hits =
      this.tapTargetRaycaster.intersectObjects(
        meshes,
        true
      );

    if (!hits.length) {
      return null;
    }

    for (const hit of hits) {
      for (const target of liveTargets) {
        let object = hit.object;

        while (object) {
          if (object === target.mesh) {
            return target;
          }
          object = object.parent;
        }
      }
    }

    return null;
  }

  lookAtTarget(target) {
    const aimPoint = target.mesh.position
      .clone()
      .add(new THREE.Vector3(0, .45, 0));

    const dir = aimPoint
      .sub(this.camera.position)
      .normalize();

    this.cameraRig.yaw = Math.atan2(
      -dir.x,
      -dir.z
    );

    this.cameraRig.pitch = THREE.MathUtils.clamp(
      Math.asin(
        THREE.MathUtils.clamp(dir.y, -1, 1)
      ),
      -1.0,
      0.55
    );
  }

  updateAim() {
    if (this.input.manualAim) {
      this.currentTarget = null;
      this.directTapTarget = null;
    } else if (this.directTapTarget) {
      if (
        this.directTapTarget.alive &&
        this.directTapTarget.targetable &&
        this.directTapTarget.mesh.visible
      ) {
        this.currentTarget =
          this.directTapTarget;
      } else {
        this.directTapTarget = null;
      }
    } else {
      this.currentTarget =
        this.autoAim.acquire(
          this.camera.position,
          this.cameraRig.forward(),
          this.targets
        );
    }

    for (const t of this.targets) {
      if (!t.alive) continue;

      const locked =
        t === this.currentTarget;

      t.mesh.scale.setScalar(
        locked ? 1.12 : 1.0
      );

      t.mesh.material.emissive.setHex(
        locked ? 0xffcc00 : 0x000000
      );

      t.mesh.material.emissiveIntensity =
        locked ? 1.8 : 0;
    }
  }

  hitTarget(target, shootingKill = true) {
    if (
      !target ||
      !target.alive ||
      !target.targetable ||
      !target.mesh.visible
    ) {
      return false;
    }

    this.spawnSoundWord(
      "UGH!",
      target.mesh.getWorldPosition(
        new THREE.Vector3()
      ),
      .9
    );

    target.alive = false;
    target.targetable = false;
    target.mesh.visible = false;
    target.respawnAt =
      performance.now() + 3000;

    if (this.directTapTarget === target) {
      this.directTapTarget = null;
    }

    if (this.currentTarget === target) {
      this.currentTarget = null;
    }

    if (shootingKill) {
      // Skill improves on a confirmed shooting kill, not merely on firing.
      this.skills.add(
        "shooting",
        0.01
      );
    }

    return true;
  }
}
