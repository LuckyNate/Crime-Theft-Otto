import * as THREE from "three";
import { MountInteractable } from "../GameSupport.js";
import { GameSystem } from "./GameSystem.js";
import { createPlayerCar } from "./PlayerCarFactory.js";
import { createStreetVehicle } from "./StreetVehicleFactory.js";

export class VehicleSystem extends GameSystem {
  constructor(game) {
    super(game, {
      mounted: null,
      mountedCameraActiveUntil: 0,
      parkedVehicles: [],
      ownCar: null,
      tireSquealContext: null,
      tireSquealOscillator: null,
      tireSquealGain: null,
      rearTireSmoke: [],
      vehicleWasColliding: false,
      wasAccelerating: false,
      wasBraking: false
    });
  }

  build() {
    this.ownCar = createPlayerCar();
    this.scene.add(this.ownCar);

    const car = this.ownCar;

    this.addInteractable(
      new MountInteractable(
        car,
        car
      )
    );

    const localVehicleCount = 16;

    for (
      let i = 0;
      i < localVehicleCount;
      i++
    ) {
      const type =
        ["sedan", "pickup", "sports"][
          Math.floor(
            Math.random() * 3
          )
        ];

      const parked =
        createStreetVehicle(
          type
        );

      parked.visible = false;

      this.scene.add(parked);

      this.addInteractable(
        new MountInteractable(
          parked,
          parked
        )
      );

      this.parkedVehicles.push(
        parked
      );
    }
  }

  updateMovement(dt, now) {
    if (!this.mounted) return false;

    this.moveMounted(dt);

    if (now >= this.mountedCameraActiveUntil) {
      const targetYaw = this.mounted.userData.heading;
      let delta = targetYaw - this.cameraRig.yaw;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      this.cameraRig.yaw += delta * Math.min(1, dt * 3.5);
    }

    return true;
  }

  placeParkedVehicleNear(
    vehicle,
    center,
    initial = false
  ) {
    const roadSpacing = 80;

    const minRadius =
      initial ? 28 : 85;

    const maxRadius =
      initial ? 105 : 125;

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
      THREE.MathUtils.clamp(
        Math.round(
          (sampleX - 40) /
          roadSpacing
        ) *
        roadSpacing +
        40,
        -920,
        920
      );

    const blockZ =
      THREE.MathUtils.clamp(
        Math.round(
          (sampleZ - 40) /
          roadSpacing
        ) *
        roadSpacing +
        40,
        -920,
        920
      );

    const edge =
      Math.floor(
        Math.random() * 4
      );

    const along =
      -22 +
      Math.random() * 44;

    const curbOffset = 34.4;

    if (edge === 0) {
      vehicle.position.set(
        blockX + along,
        0,
        blockZ - curbOffset
      );
      vehicle.rotation.y =
        Math.PI * .5;
    } else if (edge === 1) {
      vehicle.position.set(
        blockX + curbOffset,
        0,
        blockZ + along
      );
      vehicle.rotation.y = 0;
    } else if (edge === 2) {
      vehicle.position.set(
        blockX + along,
        0,
        blockZ + curbOffset
      );
      vehicle.rotation.y =
        -Math.PI * .5;
    } else {
      vehicle.position.set(
        blockX - curbOffset,
        0,
        blockZ + along
      );
      vehicle.rotation.y =
        Math.PI;
    }

    vehicle.userData.heading =
      vehicle.rotation.y;

    vehicle.visible = true;
  }

  updateParkedVehicles() {
    const center =
      this.getControlledCenter(
        new THREE.Vector3()
      );

    for (
      const vehicle of
      this.parkedVehicles
    ) {
      if (vehicle === this.mounted) {
        continue;
      }

      if (!vehicle.visible) {
        this.placeParkedVehicleNear(
          vehicle,
          center,
          true
        );
        continue;
      }

      const distance =
        Math.hypot(
          vehicle.position.x -
            center.x,
          vehicle.position.z -
            center.z
        );

      if (distance > 145) {
        this.placeParkedVehicleNear(
          vehicle,
          center,
          false
        );
      }
    }
  }

