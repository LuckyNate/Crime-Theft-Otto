export class Input {
  constructor() {
    this.moveX = 0;
    this.moveY = 0;

    this.lookDX = 0;
    this.lookDY = 0;
    this.zoomDelta = 0;

    this.manualAim = false;
this.lookTap = null;
    this.lookHold = null;

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

    const pointers = new Map();

    let id = null;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let dragged = false;
    let held = false;
    let holdTimer = null;
    let pinchDistance = null;

    const TAP_MOVE_PX = 20;
    const HOLD_MS = 500;

    const clearHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    const getPinchDistance = () => {
      if (pointers.size < 2) return null;

      const [a,b] =
        [...pointers.values()];

      return Math.hypot(
        b.x - a.x,
        b.y - a.y
      );
    };

    pad.addEventListener("pointerdown", e => {
      pointers.set(
        e.pointerId,
        {
          x:e.clientX,
          y:e.clientY
        }
      );

      pad.setPointerCapture(
        e.pointerId
      );

      if (pointers.size === 2) {
        clearHold();
        held = true;
        dragged = true;
        this.manualAim = false;
        pinchDistance =
          getPinchDistance();
        return;
      }

      if (pointers.size > 1) return;

      id = e.pointerId;

      startX = lastX = e.clientX;
      startY = lastY = e.clientY;

      dragged = false;
      held = false;
      this.manualAim = true;

      holdTimer = setTimeout(() => {
        if (
          id === e.pointerId &&
          !dragged &&
          pointers.size === 1
        ) {
          held = true;
          this.lookHold = {
            x:startX,
            y:startY
          };
        }
      }, HOLD_MS);
    });

    pad.addEventListener("pointermove", e => {
      if (!pointers.has(e.pointerId)) {
        return;
      }

      pointers.set(
        e.pointerId,
        {
          x:e.clientX,
          y:e.clientY
        }
      );

      if (pointers.size >= 2) {
        const nextDistance =
          getPinchDistance();

        if (
          pinchDistance !== null &&
          nextDistance !== null
        ) {
          this.zoomDelta +=
            nextDistance -
            pinchDistance;
        }

        pinchDistance =
          nextDistance;

        return;
      }

      if (e.pointerId !== id) return;

      const totalMove = Math.hypot(
        e.clientX - startX,
        e.clientY - startY
      );

      if (totalMove > TAP_MOVE_PX) {
        dragged = true;
        clearHold();
      }

      if (dragged) {
        this.lookDX +=
          e.clientX - lastX;

        this.lookDY +=
          e.clientY - lastY;
      }

      lastX = e.clientX;
      lastY = e.clientY;
    });

    const end = e => {
      if (!pointers.has(e.pointerId)) {
        return;
      }

      const wasPinching =
        pointers.size >= 2;

      pointers.delete(
        e.pointerId
      );

      if (wasPinching) {
        clearHold();
        pinchDistance =
          getPinchDistance();

        if (pointers.size === 1) {
          const [
            remainingId,
            remaining
          ] =
            [...pointers.entries()][0];

          id = remainingId;
          startX = lastX =
            remaining.x;
          startY = lastY =
            remaining.y;

          dragged = true;
          held = true;
          this.manualAim = true;
        } else {
          id = null;
          this.manualAim = false;
        }

        return;
      }

      if (e.pointerId !== id) return;

      clearHold();

      if (!dragged && !held) {
        this.lookTap = {
          x: e.clientX,
          y: e.clientY
        };
      }

      id = null;
      dragged = false;
      held = false;
      this.manualAim = false;
    };

    pad.addEventListener(
      "pointerup",
      end
    );

    pad.addEventListener(
      "pointercancel",
      end
    );
  }

  bindFire() {

  }

  takeLookDelta() {
    const d = { x:this.lookDX, y:this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return d;
  }

  takeZoomDelta() {
    const delta =
      this.zoomDelta;

    this.zoomDelta = 0;

    return delta;
  }

  takeLookTap() {
    const tap = this.lookTap;
    this.lookTap = null;
    return tap;
  }

  takeLookHold() {
    const hold = this.lookHold;
    this.lookHold = null;
    return hold;
  }
}
