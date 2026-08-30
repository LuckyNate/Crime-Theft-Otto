import * as THREE from "three";
import { GameSystem } from "./GameSystem.js";

export class PlayerMovementSystem extends GameSystem {
  constructor(game) {
    super(game, {});
  }

  movePlayer(dt) {
    if (
      this.sittingSeat &&
      (
        Math.abs(this.input.moveX) > .001 ||
        Math.abs(this.input.moveY) > .001
      )
    ) {
      this.leaveSeat();
    }

    if (this.sittingSeat) {
      return;
    }

    const twoHanded =
      this.input.manualAim;

    if (!twoHanded) {
      this.cameraRig.yaw -=
        this.input.moveX *
        this.walkTurnSpeed *
        dt;
    }

    const forward =
      this.cameraRig.planarForward();

    const right =
      this.cameraRig.planarRight();

    const desired =
      new THREE.Vector3()
        .addScaledVector(
          forward,
          this.input.moveY
        );

    if (twoHanded) {
      desired.addScaledVector(
        right,
        this.input.moveX
      );
    }

    if (desired.lengthSq() > 1) {
      desired.normalize();
    }

    if (desired.lengthSq() > .001) {
      desired.multiplyScalar(
        this.moveSpeed * dt
      );

      this.movePlayerSolid(desired);

      const facing =
        Math.atan2(
          desired.x,
          desired.z
        );

      this.player.mesh.rotation.y =
        THREE.MathUtils.lerp(
          this.player.mesh.rotation.y,
          facing,
          .2
        );
    } else if (!twoHanded && Math.abs(this.input.moveX) > .001) {
      const faceForward =
        this.cameraRig.planarForward();

      const facing =
        Math.atan2(
          faceForward.x,
          faceForward.z
        );

      this.player.mesh.rotation.y =
        THREE.MathUtils.lerp(
          this.player.mesh.rotation.y,
          facing,
          .3
        );
    }

    // Starter ground collision through the capsule.
    const center =
      this.player.getCenter();

    const minimumY =
      this.player.bodyHeight * .5;

    if (center.y < minimumY) {
      this.player.translate(
        new THREE.Vector3(
          0,
          minimumY - center.y,
          0
        )
      );
    }
  }
}
