export class GameSystem {
  constructor(game, owned = {}) {
    this.game = game;
    Object.assign(this, owned);

    return new Proxy(this, {
      get(target, property, receiver) {
        if (property in target) {
          return Reflect.get(target, property, receiver);
        }

        if (property in game) {
          const value = game[property];
          return typeof value === "function"
            ? value.bind(game)
            : value;
        }

        for (const system of Object.values(game.systems ?? {})) {
          if (system === receiver || !(property in system)) continue;
          const value = system[property];
          return typeof value === "function"
            ? value.bind(system)
            : value;
        }

        return undefined;
      },

      set(target, property, value, receiver) {
        if (property in target) {
          return Reflect.set(target, property, value, receiver);
        }

        if (property in game) {
          game[property] = value;
          return true;
        }

        for (const system of Object.values(game.systems ?? {})) {
          if (system === receiver || !(property in system)) continue;
          system[property] = value;
          return true;
        }

        return Reflect.set(target, property, value, receiver);
      }
    });
  }
}
