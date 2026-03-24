const fs = require("fs");
const app = require("../app");

const output = {
  hasRouter: Boolean(app.router),
  layers: [],
};

if (app.router && Array.isArray(app.router.stack)) {
  for (const layer of app.router.stack) {
    const item = {
      name: layer.name,
      path: layer.route ? layer.route.path : null,
      methods: layer.route ? layer.route.methods : null,
      nested: [],
    };

    if (layer.handle && Array.isArray(layer.handle.stack)) {
      for (const nested of layer.handle.stack) {
        if (nested.route) {
          item.nested.push({
            path: nested.route.path,
            methods: nested.route.methods,
          });
        }
      }
    }

    output.layers.push(item);
  }
}

fs.writeFileSync("/tmp/matcha_app_routes_inspect.json", JSON.stringify(output, null, 2));
