import * as THREE from "three";
import { MountInteractable } from "../GameSupport.js";
import { GameSystem } from "./GameSystem.js";

export class InteractionSystem extends GameSystem {
  constructor(game) {
    super(game, {
      interactables: [],
      interactableSparkles: new Map(),
      pendingInteraction: null,
      interactionPath: [],
      sittingSeat: null
    });
  }

  sitOn(seat) {
    this.sittingSeat = seat;

    const seatPosition =
      seat.getWorldPosition(
        new THREE.Vector3()
      );

    const current =
      this.player.getCenter(
        new THREE.Vector3()
      );

    const destination =
      new THREE.Vector3(
        seatPosition.x,
        1.18,
        seatPosition.z
      );

    this.player.translate(
      destination.sub(current)
    );
  }

  leaveSeat() {
    if (!this.sittingSeat) {
      return;
    }

    this.sittingSeat = null;
  }

  createInteractableSparkles(interactable) {
    const count = 18;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = .28 + Math.random() * .32;

      positions[i * 3] =
        Math.cos(a) * r;

      positions[i * 3 + 1] =
        Math.random() * 1.1;

      positions[i * 3 + 2] =
        Math.sin(a) * r;

      phases[i] =
        Math.random() *
        Math.PI * 2;

      speeds[i] =
        3 +
        Math.random() * 5;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );

    const material =
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: .09,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        sizeAttenuation: true,
        vertexColors: true
      });

    const colors =
      new Float32Array(count * 3);

    colors.fill(1);

    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        colors,
        3
      )
    );

    const points =
      new THREE.Points(
        geometry,
        material
      );

    points.visible = false;
    points.renderOrder = 1000;
    points.userData.phases = phases;
    points.userData.speeds = speeds;

    this.scene.add(points);

    this.interactableSparkles.set(
      interactable,
      points
    );
  }

  updateInteractableSparkles() {
    const center =
      this.getControlledCenter(
        new THREE.Vector3()
      );

    const now =
      performance.now() * .001;

    for (const interactable of this.interactables) {
      const sparkles =
        this.interactableSparkles.get(
          interactable
        );

      if (!sparkles) continue;

      if (
        !interactable.enabled ||
        !interactable.mesh.visible ||
        interactable.isActivelyUsing(this)
      ) {
        sparkles.visible = false;
        continue;
      }

      const p =
        interactable.getHighlightPosition(
          this,
          new THREE.Vector3()
        );

      const distance =
        Math.hypot(
          p.x - center.x,
          p.z - center.z
        );

      sparkles.visible =
        distance <= 5;

      if (!sparkles.visible) {
        continue;
      }

      sparkles.position.copy(p);

      const colors =
        sparkles.geometry
          .getAttribute("color");

      const phases =
        sparkles.userData.phases;

      const speeds =
        sparkles.userData.speeds;

      for (let i = 0; i < colors.count; i++) {
        const light =
          .15 +
          .85 *
          (
            .5 +
            .5 *
            Math.sin(
              phases[i] +
              now * speeds[i]
            )
          );

        colors.setXYZ(
          i,
          light,
          light,
          light
        );
      }

      colors.needsUpdate = true;
    }
  }

  addInteractable(interactable) {
    this.interactables.push(
      interactable
    );

    this.createInteractableSparkles(
      interactable
    );

    return interactable;
  }

  pickInteractableAtScreenPoint(screenX, screenY) {
    const ndc = new THREE.Vector2(
      (screenX / innerWidth) * 2 - 1,
      -(screenY / innerHeight) * 2 + 1
    );

    this.camera.updateMatrixWorld(true);

    this.tapTargetRaycaster.setFromCamera(
      ndc,
      this.camera
    );

    const hits =
      this.tapTargetRaycaster.intersectObjects(
        this.interactables
          .filter(
            item =>
              item.enabled &&
              item.mesh.visible
          )
          .map(
            item => item.mesh
          ),
        true
      );

    if (!hits.length) {
      return null;
    }

    for (const hit of hits) {
      for (const item of this.interactables) {
        let object = hit.object;

        while (object) {
          if (object === item.mesh) {
            const center =
              this.getControlledCenter(
                new THREE.Vector3()
              );

            const itemPosition =
              item.mesh.getWorldPosition(
                new THREE.Vector3()
              );

            const interactionRadius =
              item instanceof MountInteractable
                ? 10
                : 5;

            const distance =
              Math.hypot(
                itemPosition.x - center.x,
                itemPosition.z - center.z
              );

            if (distance <= interactionRadius) {
              return item;
            }

            break;
          }

          object = object.parent;
        }
      }
    }

    return null;
  }

  updateInteractables(now) {
    for (const item of this.interactables) {
      item.update(this, now);
    }
  }

  updateInteraction(dt) {
    const item = this.pendingInteraction;

    if (!item) {
      this.interactionPath = [];
      return false;
    }

    if (
      !item.enabled ||
      !item.mesh.visible
    ) {
      this.pendingInteraction = null;
      this.interactionPath = [];
      return false;
    }

    const finalTarget =
      item.mesh.getWorldPosition(
        new THREE.Vector3()
      );

    const player =
      this.player.getCenter(
        new THREE.Vector3()
      );

    const finalDistance =
      Math.hypot(
        finalTarget.x - player.x,
        finalTarget.z - player.z
      );

    if (finalDistance <= item.distance) {
      this.pendingInteraction = null;
      this.interactionPath = [];
      item.interact(this);
      return true;
    }

    if (
      this.interactionPath.length === 0
    ) {
      this.interactionPath =
        item.directApproach
          ? [finalTarget.clone()]
          : this.buildInteractionPath(
              player,
              finalTarget,
              item.target ?? null
            );
    }

    let target =
      this.interactionPath[0] ??
      finalTarget;

    let dx =
      target.x - player.x;

    let dz =
      target.z - player.z;

    let distance =
      Math.hypot(dx, dz);

    if (
      distance < .2 &&
      this.interactionPath.length > 0
    ) {
      this.interactionPath.shift();

      target =
        this.interactionPath[0] ??
        finalTarget;

      dx =
        target.x - player.x;

      dz =
        target.z - player.z;

      distance =
        Math.hypot(dx, dz);
    }

    if (distance > .001) {
      const step =
        Math.min(
          this.moveSpeed * dt,
          distance
        );

      const move =
        new THREE.Vector3(
          dx / distance * step,
          0,
          dz / distance * step
        );

      this.movePlayerSolid(
        move,
        item.mesh
      );

      this.player.mesh.rotation.y =
        Math.atan2(
          move.x,
          move.z
        );
    }

    return true;
  }
}
