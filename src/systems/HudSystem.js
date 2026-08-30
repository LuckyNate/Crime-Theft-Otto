import * as THREE from "three";
import { GameSystem } from "./GameSystem.js";

export class HudSystem extends GameSystem {
  constructor(game) {
    super(game, {
      touchDebugRaycaster: new THREE.Raycaster(),
      touchDebugMarker: null,
      touchDebugUntil: 0
    });
  }

  buildTouchDebug() {
    this.touchDebugMarker = new THREE.Mesh(
      new THREE.SphereGeometry(.12, 12, 8),
      new THREE.MeshBasicMaterial({
        color: 0x168cff,
        depthTest: false
      })
    );

    this.touchDebugMarker.visible = false;
    this.touchDebugMarker.renderOrder = 999;
    this.scene.add(this.touchDebugMarker);
  }

  bindTouchDebug() {
    document.addEventListener(
      "pointerdown",
      e => {
        const ndc = new THREE.Vector2(
          (e.clientX / innerWidth) * 2 - 1,
          -(e.clientY / innerHeight) * 2 + 1
        );

        this.camera.updateMatrixWorld(true);

        this.touchDebugRaycaster.setFromCamera(
          ndc,
          this.camera
        );

        const candidates = [];

        for (const obj of this.scene.children) {
          if (
            obj === this.touchDebugMarker ||
            obj === this.player.mesh ||
            !obj.visible
          ) {
            continue;
          }

          if (obj.isMesh) {
            candidates.push(obj);
          }
        }

        const hits =
          this.touchDebugRaycaster.intersectObjects(
            candidates,
            false
          );

        if (!hits.length) {
          this.touchDebugMarker.visible = false;
          return;
        }

        this.touchDebugMarker.position.copy(
          hits[0].point
        );

        this.touchDebugMarker.visible = true;
        this.touchDebugUntil =
          performance.now() + 150;
      },
      { capture:true }
    );
  }

  updateStats() {
    const [skillName, skillValue] =
      Object.entries(this.skills.values)[0];

    document.querySelector("#stats").textContent =
`${skillName.toUpperCase()} ${Number(skillValue).toFixed(2)}
TARGET   ${this.currentTarget ? "LOCK" : "NONE"}
MANUAL   ${this.input.manualAim ? "YES" : "NO"}`;
  }
}
