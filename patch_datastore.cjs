const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  /const DATA_STORE_PATH = path\.join\(process\.cwd\(\), "data_store\.json"\);/g,
  `const DATA_STORE_PATH = process.env.VERCEL ? path.join("/tmp", "data_store.json") : path.join(process.cwd(), "data_store.json");`
);
fs.writeFileSync('server.ts', content);
