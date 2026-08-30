import * as THREE from "three";

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;

    this.yaw = 0;
    this.pitch = -0.08;

    this.distance = 4.8;
    this.height = 1.6;

    this.sensitivity = 0.004;

    this.tapRaycaster = new THREE.Raycaster();
  }

  applyLook(delta) {
    this.yaw -= delta.x * this.sensitivity;
    this.pitch -= delta.y * this.sensitivity;

    this.pitch = THREE.MathUtils.clamp(
      this.pitch,
      -1.0,
      0.55
    );
  }

  lookAtScreenPoint(screenX, screenY) {
    const ndc = new THREE.Vector2(
      (screenX / innerWidth) * 2 - 1,
      -(screenY / innerHeight) * 2 + 1
    );

    this.camera.updateMatrixWorld(true);

    this.tapRaycaster.setFromCamera(
      ndc,
      this.camera
    );

    const dir = this.tapRaycaster.ray.direction;

    this.yaw = Math.atan2(
      -dir.x,
      -dir.z
    );

    this.pitch = THREE.MathUtils.clamp(
      Math.asin(
        THREE.MathUtils.clamp(dir.y, -1, 1)
      ),
      -1.0,
      0.55
    );
  }

  forward(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);

    out.set(
      -Math.sin(this.yaw) * cp,
       Math.sin(this.pitch),
      -Math.cos(this.yaw) * cp
    );

    return out.normalize();
  }

  planarForward(out = new THREE.Vector3()) {
    out.set(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );

    return out.normalize();
  }

  planarRight(out = new THREE.Vector3()) {
    out.set(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );

    return out.normalize();
  }

  update(playerCenter) {
    const lookAt = playerCenter.clone();
    lookAt.y += 0.65;

    const forward = this.forward(new THREE.Vector3());

    const targetPos = lookAt.clone()
      .addScaledVector(forward, -this.distance);

    targetPos.y += this.height;

    this.camera.position.lerp(
      targetPos,
      0.16
    );

    const cameraFloor = .08;

    if (
      this.camera.position.y <
      cameraFloor
    ) {
      this.camera.position.y =
        cameraFloor;
    }

    this.camera.lookAt(lookAt);
  }
}
