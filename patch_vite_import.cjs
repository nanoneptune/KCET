const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

// Remove static import
content = content.replace(/import \{ createServer as createViteServer \} from "vite";\n/, '');

// Replace the creation block
content = content.replace(
  /if \(process\.env\.NODE_ENV !== "production"\) \{\n  createViteServer\(\{\n    server: \{ middlewareMode: true \},\n    appType: "spa"\n  \}\)\.then\(vite => \{\n    app\.use\(vite\.middlewares\);\n  \}\);\n\}/g,
  `if (process.env.NODE_ENV !== "production") {
  import("vite").then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    }).then(vite => {
      app.use(vite.middlewares);
    });
  }).catch(err => console.error("Failed to load vite:", err));
}`
);

fs.writeFileSync('server.ts', content);
