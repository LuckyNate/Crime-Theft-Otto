import * as THREE from "three";

export class AutoAim {
  constructor(camera, skills) {
    this.camera = camera;
    this.skills = skills;

    this.frustum = new THREE.Frustum();
    this.pv = new THREE.Matrix4();

    this.baseAmbiguity = THREE.MathUtils.degToRad(1.5);
  }

  acquire(origin, lookDir, targets) {
    this.camera.updateMatrixWorld();

    this.pv.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );

    this.frustum.setFromProjectionMatrix(this.pv);

    const shooting = this.skills.get("shooting");

    const ambiguity =
      this.baseAmbiguity * shooting;

    const maxRange =
      60 * shooting;

    const list = [];

    for (const t of targets) {
      if (!t.targetable) continue;
      if (!this.frustum.intersectsObject(t.mesh)) continue;

      const aimPoint =
        t.mesh.position.clone().add(new THREE.Vector3(0, .45, 0));

      const delta =
        aimPoint.sub(origin);

      const distance =
        delta.length();

      if (distance > maxRange) continue;

      delta.normalize();

      const dot =
        THREE.MathUtils.clamp(
          lookDir.dot(delta),
          -1,
          1
        );

      const angle =
        Math.acos(dot);

      list.push({
        target:t,
        angle,
        distance
      });
    }

    list.sort((a,b) => {
      if (Math.abs(a.angle - b.angle) <= ambiguity) {
        return a.distance - b.distance;
      }

      return a.angle - b.angle;
    });

    return list[0]?.target ?? null;
  }
}
