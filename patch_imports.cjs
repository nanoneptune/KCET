const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(/from "\.\/src\/types\.js";/g, 'from "./src/types";');
content = content.replace(/from "\.\/src\/data\/colleges\.js";/g, 'from "./src/data/colleges";');
fs.writeFileSync('server.ts', content);
