import * as THREE from "three";
import { GameSystem } from "./GameSystem.js";

export class SoundWordSystem extends GameSystem {
  constructor(game) {
    super(game, {
      soundWords: [],
      soundWordTextures: new Map(),
      footstepDistance: 0,
      lastFootstepPosition: game.player.getCenter(new THREE.Vector3())
    });
  }

  getSoundWordTexture(text) {
    if (
      this.soundWordTextures.has(
        text
      )
    ) {
      return this.soundWordTextures.get(
        text
      );
    }

    const canvas =
      document.createElement("canvas");

    canvas.width = 256;
    canvas.height = 96;

    const context =
      canvas.getContext("2d");

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.font =
      "900 54px sans-serif";

    context.textAlign =
      "center";

    context.textBaseline =
      "middle";

    context.lineWidth = 9;
    context.strokeStyle =
      "rgba(0,0,0,.9)";

    context.strokeText(
      text,
      canvas.width * .5,
      canvas.height * .5
    );

    context.fillStyle =
      "#ffffff";

    context.fillText(
      text,
      canvas.width * .5,
      canvas.height * .5
    );

    const texture =
      new THREE.CanvasTexture(
        canvas
      );

    texture.colorSpace =
      THREE.SRGBColorSpace;

    this.soundWordTextures.set(
      text,
      texture
    );

    return texture;
  }

  spawnSoundWord(
    text,
    source,
    loudness = 1,
    tiny = false,
    verticalOffset = 1.25
  ) {
    const material =
      new THREE.SpriteMaterial({
        map:
          this.getSoundWordTexture(
            text
          ),
        transparent: true,
        depthWrite: false
      });

    const word =
      new THREE.Sprite(
        material
      );

    word.position.copy(source);
    word.position.y +=
      verticalOffset;

    const baseScale =
      (tiny ? .5 : 1.35) *
      loudness;

    word.scale.set(
      baseScale,
      baseScale * .375,
      1
    );

    word.userData.life = 0;
    word.userData.baseScale =
      baseScale;

    this.scene.add(word);
    this.soundWords.push(word);
  }

  updateSoundWords(dt) {
    for (
      let i =
        this.soundWords.length - 1;
      i >= 0;
      i--
    ) {
      const word =
        this.soundWords[i];

      word.userData.life += dt;

      const life =
        word.userData.life;

      const grow =
        1 + life * .8;

      word.scale.set(
        word.userData.baseScale *
          grow,
        word.userData.baseScale *
          .375 *
          grow,
        1
      );

      word.material.opacity =
        Math.max(
          0,
          1 - life / .7
        );

      if (life >= .7) {
        this.scene.remove(word);
        word.material.dispose();

        this.soundWords.splice(
          i,
          1
        );
      }
    }
  }

  getFootstepWord(position) {
    if (position.y < .02) {
      return "SPLISH";
    }

    return "tap";
  }

  updateFootsteps() {
    if (
      this.mounted ||
      this.sittingSeat
    ) {
      this.lastFootstepPosition.copy(
        this.player.getCenter(
          new THREE.Vector3()
        )
      );
      this.footstepDistance = 0;
      return;
    }

    const current =
      this.player.getCenter(
        new THREE.Vector3()
      );

    const dx =
      current.x -
      this.lastFootstepPosition.x;

    const dz =
      current.z -
      this.lastFootstepPosition.z;

    const distance =
      Math.hypot(dx, dz);

    this.footstepDistance +=
      distance;

    this.lastFootstepPosition.copy(
      current
    );

    if (this.footstepDistance >= .9) {
      this.footstepDistance = 0;

      const floorContact =
        new THREE.Vector3(
          current.x,
          .03,
          current.z
        );

      const word =
        this.getFootstepWord(
          floorContact
        );

      this.spawnSoundWord(
        word,
        floorContact,
        word === "SPLISH"
          ? .5
          : .35,
        true,
        0
      );
    }
  }
}
