import * as THREE from "three";
import { BeerInteractable, SeatInteractable, DoorHandleInteractable } from "../GameSupport.js";
import { GameSystem } from "./GameSystem.js";

export class WorldSystem extends GameSystem {
  constructor(game) {
    super(game, { roads: [], obstacles: [], door: null, visualPlanetRadius: 1800 });
  }

  applyHorizonCurve(material) {
    material.onBeforeCompile = shader => {
      shader.uniforms.visualPlanetRadius = { value: this.visualPlanetRadius };
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>\nuniform float visualPlanetRadius;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\n\nvec3 objectCenterWorld = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);\nvec3 cameraToObject = objectCenterWorld - cameraPosition;\nfloat horizontalDistance = length(cameraToObject.xz);\nif (horizontalDistance > 0.001 && visualPlanetRadius > 0.0) {\n  vec2 away = normalize(cameraToObject.xz);\n  float angle = horizontalDistance / visualPlanetRadius;\n  float s = sin(angle);\n  float c = cos(angle);\n  float vertical = transformed.y;\n  transformed.x += away.x * vertical * s;\n  transformed.z += away.y * vertical * s;\n  transformed.y = vertical * c;\n}`
      );
    };
    material.needsUpdate = true;
    return material;
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
        new THREE.PlaneGeometry(2000,2000),
        new THREE.MeshStandardMaterial({
          color: 0x8f9190,
          roughness:1
        })
      );

    ground.rotation.x =
      -Math.PI / 2;

    ground.position.y = -.2;

    ground.receiveShadow = true;

    this.scene.add(ground);

    // Simple city road grid.
    const roadMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x343536,
        roughness: 1
      });

    const roadWidth = 16;
    const roadSpacing = 80;
    const roadExtent = 2000;

    const northSouthRoadGeometry =
      new THREE.PlaneGeometry(
        roadWidth,
        roadExtent
      );

    northSouthRoadGeometry.rotateX(
      -Math.PI / 2
    );

    const eastWestRoadGeometry =
      new THREE.PlaneGeometry(
        roadExtent,
        roadWidth
      );

    eastWestRoadGeometry.rotateX(
      -Math.PI / 2
    );

    for (
      let offset = -960;
      offset <= 960;
      offset += roadSpacing
    ) {
      const northSouthRoad =
        new THREE.Mesh(
          northSouthRoadGeometry,
          roadMaterial
        );

      northSouthRoad.position.set(
        offset,
        .006,
        0
      );

      northSouthRoad.receiveShadow = true;
      northSouthRoad.userData.isRoad = true;
      this.scene.add(northSouthRoad);
      this.roads.push(northSouthRoad);

      const eastWestRoad =
        new THREE.Mesh(
          eastWestRoadGeometry,
          roadMaterial
        );

      eastWestRoad.position.set(
        0,
        .007,
        offset
      );

      eastWestRoad.receiveShadow = true;
      eastWestRoad.userData.isRoad = true;
      this.scene.add(eastWestRoad);
      this.roads.push(eastWestRoad);
    }

    // Self-generating city blocks: sidewalks, multiple buildings,
    // gaps, and a central alley through each road-bounded block.
    const buildingMaterial =
      this.applyHorizonCurve(
        new THREE.MeshStandardMaterial({
          color: 0x68645f,
          roughness: 1
        })
      );

    const sidewalkMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xa8a6a1,
        roughness: 1
      });

    const blockSize =
      roadSpacing - roadWidth;

    const sidewalkInset = 4;
    const alleyWidth = 6;

    const blockCenters = [];

    for (
      let x = -920;
      x <= 920;
      x += roadSpacing
    ) {
      for (
        let z = -920;
        z <= 920;
        z += roadSpacing
      ) {
        blockCenters.push([x,z]);
      }
    }

    for (const [blockX,blockZ] of blockCenters) {
      const usable =
        blockSize -
        sidewalkInset * 2;

      const lot =
        (usable - alleyWidth) * .5;

      const buildingWidth =
        lot - 3;

      const buildingDepth =
        lot - 3;

      const sidewalkWidth =
        sidewalkInset + 1.5;

      const sidewalkY = .02;

      const addSidewalk = (
        width,
        depth,
        x,
        z
      ) => {
        const sidewalk =
          new THREE.Mesh(
            new THREE.PlaneGeometry(
              width,
              depth
            ),
            sidewalkMaterial
          );

        sidewalk.rotation.x =
          -Math.PI / 2;

        sidewalk.position.set(
          x,
          sidewalkY,
          z
        );

        sidewalk.receiveShadow = true;
        this.scene.add(sidewalk);
      };

      addSidewalk(
        blockSize,
        sidewalkWidth,
        blockX,
        blockZ -
          blockSize * .5 +
          sidewalkWidth * .5
      );

      addSidewalk(
        blockSize,
        sidewalkWidth,
        blockX,
        blockZ +
          blockSize * .5 -
          sidewalkWidth * .5
      );

      addSidewalk(
        sidewalkWidth,
        blockSize -
          sidewalkWidth * 2,
        blockX -
          blockSize * .5 +
          sidewalkWidth * .5,
        blockZ
      );

      addSidewalk(
        sidewalkWidth,
        blockSize -
          sidewalkWidth * 2,
        blockX +
          blockSize * .5 -
          sidewalkWidth * .5,
        blockZ
      );

      for (const sx of [-1,1]) {
        for (const sz of [-1,1]) {
          const height =
            10 +
            Math.random() * 24;

          const buildingX =
            blockX +
            sx *
            (alleyWidth * .5 +
             lot * .5);

          const buildingZ =
            blockZ +
            sz *
            (alleyWidth * .5 +
             lot * .5);

          const isBarLot =
            blockX === 40 &&
            blockZ === 40 &&
            sx === -1 &&
            sz === -1;

          if (isBarLot) {
            this.buildBar(
              buildingX,
              buildingZ,
              buildingWidth,
              buildingDepth,
              height
            );
          } else {
            const building =
              new THREE.Mesh(
                new THREE.BoxGeometry(
                  buildingWidth,
                  height,
                  buildingDepth
                ),
                this.applyHorizonCurve(
                  new THREE.MeshStandardMaterial({
                    color:
                      new THREE.Color().setHSL(
                        Math.random(),
                        .08 + Math.random() * .22,
                        .28 + Math.random() * .32
                      ),
                    roughness: 1
                  })
                )
              );

            building.position.set(
              buildingX,
              height * .5,
              buildingZ
            );

            building.castShadow = true;
            building.receiveShadow = true;

            this.scene.add(building);
            this.obstacles.push(building);
          }
        }
      }
    }
  }

  buildBar(
    centerX,
    centerZ,
    width,
    depth,
    buildingHeight
  ) {
    const wallMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x51453d,
        roughness: 1
      });

    const floor =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          width,
          depth
        ),
        new THREE.MeshStandardMaterial({
          color: 0x4b4036,
          roughness: 1
        })
      );

    floor.rotation.x =
      -Math.PI / 2;

    floor.position.set(
      centerX,
      .025,
      centerZ
    );

    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallHeight = 3.0;
    const wallThickness = .35;
    const doorwayWidth = 2.4;
    const sideWidth =
      (width - doorwayWidth) * .5;

    const upperHeight =
      Math.max(
        0,
        buildingHeight - wallHeight
      );

    if (upperHeight > 0) {
      const upperBuilding =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            width,
            upperHeight,
            depth
          ),
          this.applyHorizonCurve(
            new THREE.MeshStandardMaterial({
              color:
                new THREE.Color().setHSL(
                  Math.random(),
                  .08 + Math.random() * .22,
                  .28 + Math.random() * .32
                ),
              roughness: 1
            })
          )
        );

      upperBuilding.position.set(
        centerX,
        wallHeight +
          upperHeight * .5,
        centerZ
      );

      upperBuilding.castShadow = true;
      upperBuilding.receiveShadow = true;

      this.scene.add(
        upperBuilding
      );

      this.obstacles.push(
        upperBuilding
      );
    }

    const addWall =
      (w, h, d, x, y, z) => {
        const wall =
          new THREE.Mesh(
            new THREE.BoxGeometry(
              w,
              h,
              d
            ),
            wallMaterial
          );

        wall.position.set(
          x,
          y,
          z
        );

        wall.castShadow = true;
        wall.receiveShadow = true;

        this.scene.add(wall);
        this.obstacles.push(wall);

        return wall;
      };

    addWall(
      width,
      wallHeight,
      wallThickness,
      centerX,
      wallHeight * .5,
      centerZ + depth * .5
    );

    addWall(
      wallThickness,
      wallHeight,
      depth,
      centerX - width * .5,
      wallHeight * .5,
      centerZ
    );

    addWall(
      wallThickness,
      wallHeight,
      depth,
      centerX + width * .5,
      wallHeight * .5,
      centerZ
    );

    const frontZ =
      centerZ - depth * .5;

    addWall(
      sideWidth,
      wallHeight,
      wallThickness,
      centerX -
        doorwayWidth * .5 -
        sideWidth * .5,
      wallHeight * .5,
      frontZ
    );

    addWall(
      sideWidth,
      wallHeight,
      wallThickness,
      centerX +
        doorwayWidth * .5 +
        sideWidth * .5,
      wallHeight * .5,
      frontZ
    );

    const door =
      new THREE.Group();

    door.position.set(
      centerX - .9,
      0,
      frontZ
    );

    door.userData.state =
      "closed";

    const doorPanel =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          1.8,
          2.4,
          .18
        ),
        new THREE.MeshStandardMaterial({
          color: 0x6b4423
        })
      );

    doorPanel.position.set(
      .9,
      1.2,
      0
    );

    doorPanel.castShadow = true;
    door.add(doorPanel);

    const handle =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .55,
          .12,
          .5
        ),
        new THREE.MeshStandardMaterial({
          color: 0xb0b0b0
        })
      );

    handle.position.set(
      1.45,
      1.0,
      0
    );

    handle.castShadow = true;
    door.add(handle);

    this.scene.add(door);
    this.obstacles.push(door);
    this.door = door;

    this.addInteractable(
      new DoorHandleInteractable(
        handle,
        door
      )
    );

    const barTop =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          width * .62,
          .9,
          .8
        ),
        new THREE.MeshStandardMaterial({
          color: 0x5d3520,
          roughness: .9
        })
      );

    barTop.position.set(
      centerX,
      .45,
      centerZ + depth * .25
    );

    barTop.castShadow = true;
    this.scene.add(barTop);
    this.obstacles.push(barTop);

    const beer =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          .12,
          .12,
          .55,
          12
        ),
        new THREE.MeshStandardMaterial({
          color: 0x8b5a2b
        })
      );

    beer.position.set(
      centerX,
      1.175,
      centerZ + depth * .25
    );

    beer.castShadow = true;
    this.scene.add(beer);

    this.addInteractable(
      new BeerInteractable(
        beer,
        3000
      )
    );

    const seat =
      new THREE.Group();

    seat.position.set(
      centerX - 2.2,
      0,
      centerZ + depth * .1
    );

    const seatMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x3c2a20,
        roughness: .95
      });

    const seatPad =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .9,
          .18,
          .9
        ),
        seatMaterial
      );

    seatPad.position.y = .55;
    seat.add(seatPad);

    const seatBack =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .9,
          1.0,
          .16
        ),
        seatMaterial
      );

    seatBack.position.set(
      0,
      1.0,
      .37
    );

    seat.add(seatBack);

    const seatBase =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .18,
          .55,
          .18
        ),
        seatMaterial
      );

    seatBase.position.y = .275;
    seat.add(seatBase);

    this.scene.add(seat);
    this.obstacles.push(seat);

    this.addInteractable(
      new SeatInteractable(
        seatPad,
        seat
      )
    );
  }

  update(dt) {
    if (!this.door) return;

    const state = this.door.userData.state;

    if (state === "opening") {
      this.door.rotation.y = Math.max(
        -Math.PI / 2,
        this.door.rotation.y - 2.5 * dt
      );

      if (this.door.rotation.y <= -Math.PI / 2) {
        this.door.rotation.y = -Math.PI / 2;
        this.door.userData.state = "open";
      }
    } else if (state === "open") {
      const playerPosition = this.player.getCenter(new THREE.Vector3());
      const doorPosition = this.door.getWorldPosition(new THREE.Vector3());
      const distance = Math.hypot(
        playerPosition.x - doorPosition.x,
        playerPosition.z - doorPosition.z
      );

      if (distance > 5) {
        this.door.userData.state = "closing";
      }
    } else if (state === "closing") {
      this.door.rotation.y = Math.min(
        0,
        this.door.rotation.y + 2.5 * dt
      );

      if (this.door.rotation.y >= 0) {
        this.door.rotation.y = 0;
        this.door.userData.state = "closed";
      }
    }
  }
}
