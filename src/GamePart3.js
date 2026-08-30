import * as THREE from "three";
import { ObstacleOctree, Interactable, RotateInteractable, DoorHandleInteractable, ConsumableInteractable, FoodInteractable, DrinkInteractable, SmokeInteractable, DrugInteractable, BeerInteractable, SeatInteractable, MountInteractable } from "./GameSupport.js";

export function applyGamePart3(Game) {
  Object.assign(Game.prototype, {
    placeParkedVehicleNear(vehicle, center, initial = false) {
      const roadSpacing=80;
      const minRadius=initial?28:85;
      const maxRadius=initial?105:125;
      const angle=Math.random()*Math.PI*2;
      const radius=minRadius+Math.random()*(maxRadius-minRadius);
      const sampleX=center.x+Math.cos(angle)*radius;
      const sampleZ=center.z+Math.sin(angle)*radius;
      const blockX=THREE.MathUtils.clamp(Math.round((sampleX-40)/roadSpacing)*roadSpacing+40,-920,920);
      const blockZ=THREE.MathUtils.clamp(Math.round((sampleZ-40)/roadSpacing)*roadSpacing+40,-920,920);
      const edge=Math.floor(Math.random()*4);
      const along=-22+Math.random()*44;
      const curbOffset=34.4;
      if(edge===0){vehicle.position.set(blockX+along,0,blockZ-curbOffset);vehicle.rotation.y=Math.PI*.5;}
      else if(edge===1){vehicle.position.set(blockX+curbOffset,0,blockZ+along);vehicle.rotation.y=0;}
      else if(edge===2){vehicle.position.set(blockX+along,0,blockZ+curbOffset);vehicle.rotation.y=-Math.PI*.5;}
      else{vehicle.position.set(blockX-curbOffset,0,blockZ+along);vehicle.rotation.y=Math.PI;}
      vehicle.userData.heading=vehicle.rotation.y;
      vehicle.visible=true;
    },

    updateParkedVehicles() {
      const center=this.getControlledCenter(new THREE.Vector3());
      for(const vehicle of this.parkedVehicles){
        if(vehicle===this.mounted) continue;
        if(!vehicle.visible){this.placeParkedVehicleNear(vehicle,center,true);continue;}
        const distance=Math.hypot(vehicle.position.x-center.x,vehicle.position.z-center.z);
        if(distance>145)this.placeParkedVehicleNear(vehicle,center,false);
      }
    }
  });
}
