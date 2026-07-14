const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/app/(dashboard)');
let changed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('onValueChange={(val) =>')) {
    content = content.replace(/onValueChange=\{\(val\) =>/g, 'onValueChange={(val: any) =>');
    fs.writeFileSync(file, content, 'utf8');
    changed++;
  }
}
console.log(`Changed ${changed} files`);
