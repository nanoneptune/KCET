const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  /const distPath = path\.join\(process\.cwd\(\), "dist"\);\n  app\.use\(express\.static\(distPath\)\);\n  app\.get\("\*", \(req, res\) => {\n    res\.sendFile\(path\.join\(distPath, "index\.html"\)\);\n  }\);/g,
  `if (!process.env.VERCEL) {\n    const distPath = path.join(process.cwd(), "dist");\n    app.use(express.static(distPath));\n    app.get("*", (req, res) => {\n      res.sendFile(path.join(distPath, "index.html"));\n    });\n  }`
);
fs.writeFileSync('server.ts', content);