  summonOwnCarBehind() {
    if (!this.ownCar || this.mounted) {
      return;
    }

    const center =
      this.player.getCenter(
        new THREE.Vector3()
      );

    const heading =
      this.player.mesh.rotation.y;

    const forward =
      new THREE.Vector3(
        Math.sin(heading),
        0,
        Math.cos(heading)
      );

    const desired =
      center.clone().addScaledVector(
        forward,
        -12
      );

    const roadSpacing = 80;

    const roadX =
      Math.round(
        desired.x / roadSpacing
      ) * roadSpacing;

    const roadZ =
      Math.round(
        desired.z / roadSpacing
      ) * roadSpacing;

    const distanceToVertical =
      Math.abs(
        desired.x - roadX
      );

    const distanceToHorizontal =
      Math.abs(
        desired.z - roadZ
      );

    if (
      distanceToVertical <
      distanceToHorizontal
    ) {
      this.ownCar.position.set(
        THREE.MathUtils.clamp(
          roadX,
          -960,
          960
        ),
        0,
        THREE.MathUtils.clamp(
          desired.z,
          -990,
          990
        )
      );

      this.ownCar.userData.heading =
        forward.z >= 0
          ? 0
          : Math.PI;
    } else {
      this.ownCar.position.set(
        THREE.MathUtils.clamp(
          desired.x,
          -990,
          990
        ),
        0,
        THREE.MathUtils.clamp(
          roadZ,
          -960,
          960
        )
      );

      this.ownCar.userData.heading =
        forward.x >= 0
          ? Math.PI / 2
          : -Math.PI / 2;
    }

    this.ownCar.rotation.y =
      this.ownCar.userData.heading;

    this.ownCar.visible = true;
    this.ownCar.updateWorldMatrix(
      true,
      true
    );
  }

  mount(vehicle) {
    this.mounted = vehicle;
    this.player.mesh.visible = false;
    this.pendingInteraction = null;

    if (
      typeof this.mounted.userData.heading !==
      "number"
    ) {
      this.mounted.userData.heading =
        this.mounted.rotation.y;
    }

    this.cameraRig.yaw =
      this.mounted.userData.heading;

    this.mountedCameraActiveUntil =
      performance.now() + 1000;

    for (
      const headlight of
      this.mounted.userData.headlights ?? []
    ) {
      headlight.lamp.material.emissiveIntensity = 2.2;
      headlight.light.intensity = 2.4;
    }
  }

