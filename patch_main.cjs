const fs = require('fs');
let content = fs.readFileSync('src/main.tsx', 'utf-8');
content = content.replace(/import App from '\.\/App\.tsx';/g, "import App from './App';");
fs.writeFileSync('src/main.tsx', content);
