import * as THREE from "three";

export function createStreetVehicle(type) {

  const vehicle =
    new THREE.Group();

  const paint =
    new THREE.MeshStandardMaterial({
      color:
        new THREE.Color().setHSL(
          Math.random(),
          .35 + Math.random() * .5,
          .22 + Math.random() * .45
        ),
      roughness: .68
    });

  const dark =
    new THREE.MeshStandardMaterial({
      color: 0x171717,
      roughness: .92
    });

  const glass =
    new THREE.MeshStandardMaterial({
      color: 0x34434a,
      roughness: .3
    });

  const addBox = (
    w,
    h,
    d,
    x,
    y,
    z,
    material = paint
  ) => {
    const mesh =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          w,
          h,
          d
        ),
        material
      );

    mesh.position.set(
      x,
      y,
      z
    );

    mesh.castShadow = true;
    vehicle.add(mesh);
    return mesh;
  };

  if (type === "pickup") {
    // Front half: simple car nose + cabin.
    addBox(
      1.86,
      .56,
      2.5,
      0,
      .55,
      -1.0
    );

    addBox(
      1.62,
      .68,
      1.35,
      0,
      1.12,
      -.55,
      glass
    );

    // Rear half: plain open box bed.
    const bedLength = 2.05;
    const bedWidth = 1.82;
    const bedWall = .12;
    const bedHeight = .42;
    const bedZ = 1.45;

    addBox(
      bedWidth,
      .12,
      bedLength,
      0,
      .30,
      bedZ
    );

    addBox(
      bedWall,
      bedHeight,
      bedLength,
      -bedWidth * .5 +
        bedWall * .5,
      .51,
      bedZ
    );

    addBox(
      bedWall,
      bedHeight,
      bedLength,
      bedWidth * .5 -
        bedWall * .5,
      .51,
      bedZ
    );

    addBox(
      bedWidth,
      bedHeight,
      bedWall,
      0,
      .51,
      bedZ + bedLength * .5 -
        bedWall * .5
    );

    addBox(
      bedWidth,
      bedHeight,
      bedWall,
      0,
      .51,
      bedZ - bedLength * .5 +
        bedWall * .5
    );
  } else if (type === "sports") {
    const wedgeGeometry =
      new THREE.BufferGeometry();

    const x0 = -.94;
    const x1 =  .94;

    wedgeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          x0,.12,-2.35,
          x0,.62,-2.35,
          x0,1.02, 1.15,
          x0,.92, 2.15,
          x0,.12, 2.15,

          x1,.12,-2.35,
          x1,.62,-2.35,
          x1,1.02, 1.15,
          x1,.92, 2.15,
          x1,.12, 2.15
        ],
        3
      )
    );

    wedgeGeometry.setIndex([
      0,2,1, 0,3,2, 0,4,3,
      5,6,7, 5,7,8, 5,8,9,
      0,1,6, 0,6,5,
      1,2,7, 1,7,6,
      2,3,8, 2,8,7,
      3,4,9, 3,9,8,
      4,0,5, 4,5,9
    ]);

    wedgeGeometry.computeVertexNormals();

    const wedge =
      new THREE.Mesh(
        wedgeGeometry,
        paint
      );

    wedge.castShadow = true;
    vehicle.add(wedge);

    const canopyGeometry =
      new THREE.BufferGeometry();

    const cx0 = -.68;
    const cx1 =  .68;

    canopyGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          cx0,.98,-.45,
          cx0,1.47, .02,
          cx0,1.40, .82,
          cx0,1.00, 1.18,

          cx1,.98,-.45,
          cx1,1.47, .02,
          cx1,1.40, .82,
          cx1,1.00, 1.18
        ],
        3
      )
    );

    canopyGeometry.setIndex([
      0,2,1, 0,3,2,
      4,5,6, 4,6,7,
      0,1,5, 0,5,4,
      1,2,6, 1,6,5,
      2,3,7, 2,7,6,
      3,0,4, 3,4,7
    ]);

    canopyGeometry.computeVertexNormals();

    const canopy =
      new THREE.Mesh(
        canopyGeometry,
        glass
      );

    canopy.castShadow = true;
    vehicle.add(canopy);
  } else {
    addBox(
      1.86,
      .58,
      4.5,
      0,
      .55,
      0
    );

    addBox(
      1.62,
      .68,
      1.9,
      0,
      1.12,
      .15,
      glass
    );
  }

  const wheelGeometry =
    new THREE.CylinderGeometry(
      .34,
      .34,
      .16,
      16
    );

  wheelGeometry.rotateZ(
    Math.PI / 2
  );

  vehicle.userData.frontWheels = [];
  vehicle.userData.rearWheels = [];
  vehicle.userData.rearLights = [];

  const wheelZ =
    type === "pickup"
      ? 1.55
      : type === "sports"
        ? 1.45
        : 1.55;

  for (const [
    x,
    z,
    front
  ] of [
    [-.88, -wheelZ, true],
    [ .88, -wheelZ, true],
    [-.88,  wheelZ, false],
    [ .88,  wheelZ, false]
  ]) {
    const pivot =
      new THREE.Group();

    pivot.position.set(
      x,
      .34,
      z
    );

    const wheel =
      new THREE.Mesh(
        wheelGeometry,
        dark
      );

    wheel.castShadow = true;
    pivot.add(wheel);
    vehicle.add(pivot);

    (
      front
        ? vehicle.userData.frontWheels
        : vehicle.userData.rearWheels
    ).push(pivot);
  }

  for (const x of [-.58, .58]) {
    const brakeLamp =
      addBox(
        .34,
        .14,
        .05,
        x,
        .58,
        type === "pickup"
          ? 2.64
          : 2.28,
        new THREE.MeshStandardMaterial({
          color: 0x4a0808,
          emissive: 0xff0000,
          emissiveIntensity: 0,
          roughness: .4
        })
      );

    const reverseLamp =
      addBox(
        .12,
        .1,
        .055,
        x,
        .58,
        type === "pickup"
          ? 2.68
          : 2.31,
        new THREE.MeshStandardMaterial({
          color: 0xaaa89d,
          emissive: 0xffffff,
          emissiveIntensity: 0,
          roughness: .35
        })
      );

    vehicle.userData.rearLights.push({
      brakeLamp,
      reverseLamp
    });
  }

  vehicle.userData.heading = 0;
  vehicle.userData.vehicleType =
    type;

  return vehicle;
    
}