  isScreenPointOnMountedVehicle(screenX, screenY) {
    if (!this.mounted) {
      return false;
    }

    this.camera.updateMatrixWorld(true);

    const box =
      new THREE.Box3().setFromObject(
        this.mounted
      );

    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    ];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const corner of corners) {
      corner.project(this.camera);

      const x =
        (corner.x * .5 + .5) *
        innerWidth;

      const y =
        (-corner.y * .5 + .5) *
        innerHeight;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return (
      screenX >= minX &&
      screenX <= maxX &&
      screenY >= minY &&
      screenY <= maxY
    );
  }

  dismount() {
    if (!this.mounted) return;

    const vehicle = this.mounted;
    const heading =
      vehicle.userData.heading;

    const side =
      new THREE.Vector3(
        Math.cos(heading),
        0,
        -Math.sin(heading)
      );

    const vehicleCenter =
      vehicle.getWorldPosition(
        new THREE.Vector3()
      );

    const current =
      this.player.getCenter(
        new THREE.Vector3()
      );

    let destination =
      vehicleCenter.clone();

    destination.y =
      this.player.bodyHeight * .5;

    let distance = 1.8;

    while (distance <= 4.0) {
      destination
        .copy(vehicleCenter)
        .addScaledVector(
          side,
          distance
        );

      destination.y =
        this.player.bodyHeight * .5;

      if (
        !this.playerIntersectsSolids(
          destination
        )
      ) {
        break;
      }

      distance += .2;
    }

    this.player.translate(
      destination.sub(current)
    );

    this.player.velocity.set(
      0,
      0,
      0
    );

    this.player.mesh.rotation.y =
      heading;

    this.pendingInteraction = null;
    this.interactionPath = [];

    for (
      const headlight of
      vehicle.userData.headlights ?? []
    ) {
      headlight.lamp.material.emissiveIntensity = 0;
      headlight.light.intensity = 0;
    }

    for (
      const rearLight of
      vehicle.userData.rearLights ?? []
    ) {
      rearLight.brakeLamp.material.emissiveIntensity = 0;
      rearLight.reverseLamp.material.emissiveIntensity = 0;
    }

    this.spawnSoundWord(
      "CLACK!",
      this.mounted.getWorldPosition(
        new THREE.Vector3()
      ),
      .7
    );

    this.setTireSqueal(false);
    this.vehicleWasColliding = false;
    this.wasAccelerating = false;
    this.wasBraking = false;

    this.mounted = null;
    this.player.mesh.visible = true;

    this.cameraRig.update(
      this.player.getCenter(
        new THREE.Vector3()
      )
    );
  }

  getControlledCenter(out = new THREE.Vector3()) {
    if (this.mounted) {
      return this.mounted.getWorldPosition(out);
    }

    return this.player.getCenter(out);
  }

  emitRearTireSmoke() {
    if (!this.mounted) {
      return;
    }

    for (
      const wheel of
      this.mounted.userData.rearWheels ?? []
    ) {
      const position =
        wheel.getWorldPosition(
          new THREE.Vector3()
        );

      position.y = .08;

      const smoke =
        new THREE.Mesh(
          new THREE.SphereGeometry(
            .12,
            6,
            4
          ),
          new THREE.MeshBasicMaterial({
            color: 0xb8b8b8,
            transparent: true,
            opacity: .32,
            depthWrite: false
          })
        );

      smoke.position.copy(position);

      smoke.userData.life = 0;
      smoke.userData.velocity =
        new THREE.Vector3(
          (Math.random() - .5) * .35,
          .22 + Math.random() * .18,
          (Math.random() - .5) * .35
        );

      this.scene.add(smoke);
      this.rearTireSmoke.push(smoke);
    }
  }

  updateRearTireSmoke(dt) {
    for (
      let i =
        this.rearTireSmoke.length - 1;
      i >= 0;
      i--
    ) {
      const smoke =
        this.rearTireSmoke[i];

      smoke.userData.life += dt;

      smoke.position.addScaledVector(
        smoke.userData.velocity,
        dt
      );

      const life =
        smoke.userData.life;

      smoke.scale.setScalar(
        1 + life * 2.4
      );

      smoke.material.opacity =
        Math.max(
          0,
          .32 * (1 - life / .8)
        );

      if (life >= .8) {
        this.scene.remove(smoke);
        smoke.geometry.dispose();
        smoke.material.dispose();

        this.rearTireSmoke.splice(
          i,
          1
        );
      }
    }
  }

  setTireSqueal(active) {
    if (active) {
      if (!this.tireSquealContext) {
        const AudioContextClass =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContextClass) {
          return;
        }

        this.tireSquealContext =
          new AudioContextClass();
      }

      if (
        this.tireSquealContext.state ===
        "suspended"
      ) {
        this.tireSquealContext.resume();
      }

      if (!this.tireSquealOscillator) {
        const oscillator =
          this.tireSquealContext
            .createOscillator();

        const gain =
          this.tireSquealContext
            .createGain();

        oscillator.type = "sawtooth";
        oscillator.frequency.value = 760;

        gain.gain.value = .035;

        oscillator.connect(gain);
        gain.connect(
          this.tireSquealContext.destination
        );

        oscillator.start();

        this.tireSquealOscillator =
          oscillator;

        this.tireSquealGain =
          gain;
      }

      this.tireSquealGain.gain.value =
        .035;
    } else if (this.tireSquealGain) {
      this.tireSquealGain.gain.value = 0;
    }
  }

  moveMounted(dt) {
    if (!this.mounted) {
      return;
    }

    const movingInput =
      Math.abs(this.input.moveY) > .001;

    const parkedSteer =
      !movingInput &&
      Math.abs(this.input.moveX) > .001;

    const accelerating =
      this.input.moveY > .001;

    if (
      accelerating &&
      !this.wasAccelerating
    ) {
      this.spawnSoundWord(
        "VRRM",
        this.mounted.getWorldPosition(
          new THREE.Vector3()
        ),
        .75
      );
    }

    this.wasAccelerating =
      accelerating;

    const steeringSpeed =
      this.walkTurnSpeed *
      (
        .22 +
        .78 *
        Math.abs(this.input.moveY)
      );

    this.mounted.userData.heading -=
      this.input.moveX *
      steeringSpeed *
      dt;

    const heading =
      this.mounted.userData.heading;

    const steeringAngle =
      -this.input.moveX * .55;

    for (
      const wheel of
      this.mounted.userData.frontWheels ?? []
    ) {
      wheel.rotation.y =
        steeringAngle;
    }

    const forward =
      new THREE.Vector3(
        -Math.sin(heading),
        0,
        -Math.cos(heading)
      );

    const amount =
      this.input.moveY *
      this.moveSpeed *
      4 *
      dt;

    const reversing =
      this.input.moveY < -.001;

    const braking =
      !movingInput ||
      parkedSteer;

    if (
      braking &&
      !this.wasBraking
    ) {
      this.spawnSoundWord(
        parkedSteer
          ? "SKRR!"
          : "CHK!",
        this.mounted.getWorldPosition(
          new THREE.Vector3()
        ),
        parkedSteer
          ? 1.0
          : .55
      );
    }

    this.wasBraking =
      braking;

    this.setTireSqueal(
      parkedSteer
    );

    if (parkedSteer) {
      this.emitRearTireSmoke();
    }

    for (
      const rearLight of
      this.mounted.userData.rearLights ?? []
    ) {
      rearLight.brakeLamp.material.emissiveIntensity =
        braking ? 3.0 : .55;

      rearLight.reverseLamp.material.emissiveIntensity =
        reversing ? 3.0 : 0;
    }

    const previousPosition =
      this.mounted.position.clone();

    const previousRotation =
      this.mounted.rotation.y;

    this.mounted.position.addScaledVector(
      forward,
      amount
    );

    if (
      Math.abs(this.input.moveX) > .001 ||
      Math.abs(this.input.moveY) > .001
    ) {
      this.mounted.rotation.y =
        heading;
    }

    const vehicleColliding =
      this.vehicleIntersectsSolids(
        this.mounted
      );

    if (vehicleColliding) {
      if (!this.vehicleWasColliding) {
        this.spawnSoundWord(
          "CRASH!",
          this.mounted.getWorldPosition(
            new THREE.Vector3()
          ),
          1.8
        );
      }

      this.mounted.position.copy(
        previousPosition
      );

      this.mounted.rotation.y =
        previousRotation;
    }

    this.vehicleWasColliding =
      vehicleColliding;

    if (Math.abs(amount) > .001) {
      const vehicleBox =
        new THREE.Box3().setFromObject(
          this.mounted
        );

      for (const target of this.targets) {
        if (
          !target.alive ||
          !target.targetable ||
          !target.mesh.visible
        ) {
          continue;
        }

        const targetBox =
          new THREE.Box3().setFromObject(
            target.mesh
          );

        if (
          vehicleBox.intersectsBox(
            targetBox
          )
        ) {
          this.hitTarget(
            target,
            false
          );
        }
      }
    }
  }
}
