import * as THREE from "three";
import { Skills } from "./Skills.js";
import { Input } from "./Input.js";
import { Player } from "./Player.js";
import { ThirdPersonCamera } from "./ThirdPersonCamera.js";
import { AutoAim } from "./AutoAim.js";
import { WorldSystem } from "./systems/WorldSystem.js";
import { VehicleSystem } from "./systems/VehicleSystem.js";
import { PedestrianSystem } from "./systems/PedestrianSystem.js";
import { InteractionSystem } from "./systems/InteractionSystem.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { PathfindingSystem } from "./systems/PathfindingSystem.js";
import { CombatSystem } from "./systems/CombatSystem.js";
import { SoundWordSystem } from "./systems/SoundWordSystem.js";
import { PhoneSystem } from "./systems/PhoneSystem.js";
import { PlayerMovementSystem } from "./systems/PlayerMovementSystem.js";
import { HudSystem } from "./systems/HudSystem.js";

export class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x929ba0);
    this.scene.fog = new THREE.FogExp2(0x929ba0, 0.00225);

    this.camera = new THREE.PerspectiveCamera(
      65,
      innerWidth / innerHeight,
      .05,
      1200
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    });

    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, 1.5)
    );
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.prepend(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.skills = new Skills();
    this.input = new Input();
    this.player = new Player(this.scene);
    this.player.translate(new THREE.Vector3(0, 0, 4));
    this.cameraRig = new ThirdPersonCamera(this.camera);
    this.autoAim = new AutoAim(this.camera, this.skills);

    this.moveSpeed = 5.2;
    this.walkTurnSpeed = 3.4;

    this.systems = {};
    this.world = this.addSystem("world", WorldSystem);
    this.vehicles = this.addSystem("vehicles", VehicleSystem);
    this.pedestrians = this.addSystem("pedestrians", PedestrianSystem);
    this.interactions = this.addSystem("interactions", InteractionSystem);
    this.collision = this.addSystem("collision", CollisionSystem);
    this.pathfinding = this.addSystem("pathfinding", PathfindingSystem);
    this.combat = this.addSystem("combat", CombatSystem);
    this.soundWords = this.addSystem("soundWords", SoundWordSystem);
    this.phone = this.addSystem("phone", PhoneSystem);
    this.movement = this.addSystem("movement", PlayerMovementSystem);
    this.hud = this.addSystem("hud", HudSystem);

    this.world.buildWorld();
    this.pedestrians.build();
    this.vehicles.build();
    this.phone.bind();
    this.pathfinding.rebuildObstacleOctree();
    this.hud.buildTouchDebug();
    this.hud.bindTouchDebug();

    addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  addSystem(name, SystemType) {
    const system = new SystemType(this);
    this.systems[name] = system;
    return system;
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    const now = performance.now();

    const lookDelta = this.input.takeLookDelta();

    if (
      Math.abs(lookDelta.x) > 0 ||
      Math.abs(lookDelta.y) > 0
    ) {
      this.combat.directTapTarget = null;
    }

    this.cameraRig.applyLook(lookDelta);

    const zoomDelta = this.input.takeZoomDelta();

    if (Math.abs(zoomDelta) > .001) {
      this.cameraRig.distance = THREE.MathUtils.clamp(
        this.cameraRig.distance - zoomDelta * .02,
        2.2,
        12
      );
    }

    if (
      this.vehicles.mounted &&
      (
        Math.abs(lookDelta.x) > .001 ||
        Math.abs(lookDelta.y) > .001
      )
    ) {
      this.vehicles.mountedCameraActiveUntil = now + 1000;
    }

    const lookTap = this.input.takeLookTap();
    const lookHold = this.input.takeLookHold();

    if (
      this.vehicles.mounted &&
      lookHold &&
      this.vehicles.isScreenPointOnMountedVehicle(
        lookHold.x,
        lookHold.y
      )
    ) {
      this.vehicles.dismount();
    } else if (!this.vehicles.mounted && lookHold) {
      this.phone.setPhoneOpen(true);
    }

    if (lookTap) {
      this.handleTap(lookTap, now);
    }

    this.interactions.updateInteractables(now);
    this.interactions.updateInteractableSparkles();
    this.pedestrians.updateEnemies(now, dt);
    this.vehicles.updateParkedVehicles();

    if (!this.vehicles.updateMovement(dt, now)) {
      if (!this.interactions.updateInteraction(dt)) {
        this.movement.movePlayer(dt);
      }
    }

    this.cameraRig.update(
      this.vehicles.getControlledCenter()
    );

    this.combat.updateAim();
    this.hud.updateStats();

    this.world.update(dt);
    this.vehicles.updateRearTireSmoke(dt);
    this.soundWords.updateFootsteps();
    this.soundWords.updateSoundWords(dt);

    this.renderer.render(this.scene, this.camera);
  }

  handleTap(lookTap, now) {
    this.combat.directTapTarget = null;

    if (this.vehicles.mounted) {
      this.vehicles.mountedCameraActiveUntil = now + 1000;

      const tappedTarget = this.combat.pickTargetAtScreenPoint(
        lookTap.x,
        lookTap.y
      );

      if (!tappedTarget) return;

      this.combat.currentTarget = tappedTarget;
      this.combat.directTapTarget = tappedTarget;

      this.soundWords.spawnSoundWord(
        "PEW!",
        this.vehicles.getControlledCenter(new THREE.Vector3()),
        1.15
      );

      this.combat.hitTarget(tappedTarget);
      return;
    }

    const interactable =
      this.interactions.pickInteractableAtScreenPoint(
        lookTap.x,
        lookTap.y
      );

    if (interactable) {
      this.interactions.pendingInteraction = interactable;

      const interactionTarget =
        interactable.mesh.getWorldPosition(
          new THREE.Vector3()
        );

      this.interactions.interactionPath =
        interactable.directApproach
          ? [interactionTarget]
          : this.pathfinding.buildInteractionPath(
              this.player.getCenter(new THREE.Vector3()),
              interactionTarget,
              interactable.target ?? null
            );
      return;
    }

    const tappedTarget = this.combat.pickTargetAtScreenPoint(
      lookTap.x,
      lookTap.y
    );

    if (tappedTarget) {
      this.combat.lookAtTarget(tappedTarget);
      this.combat.currentTarget = tappedTarget;
      this.combat.directTapTarget = tappedTarget;

      this.soundWords.spawnSoundWord(
        "PEW!",
        this.player.getCenter(new THREE.Vector3()),
        1.15
      );

      this.combat.hitTarget(tappedTarget);
      return;
    }

    this.cameraRig.lookAtScreenPoint(
      lookTap.x,
      lookTap.y
    );
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
}
