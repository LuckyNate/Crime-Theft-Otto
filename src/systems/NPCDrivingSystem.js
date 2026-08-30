import * as THREE from "three";
import { GameSystem } from "./GameSystem.js";

export class NPCDrivingSystem extends GameSystem {
  constructor(game) {
    super(game, {
      drivers: [],
      initialized: false
    });
  }

  initialize(now) {
    if (this.initialized) return;

    const vehicles =
      this.parkedVehicles.filter(
        vehicle =>
          vehicle !== this.ownCar &&
          vehicle.visible &&
          vehicle !== this.mounted
      );

    const pedestrians =
      this.targets.filter(
        target =>
          target.alive &&
          target.mesh.visible &&
          !target.vehicleActivity
      );

    const count =
      Math.min(5, vehicles.length, pedestrians.length);

    if (!count) return;

    for (let i = 0; i < count; i++) {
      const driver = {
        target: pedestrians[i],
        vehicle: vehicles[i],
        state: "walkingToCar",
        until: 0,
        driveSpeed: 6 + Math.random() * 3,
        walkDirection: new THREE.Vector3()
      };

      pedestrians[i].vehicleActivity = driver;
      vehicles[i].userData.npcDriver = driver;
      this.drivers.push(driver);
    }

    this.initialized = true;
  }

  update(dt, now) {
    this.initialize(now);

    const center =
      this.getControlledCenter(
        new THREE.Vector3()
      );

    for (const driver of this.drivers) {
      const { target, vehicle } = driver;

      if (!target.alive) {
        this.releaseDriver(driver, center, false);
        continue;
      }

      if (vehicle === this.mounted) {
        this.releaseDriver(driver, center, true);
        continue;
      }

      const distance =
        Math.hypot(
          vehicle.position.x - center.x,
          vehicle.position.z - center.z
        );

      if (distance > 150) {
        this.placeParkedVehicleNear(
          vehicle,
          center,
          false
        );
        this.exitVehicle(driver, now);
      }

      if (driver.state === "walkingToCar") {
        this.walkToVehicle(driver, dt, now);
      } else if (driver.state === "driving") {
        this.driveVehicle(driver, dt, now);
      } else if (driver.state === "parked") {
        if (now >= driver.until) {
          this.exitVehicle(driver, now);
        }
      } else if (driver.state === "walkingAway") {
        this.walkAway(driver, dt, now);
      } else if (
        driver.state === "waiting" &&
        now >= driver.until
      ) {
        this.chooseVehicle(driver);
      }
    }
  }

  walkToVehicle(driver, dt, now) {
    const { target, vehicle } = driver;

    if (!vehicle.visible) {
      driver.state = "waiting";
      driver.until = now + 1000;
      return;
    }

    const destination =
      vehicle.getWorldPosition(
        new THREE.Vector3()
      );

    destination.y = .9;

    const delta =
      destination.sub(
        target.mesh.position
      );

    const distance =
      Math.hypot(delta.x, delta.z);

    if (distance <= 1.35) {
      target.mesh.visible = false;
      target.targetable = false;
      driver.state = "driving";
      driver.until =
        now + 5000 + Math.random() * 7000;
      return;
    }

    delta.y = 0;
    delta.normalize();

    target.mesh.position.addScaledVector(
      delta,
      target.walkSpeed * 1.2 * dt
    );

    target.mesh.rotation.y =
      Math.atan2(delta.x, delta.z);

    target.spawn.copy(target.mesh.position);
  }

  driveVehicle(driver, dt, now) {
    const { vehicle } = driver;
    const heading =
      typeof vehicle.userData.heading === "number"
        ? vehicle.userData.heading
        : vehicle.rotation.y;

    vehicle.userData.heading = heading;
    vehicle.rotation.y = heading;

    const forward =
      new THREE.Vector3(
        -Math.sin(heading),
        0,
        -Math.cos(heading)
      );

    vehicle.position.addScaledVector(
      forward,
      driver.driveSpeed * dt
    );

    if (now >= driver.until) {
      driver.state = "parked";
      driver.until = now + 700;
    }
  }

  exitVehicle(driver, now) {
    const { target, vehicle } = driver;
    const heading =
      typeof vehicle.userData.heading === "number"
        ? vehicle.userData.heading
        : vehicle.rotation.y;

    const side =
      new THREE.Vector3(
        Math.cos(heading),
        0,
        -Math.sin(heading)
      );

    target.mesh.position.copy(vehicle.position);
    target.mesh.position.addScaledVector(side, 1.7);
    target.mesh.position.y = .9;
    target.mesh.visible = true;
    target.targetable = true;
    target.spawn.copy(target.mesh.position);

    driver.walkDirection.copy(side);
    driver.state = "walkingAway";
    driver.until = now + 2200;
  }

  walkAway(driver, dt, now) {
    const { target } = driver;

    target.mesh.position.addScaledVector(
      driver.walkDirection,
      target.walkSpeed * dt
    );

    target.mesh.rotation.y =
      Math.atan2(
        driver.walkDirection.x,
        driver.walkDirection.z
      );

    target.spawn.copy(target.mesh.position);

    if (now >= driver.until) {
      driver.state = "waiting";
      driver.until =
        now + 2500 + Math.random() * 4500;
    }
  }

  chooseVehicle(driver) {
    const available =
      this.parkedVehicles.filter(
        vehicle =>
          vehicle !== this.ownCar &&
          vehicle !== this.mounted &&
          vehicle.visible &&
          !vehicle.userData.npcDriver
      );

    if (!available.length) {
      driver.until = performance.now() + 1500;
      return;
    }

    if (driver.vehicle?.userData.npcDriver === driver) {
      driver.vehicle.userData.npcDriver = null;
    }

    driver.vehicle =
      available[
        Math.floor(Math.random() * available.length)
      ];

    driver.vehicle.userData.npcDriver = driver;
    driver.state = "walkingToCar";
  }

  releaseDriver(driver, center, keepPedestrian) {
    if (driver.vehicle?.userData.npcDriver === driver) {
      driver.vehicle.userData.npcDriver = null;
    }

    if (keepPedestrian && driver.target.alive) {
      driver.target.mesh.position.copy(driver.vehicle.position);
      driver.target.mesh.position.y = .9;
      driver.target.mesh.visible = true;
      driver.target.targetable = true;
      driver.target.spawn.copy(driver.target.mesh.position);
    } else if (driver.target.alive) {
      this.placePedestrianNear(
        driver.target,
        center,
        false
      );
    }

    driver.target.vehicleActivity = null;
    driver.state = "inactive";
    driver.until = Infinity;
  }
}
