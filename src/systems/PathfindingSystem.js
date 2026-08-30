import * as THREE from "three";
import { ObstacleOctree } from "../GameSupport.js";
import { GameSystem } from "./GameSystem.js";

export class PathfindingSystem extends GameSystem {
  constructor(game) {
    super(game, {
      obstacleOctree: new ObstacleOctree(-1000, -32, -1000, 1000, 256, 1000, 5)
    });
  }

  rebuildObstacleOctree() {
    this.obstacleOctree.clear();

    for (const obstacle of this.obstacles) {
      obstacle.updateWorldMatrix(
        true,
        true
      );

      const box =
        new THREE.Box3().setFromObject(
          obstacle
        );

      this.obstacleOctree.insert(
        obstacle,
        box
      );
    }
  }

  getObstacleBoxes(
    ignore = null,
    queryBox = null
  ) {
    if (!queryBox) {
      const boxes = [];

      for (const obstacle of this.obstacles) {
        if (obstacle === ignore) {
          continue;
        }

        obstacle.updateWorldMatrix(
          true,
          true
        );

        boxes.push(
          new THREE.Box3().setFromObject(
            obstacle
          )
        );
      }

      return boxes;
    }

    return this.obstacleOctree.query(
      queryBox,
      ignore
    );
  }

  segmentBlocked(a, b, boxes) {
    const dir =
      new THREE.Vector3(
        b.x - a.x,
        0,
        b.z - a.z
      );

    const length =
      dir.length();

    if (length <= .001) {
      return false;
    }

    dir.normalize();

    const ray =
      new THREE.Ray(
        new THREE.Vector3(
          a.x,
          .9,
          a.z
        ),
        dir
      );

    for (const box of boxes) {
      const expanded =
        box.clone().expandByScalar(.45);

      const hit =
        ray.intersectBox(
          expanded,
          new THREE.Vector3()
        );

      if (
        hit &&
        hit.distanceTo(
          new THREE.Vector3(
            a.x,
            .9,
            a.z
          )
        ) < length
      ) {
        return true;
      }
    }

    return false;
  }

  buildInteractionPath(
    start,
    goal,
    ignoreObstacle = null
  ) {
    const queryBox =
      new THREE.Box3(
        new THREE.Vector3(
          Math.min(start.x, goal.x),
          -4,
          Math.min(start.z, goal.z)
        ),
        new THREE.Vector3(
          Math.max(start.x, goal.x),
          8,
          Math.max(start.z, goal.z)
        )
      );

    queryBox.expandByScalar(16);

    const boxes =
      this.getObstacleBoxes(
        ignoreObstacle,
        queryBox
      );

    if (
      !this.segmentBlocked(
        start,
        goal,
        boxes
      )
    ) {
      return [goal.clone()];
    }

    const nodes = [
      start.clone(),
      goal.clone()
    ];

    for (const box of boxes) {
      const pad = .8;

      const corners = [
        new THREE.Vector3(
          box.min.x - pad,
          0,
          box.min.z - pad
        ),
        new THREE.Vector3(
          box.min.x - pad,
          0,
          box.max.z + pad
        ),
        new THREE.Vector3(
          box.max.x + pad,
          0,
          box.min.z - pad
        ),
        new THREE.Vector3(
          box.max.x + pad,
          0,
          box.max.z + pad
        )
      ];

      nodes.push(...corners);
    }

    const edges =
      nodes.map(() => []);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (
          !this.segmentBlocked(
            nodes[i],
            nodes[j],
            boxes
          )
        ) {
          const cost =
            nodes[i].distanceTo(
              nodes[j]
            );

          edges[i].push([j, cost]);
          edges[j].push([i, cost]);
        }
      }
    }

    const dist =
      nodes.map(() => Infinity);

    const prev =
      nodes.map(() => -1);

    const used =
      nodes.map(() => false);

    dist[0] = 0;

    for (let step = 0; step < nodes.length; step++) {
      let u = -1;
      let best = Infinity;

      for (let i = 0; i < nodes.length; i++) {
        if (
          !used[i] &&
          dist[i] < best
        ) {
          best = dist[i];
          u = i;
        }
      }

      if (u === -1) break;
      if (u === 1) break;

      used[u] = true;

      for (const [v, cost] of edges[u]) {
        const next =
          dist[u] + cost;

        if (next < dist[v]) {
          dist[v] = next;
          prev[v] = u;
        }
      }
    }

    if (!Number.isFinite(dist[1])) {
      return [goal.clone()];
    }

    const path = [];
    let cur = 1;

    while (cur !== -1) {
      path.push(nodes[cur].clone());
      cur = prev[cur];
    }

    path.reverse();

    path.shift();

    return path;
  }
}
