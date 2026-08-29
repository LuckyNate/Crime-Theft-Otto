export class Input {
  constructor() {
    this.moveX = 0;
    this.moveY = 0;

    this.lookDX = 0;
    this.lookDY = 0;

    this.manualAim = false;
    this.fire = false;

    this.lookTap = null;

    this.bindMove();
    this.bindLook();
    this.bindFire();
  }

  bindMove() {
    const pad = document.querySelector("#movePad");
    const knob = document.querySelector("#moveKnob");

    let id = null;

    const update = e => {
      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      let dx = e.clientX - cx;
      let dy = e.clientY - cy;

      const max = r.width * 0.35;
      const len = Math.hypot(dx, dy);

      if (len > max) {
        dx = dx / len * max;
        dy = dy / len * max;
      }

      this.moveX = dx / max;
      this.moveY = -dy / max;

      knob.style.transform =
        `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };

    pad.addEventListener("pointerdown", e => {
      id = e.pointerId;
      pad.setPointerCapture(id);
      update(e);
    });

    pad.addEventListener("pointermove", e => {
      if (e.pointerId === id) update(e);
    });

    const end = e => {
      if (e.pointerId !== id) return;
      id = null;
      this.moveX = 0;
      this.moveY = 0;
      knob.style.transform = "translate(-50%,-50%)";
    };

    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);
  }

  bindLook() {
    const pad = document.querySelector("#lookPad");

    let id = null;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let dragged = false;

    const TAP_MOVE_PX = 20;

    pad.addEventListener("pointerdown", e => {
      id = e.pointerId;

      startX = lastX = e.clientX;
      startY = lastY = e.clientY;

      dragged = false;
      this.manualAim = true;

      pad.setPointerCapture(id);
    });

    pad.addEventListener("pointermove", e => {
      if (e.pointerId !== id) return;

      const totalMove = Math.hypot(
        e.clientX - startX,
        e.clientY - startY
      );

      if (totalMove > TAP_MOVE_PX) {
        dragged = true;
      }

      if (dragged) {
        this.lookDX += e.clientX - lastX;
        this.lookDY += e.clientY - lastY;
      }

      lastX = e.clientX;
      lastY = e.clientY;
    });

    const end = e => {
      if (e.pointerId !== id) return;

      if (!dragged) {
        this.lookTap = {
          x: e.clientX,
          y: e.clientY
        };
      }

      id = null;
      this.manualAim = false;
    };

    pad.addEventListener("pointerup", end);

    pad.addEventListener("pointercancel", e => {
      if (e.pointerId !== id) return;

      id = null;
      dragged = false;
      this.manualAim = false;
    });
  }

  bindFire() {
    const fire = document.querySelector("#fire");

    fire.addEventListener("pointerdown", e => {
      e.preventDefault();
      this.fire = true;
      fire.setPointerCapture(e.pointerId);
    });

    fire.addEventListener("pointerup", () => {
      this.fire = false;
    });

    fire.addEventListener("pointercancel", () => {
      this.fire = false;
    });
  }

  takeLookDelta() {
    const d = { x:this.lookDX, y:this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return d;
  }

  takeLookTap() {
    const tap = this.lookTap;
    this.lookTap = null;
    return tap;
  }
}
