import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";

export class Player {
  constructor(scene) {
    this.radius = 0.38;
    this.bodyHeight = 1.8;

    this.collider = new Capsule(
      new THREE.Vector3(0, this.radius, 0),
      new THREE.Vector3(0, this.bodyHeight - this.radius, 0),
      this.radius
    );

    this.velocity = new THREE.Vector3();

    const geometry = new THREE.CapsuleGeometry(
      this.radius,
      this.bodyHeight - this.radius * 2,
      8,
      16
    );

    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ roughness:.85 })
    );

    this.mesh.castShadow = true;
    scene.add(this.mesh);

    this.sync();
  }

  getCenter(out = new THREE.Vector3()) {
    return this.collider.getCenter(out);
  }

  translate(v) {
    this.collider.translate(v);
    this.sync();
  }

  sync() {
    this.mesh.position.copy(this.collider.getCenter(new THREE.Vector3()));
  }
}
