const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');
const files = fs.readdirSync(modelsDir);

const injectString = `
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },`;

const injectStringWithMongoose = `
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },`;

let count = 0;

for (const file of files) {
  if (file === 'Empresa.model.js') continue;
  
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('empresaId:')) {
    console.log(`Skipping ${file}, already has empresaId`);
    continue;
  }

  content = content.replace(/new\s+(mongoose\.)?Schema\s*\(\s*\{/, match => {
    const isMongoose = match.includes('mongoose');
    return `${match}${isMongoose ? injectStringWithMongoose : injectString}`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  count++;
  console.log(`Updated ${file}`);
}

console.log(`Updated ${count} models.`);
