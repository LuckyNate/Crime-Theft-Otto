import * as THREE from "three";
import { ObstacleOctree, Interactable, RotateInteractable, DoorHandleInteractable, ConsumableInteractable, FoodInteractable, DrinkInteractable, SmokeInteractable, DrugInteractable, BeerInteractable, SeatInteractable, MountInteractable } from "./GameSupport.js";

export function applyGamePart1(Game) {
  Object.assign(Game.prototype, {
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
    
        const pedestrianCount = 28;
    
        for (
          let i = 0;
          i < pedestrianCount;
          i++
        ) {
          const mesh =
            new THREE.Mesh(
              new THREE.CapsuleGeometry(
                .34,
                1.05,
                6,
                12
              ),
              new THREE.MeshStandardMaterial({
                color: 0xe8893a,
                emissive: 0x000000,
                emissiveIntensity: 0
              })
            );
    
          mesh.castShadow = true;
          mesh.visible = false;
    
          this.scene.add(mesh);
    
          this.targets.push({
            mesh,
            targetable: false,
            alive: true,
            spawn: new THREE.Vector3(),
            respawnAt: 0,
            sidewalkBlockX: 0,
            sidewalkBlockZ: 0,
            sidewalkDistance: 0,
            sidewalkDirection:
              Math.random() < .5
                ? -1
                : 1,
            walkSpeed:
              1.0 +
              Math.random() * .8
          });
        }
    
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
    
        this.ownCar = car;
        this.scene.add(car);
    
        this.phonePanel =
          document.getElementById(
            "phonePanel"
          );
    
        this.carContact =
          document.getElementById(
            "carContact"
          );
    
        this.photoContact =
          document.getElementById(
            "photoContact"
          );
    
        this.homeContact =
          document.getElementById(
            "homeContact"
          );
    
        this.carContact.addEventListener(
          "pointerdown",
          event => {
            event.stopPropagation();
            event.preventDefault();
    
            this.summonOwnCarBehind();
            this.setPhoneOpen(false);
          }
        );
    
        this.photoContact.addEventListener(
          "pointerdown",
          event => {
            event.stopPropagation();
            event.preventDefault();
    
            this.takePhonePhoto();
          }
        );
    
        this.homeContact.addEventListener(
          "pointerdown",
          event => {
            event.stopPropagation();
            event.preventDefault();
    
            this.fastTravelHome();
            this.setPhoneOpen(false);
          }
        );
    
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
            this.createStreetVehicle(
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
  });
}
