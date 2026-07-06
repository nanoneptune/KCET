const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(/const __filename = fileURLToPath\(import\.meta\.url\);\nconst __dirname = path\.dirname\(__filename\);\n/g, "");
content = content.replace(/import \{ fileURLToPath \} from "url";\n/g, "");
fs.writeFileSync('server.ts', content);
