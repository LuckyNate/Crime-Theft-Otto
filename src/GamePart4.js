import * as THREE from "three";
import { ObstacleOctree, Interactable, RotateInteractable, DoorHandleInteractable, ConsumableInteractable, FoodInteractable, DrinkInteractable, SmokeInteractable, DrugInteractable, BeerInteractable, SeatInteractable, MountInteractable } from "./GameSupport.js";

export function applyGamePart4(Game) {
  Object.assign(Game.prototype, {
    buildBar(centerX,centerZ,width,depth,buildingHeight) {
      const wallMaterial=new THREE.MeshStandardMaterial({color:0x51453d,roughness:1});
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({color:0x4b4036,roughness:1}));
      floor.rotation.x=-Math.PI/2; floor.position.set(centerX,.025,centerZ); floor.receiveShadow=true; this.scene.add(floor);
      const wallHeight=3.0, wallThickness=.35, doorwayWidth=2.4, sideWidth=(width-doorwayWidth)*.5;
      const upperHeight=Math.max(0,buildingHeight-wallHeight);
      if(upperHeight>0){const upperBuilding=new THREE.Mesh(new THREE.BoxGeometry(width,upperHeight,depth),this.applyHorizonCurve(new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(Math.random(),.08+Math.random()*.22,.28+Math.random()*.32),roughness:1}))); upperBuilding.position.set(centerX,wallHeight+upperHeight*.5,centerZ); upperBuilding.castShadow=true; upperBuilding.receiveShadow=true; this.scene.add(upperBuilding); this.obstacles.push(upperBuilding);}
      const addWall=(w,h,d,x,y,z)=>{const wall=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMaterial);wall.position.set(x,y,z);wall.castShadow=true;wall.receiveShadow=true;this.scene.add(wall);this.obstacles.push(wall);return wall;};
      addWall(width,wallHeight,wallThickness,centerX,wallHeight*.5,centerZ+depth*.5);
      addWall(wallThickness,wallHeight,depth,centerX-width*.5,wallHeight*.5,centerZ);
      addWall(wallThickness,wallHeight,depth,centerX+width*.5,wallHeight*.5,centerZ);
      const frontZ=centerZ-depth*.5;
      addWall(sideWidth,wallHeight,wallThickness,centerX-doorwayWidth*.5-sideWidth*.5,wallHeight*.5,frontZ);
      addWall(sideWidth,wallHeight,wallThickness,centerX+doorwayWidth*.5+sideWidth*.5,wallHeight*.5,frontZ);
      const door=new THREE.Group(); door.position.set(centerX-.9,0,frontZ); door.userData.state="closed";
      const doorPanel=new THREE.Mesh(new THREE.BoxGeometry(1.8,2.4,.18),new THREE.MeshStandardMaterial({color:0x6b4423})); doorPanel.position.set(.9,1.2,0); doorPanel.castShadow=true; door.add(doorPanel);
      const handle=new THREE.Mesh(new THREE.BoxGeometry(.55,.12,.5),new THREE.MeshStandardMaterial({color:0xb0b0b0})); handle.position.set(1.45,1.0,0); handle.castShadow=true; door.add(handle);
      this.scene.add(door); this.obstacles.push(door); this.door=door; this.addInteractable(new DoorHandleInteractable(handle,door));
      const barTop=new THREE.Mesh(new THREE.BoxGeometry(width*.62,.9,.8),new THREE.MeshStandardMaterial({color:0x5d3520,roughness:.9})); barTop.position.set(centerX,.45,centerZ+depth*.25); barTop.castShadow=true; this.scene.add(barTop); this.obstacles.push(barTop);
      const beer=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.55,12),new THREE.MeshStandardMaterial({color:0x8b5a2b})); beer.position.set(centerX,1.175,centerZ+depth*.25); beer.castShadow=true; this.scene.add(beer); this.addInteractable(new BeerInteractable(beer,3000));
      const seat=new THREE.Group(); seat.position.set(centerX-2.2,0,centerZ+depth*.1); const seatMaterial=new THREE.MeshStandardMaterial({color:0x3c2a20,roughness:.95});
      const seatPad=new THREE.Mesh(new THREE.BoxGeometry(.9,.18,.9),seatMaterial); seatPad.position.y=.55; seat.add(seatPad);
      const seatBack=new THREE.Mesh(new THREE.BoxGeometry(.9,1.0,.16),seatMaterial); seatBack.position.set(0,1.0,.37); seat.add(seatBack);
      const seatBase=new THREE.Mesh(new THREE.BoxGeometry(.18,.55,.18),seatMaterial); seatBase.position.y=.275; seat.add(seatBase);
      this.scene.add(seat); this.obstacles.push(seat); this.addInteractable(new SeatInteractable(seatPad,seat));
    },
    getSoundWordTexture(text) {
      if(this.soundWordTextures.has(text)) return this.soundWordTextures.get(text);
      const canvas=document.createElement("canvas"); canvas.width=256; canvas.height=96; const context=canvas.getContext("2d"); context.clearRect(0,0,canvas.width,canvas.height); context.font="900 54px sans-serif"; context.textAlign="center"; context.textBaseline="middle"; context.lineWidth=9; context.strokeStyle="rgba(0,0,0,.9)"; context.strokeText(text,canvas.width*.5,canvas.height*.5); context.fillStyle="#ffffff"; context.fillText(text,canvas.width*.5,canvas.height*.5); const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; this.soundWordTextures.set(text,texture); return texture;
    }
  });
}
