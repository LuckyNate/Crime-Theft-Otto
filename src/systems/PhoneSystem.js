import * as THREE from "three";
import { GameSystem } from "./GameSystem.js";

export class PhoneSystem extends GameSystem {
  constructor(game) {
    super(game, {
      phoneOpen: false,
      phonePanel: null,
      carContact: null,
      photoContact: null,
      homeContact: null
    });
  }

  bind() {
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

  }

  takePhonePhoto() {
    this.setPhoneOpen(false);

    this.renderer.render(
      this.scene,
      this.camera
    );

    const link =
      document.createElement("a");

    link.href =
      this.renderer.domElement.toDataURL(
        "image/png"
      );

    link.download =
      "crime-theft-otto.png";

    document.body.appendChild(link);
    link.click();
    link.remove();

    requestAnimationFrame(
      () =>
        this.setPhoneOpen(true)
    );
  }

  fastTravelHome() {
    if (this.mounted) {
      return;
    }

    const current =
      this.player.getCenter(
        new THREE.Vector3()
      );

    const destination =
      new THREE.Vector3(
        24.5,
        current.y,
        10.5
      );

    this.player.translate(
      destination.sub(current)
    );

    this.pendingInteraction = null;
    this.interactionPath = [];
  }

  setPhoneOpen(open) {
    this.phoneOpen = open;

    this.phonePanel.classList.toggle(
      "open",
      open
    );
  }

  isScreenPointOnRoad(x, y) {
    if (!this.roads.length) {
      return false;
    }

    const ndc =
      new THREE.Vector2(
        (x / innerWidth) * 2 - 1,
        -(y / innerHeight) * 2 + 1
      );

    this.camera.updateMatrixWorld(true);

    this.tapTargetRaycaster.setFromCamera(
      ndc,
      this.camera
    );

    return (
      this.tapTargetRaycaster.intersectObjects(
        this.roads,
        false
      ).length > 0
    );
  }
}
