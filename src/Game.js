import * as THREE from "three";
import { Skills } from "./Skills.js";
import { Input } from "./Input.js";
import { Player } from "./Player.js";
import { ThirdPersonCamera } from "./ThirdPersonCamera.js";
import { AutoAim } from "./AutoAim.js";

export class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x939aa0);

    this.camera = new THREE.PerspectiveCamera(
      65,
      innerWidth / innerHeight,
      .05,
      300
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias:true,
      powerPreference:"high-performance"
    });

    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, 1.5)
    );

    this.renderer.setSize(
      innerWidth,
      innerHeight
    );

    this.renderer.shadowMap.enabled = true;

    document.body.prepend(
      this.renderer.domElement
    );

    this.clock = new THREE.Clock();

    this.skills = new Skills();
    this.input = new Input();

    this.player = new Player(this.scene);
    this.player.translate(
      new THREE.Vector3(0,0,4)
    );

    this.cameraRig =
      new ThirdPersonCamera(this.camera);

    this.autoAim =
      new AutoAim(this.camera, this.skills);

    this.targets = [];
    this.currentTarget = null;

    this.tapTargetRaycaster = new THREE.Raycaster();
    this.touchDebugRaycaster = new THREE.Raycaster();
    this.directTapTarget = null;

    this.touchDebugMarker = null;
    this.touchDebugUntil = 0;

    this.shotCooldown = 0;

    this.moveSpeed = 5.2;
    this.walkTurnSpeed = 3.4;

    this.buildWorld();
    this.buildTouchDebug();
    this.bindTouchDebug();

    addEventListener(
      "resize",
      () => this.resize()
    );

    this.renderer.setAnimationLoop(
      () => this.frame()
    );
  }

  buildWorld() {
    this.scene.add(
      new THREE.HemisphereLight(
        0xffffff,
        0x444444,
        2.0
      )
    );

    const sun =
      new THREE.DirectionalLight(
        0xffffff,
        2.6
      );

    sun.position.set(8,12,6);
    sun.castShadow = true;

    this.scene.add(sun);

    const ground =
      new THREE.Mesh(
        new THREE.PlaneGeometry(120,120),
        new THREE.MeshStandardMaterial({
          roughness:1
        })
      );

    ground.rotation.x =
      -Math.PI / 2;

    ground.receiveShadow = true;

    this.scene.add(ground);

    const enemyPositions = [
      [-5, .9, -8],
      [ 2, .9, -9],
      [ 2, .9, -13],
      [ 2, .9, -18],
      [-8, .9, -16],
      [ 8, .9, -19]
    ];

    for (const p of enemyPositions) {
      const mesh =
        new THREE.Mesh(
          new THREE.CapsuleGeometry(
            .34,
            1.05,
            6,
            12
          ),
          new THREE.MeshStandardMaterial({
            color: 0x777777,
            emissive: 0x000000,
            emissiveIntensity: 0
          })
        );

      mesh.position.set(...p);
      mesh.castShadow = true;

      this.scene.add(mesh);

      this.targets.push({
        mesh,
        targetable:true,
        alive:true
      });
    }
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
          performance.now() + 600;
      },
      { capture:true }
    );
  }

  movePlayer(dt) {
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

      this.player.translate(desired);

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

  pickTargetAtScreenPoint(screenX, screenY) {
    const TAP_TARGET_RADIUS_PX = 72;

    let best = null;
    let bestScreenDistance = Infinity;
    let bestWorldDistance = Infinity;

    this.camera.updateMatrixWorld(true);

    for (const target of this.targets) {
      if (
        !target.alive ||
        !target.targetable ||
        !target.mesh.visible
      ) {
        continue;
      }

      const aimPoint = target.mesh.position
        .clone()
        .add(new THREE.Vector3(0, .45, 0));

      const projected =
        aimPoint.clone().project(this.camera);

      if (
        projected.z < -1 ||
        projected.z > 1 ||
        projected.x < -1 ||
        projected.x > 1 ||
        projected.y < -1 ||
        projected.y > 1
      ) {
        continue;
      }

      const sx =
        (projected.x * .5 + .5) * innerWidth;

      const sy =
        (-projected.y * .5 + .5) * innerHeight;

      const screenDistance =
        Math.hypot(
          screenX - sx,
          screenY - sy
        );

      if (screenDistance > TAP_TARGET_RADIUS_PX) {
        continue;
      }

      const worldDistance =
        this.camera.position.distanceTo(aimPoint);

      if (
        screenDistance < bestScreenDistance - 4 ||
        (
          Math.abs(screenDistance - bestScreenDistance) <= 4 &&
          worldDistance < bestWorldDistance
        )
      ) {
        best = target;
        bestScreenDistance = screenDistance;
        bestWorldDistance = worldDistance;
      }
    }

    return best;
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

  fire(dt) {
    this.shotCooldown =
      Math.max(
        0,
        this.shotCooldown - dt
      );

    if (
      !this.input.fire ||
      this.shotCooldown > 0
    ) {
      return;
    }

    const shooting =
      this.skills.get("shooting");

    this.shotCooldown =
      .22 / shooting;

    if (!this.currentTarget) {
      return;
    }

    const target =
      this.currentTarget;

    target.alive = false;
    target.targetable = false;
    target.mesh.visible = false;

    if (this.directTapTarget === target) {
      this.directTapTarget = null;
    }

    this.skills.add(
      "shooting",
      0.01
    );
  }

  updateStats() {
    document.querySelector("#stats").textContent =
`SHOOTING ${this.skills.get("shooting").toFixed(2)}
TARGET   ${this.currentTarget ? "LOCK" : "NONE"}
MANUAL   ${this.input.manualAim ? "YES" : "NO"}`;
  }

  frame() {
    const dt =
      Math.min(
        this.clock.getDelta(),
        1/20
      );

    const lookDelta =
      this.input.takeLookDelta();

    if (
      Math.abs(lookDelta.x) > 0 ||
      Math.abs(lookDelta.y) > 0
    ) {
      this.directTapTarget = null;
    }

    this.cameraRig.applyLook(
      lookDelta
    );

    const lookTap =
      this.input.takeLookTap();

    if (lookTap) {
      this.directTapTarget = null;

      const tappedTarget =
        this.pickTargetAtScreenPoint(
          lookTap.x,
          lookTap.y
        );

      if (tappedTarget) {
        this.lookAtTarget(tappedTarget);
        this.currentTarget = tappedTarget;
        this.directTapTarget = tappedTarget;
      } else {
        this.cameraRig.lookAtScreenPoint(
          lookTap.x,
          lookTap.y
        );
      }
    }

    this.movePlayer(dt);

    this.cameraRig.update(
      this.player.getCenter()
    );

    this.updateAim();
    this.fire(dt);
    this.updateStats();

    if (
      this.touchDebugMarker.visible &&
      performance.now() > this.touchDebugUntil
    ) {
      this.touchDebugMarker.visible = false;
    }

    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  resize() {
    this.camera.aspect =
      innerWidth / innerHeight;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
}
