const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(/import \{ GoogleGenAI, Type \} from "@google\/genai";\n/g, "");
content = 'import { GoogleGenAI, Type } from "@google/genai";\n' + content;
fs.writeFileSync('server.ts', content);
