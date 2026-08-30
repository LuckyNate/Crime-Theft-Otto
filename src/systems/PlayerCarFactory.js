import * as THREE from "three";

export function createPlayerCar() {

  const car =
    new THREE.Group();

  const carPaint =
    new THREE.MeshStandardMaterial({
      color: 0x0c0c0c,
      roughness: .68
    });

  const tireMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: .95
    });

  const glassMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x3e4c52,
      roughness: .28
    });

  const trimMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x1d1d1d,
      roughness: .85
    });

  const lampMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xd7d4c6,
      emissive: 0xfff4cf,
      emissiveIntensity: 0,
      roughness: .35
    });

  // Simple lower shell. Keep the wheel openings as shallow side
  // cutouts rather than making the whole body an extruded side profile.
  const bodyGeometry =
    new THREE.BufferGeometry();

  const bx0 = -.93;
  const bx1 =  .93;

  const bodyVertices = [
    bx0,.28,-2.60,
    bx0,.78,-2.60,
    bx0,.84,-1.05,
    bx0,.84, 1.42,
    bx0,.77, 2.60,
    bx0,.28, 2.60,

    bx1,.28,-2.60,
    bx1,.78,-2.60,
    bx1,.84,-1.05,
    bx1,.84, 1.42,
    bx1,.77, 2.60,
    bx1,.28, 2.60
  ];

  bodyGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      bodyVertices,
      3
    )
  );

  bodyGeometry.setIndex([
    0,2,1, 0,3,2, 0,4,3, 0,5,4,
    6,7,8, 6,8,9, 6,9,10, 6,10,11,
    0,1,7, 0,7,6,
    1,2,8, 1,8,7,
    2,3,9, 2,9,8,
    3,4,10, 3,10,9,
    4,5,11, 4,11,10,
    5,0,6, 5,6,11
  ]);

  bodyGeometry.computeVertexNormals();

  const body =
    new THREE.Mesh(
      bodyGeometry,
      carPaint
    );

  body.castShadow = true;
  car.add(body);


  // One tapered greenhouse supplies the GN side and front/rear silhouette.
  const cabinGeometry =
    new THREE.BufferGeometry();

  const xBottom0 = -.78;
  const xBottom1 =  .78;
  const xTop0 = -.66;
  const xTop1 =  .66;

  const y0 = .84;
  const y1 = 1.50;

  const frontBottom = -.82;
  const frontTop = -.42;
  const rearTop = .88;
  const rearBottom = 1.28;

  cabinGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        xBottom0,y0,frontBottom,
        xTop0,y1,frontTop,
        xTop0,y1,rearTop,
        xBottom0,y0,rearBottom,

        xBottom1,y0,frontBottom,
        xTop1,y1,frontTop,
        xTop1,y1,rearTop,
        xBottom1,y0,rearBottom
      ],
      3
    )
  );

  cabinGeometry.setIndex([
    0,2,1, 0,3,2,
    4,5,6, 4,6,7,
    0,5,4, 0,1,5,
    1,6,5, 1,2,6,
    2,7,6, 2,3,7,
    3,4,7, 3,0,4
  ]);

  cabinGeometry.computeVertexNormals();

  const cabin =
    new THREE.Mesh(
      cabinGeometry,
      carPaint
    );

  cabin.castShadow = true;
  car.add(cabin);

  // One front grille panel.
  const grille =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        .76,
        .24,
        .045
      ),
      trimMaterial
    );

  grille.position.set(
    0,
    .61,
    -2.63
  );

  car.add(grille);

  car.userData.headlights = [];

  // Four square lamps are one of the few details worth keeping.
  for (const x of [-.67, -.43, .43, .67]) {
    const lamp =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .19,
          .17,
          .04
        ),
        lampMaterial.clone()
      );

    lamp.position.set(
      x,
      .64,
      -2.63
    );

    car.add(lamp);

    const light =
      new THREE.PointLight(
        0xfff1c4,
        0,
        10,
        2
      );

    light.position.set(
      x,
      .64,
      -2.78
    );

    car.add(light);

    car.userData.headlights.push({
      lamp,
      light
    });
  }

  car.userData.rearLights = [];

  // Rear combination lamps: red normally, brighter under braking,
  // white when reversing.
  for (const x of [-.62, .62]) {
    const brakeLamp =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .42,
          .16,
          .04
        ),
        new THREE.MeshStandardMaterial({
          color: 0x4a0808,
          emissive: 0xff0000,
          emissiveIntensity: 0,
          roughness: .4
        })
      );

    brakeLamp.position.set(
      x,
      .62,
      2.63
    );

    car.add(brakeLamp);

    const reverseLamp =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .14,
          .12,
          .045
        ),
        new THREE.MeshStandardMaterial({
          color: 0xaaa89d,
          emissive: 0xffffff,
          emissiveIntensity: 0,
          roughness: .35
        })
      );

    reverseLamp.position.set(
      x,
      .62,
      2.655
    );

    car.add(reverseLamp);

    car.userData.rearLights.push({
      brakeLamp,
      reverseLamp
    });
  }

  const wheelGeometry =
    new THREE.CylinderGeometry(
      .35,
      .35,
      .16,
      18
    );

  wheelGeometry.rotateZ(
    Math.PI / 2
  );

  const wheelPositions = [
    [-.88, .35, -1.40, true],
    [ .88, .35, -1.40, true],
    [-.88, .35,  1.40, false],
    [ .88, .35,  1.40, false]
  ];

  car.userData.frontWheels = [];
  car.userData.rearWheels = [];

  for (const [
    x,
    y,
    z,
    front
  ] of wheelPositions) {
    const wheelPivot =
      new THREE.Group();

    wheelPivot.position.set(
      x,
      y,
      z
    );

    const wheel =
      new THREE.Mesh(
        wheelGeometry,
        tireMaterial
      );

    wheel.castShadow = true;
    wheelPivot.add(wheel);
    car.add(wheelPivot);

    if (front) {
      car.userData.frontWheels.push(
        wheelPivot
      );
    } else {
      car.userData.rearWheels.push(
        wheelPivot
      );
    }
  }

  car.position.set(
    8,
    0,
    -5
  );

  return car;
}
