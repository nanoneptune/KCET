const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

// Replace top-level await for Vite setup
content = content.replace(
  /if \(process\.env\.NODE_ENV !== "production"\) \{\n  const vite = await createViteServer\(\{\n    server: \{ middlewareMode: true \},\n    appType: "spa"\n  \}\);\n  app\.use\(vite\.middlewares\);\n\}/g,
  `if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  }).then(vite => {
    app.use(vite.middlewares);
  });
}`
);

fs.writeFileSync('server.ts', content);
