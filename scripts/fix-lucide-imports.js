#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'frontend');
const icons = [
  'AlertTriangle','Settings','MessageSquare','CheckCircle','Clock','Edit','Mail','Smartphone','Bell','Monitor','Globe','Target','Megaphone','FileText','Zap','Filter','Search','MoreHorizontal','Eye','Copy','Trash2','Users','Send'
];
const importStatement = `import { ${icons.join(', ')} } from 'lucide-react';`;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.isFile() && full.endsWith('.tsx')) {
      processFile(full);
    }
  }
}

function processFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  const usesIcon = icons.some(i => new RegExp(`\\b${i}\\b`).test(src));
  if (!usesIcon) return;

  // Check if file already imports from 'lucide-react'
  const lucideImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/;
  const match = src.match(lucideImportRegex);
  if (match) {
    // Merge missing icons into existing import
    const existing = match[1].split(',').map(s => s.trim()).filter(Boolean);
    const toAdd = icons.filter(i => usesIdentifier(src, i) && !existing.includes(i));
    if (toAdd.length === 0) return; // nothing to add
    const newImport = `import { ${[...new Set(existing.concat(toAdd))].join(', ')} } from 'lucide-react';`;
    src = src.replace(lucideImportRegex, newImport);
    fs.writeFileSync(filePath, src, 'utf8');
    console.log('Updated import in', filePath);
  } else {
    // Insert the import after other imports (keep shebang/comment at top)
    const lines = src.split('\n');
    let insertAt = 0;
    // skip shebang
    if (lines[0].startsWith('#!')) insertAt = 1;
    // find last consecutive import line
    for (let i = insertAt; i < lines.length; i++) {
      if (!lines[i].trim().startsWith('import')) {
        insertAt = i;
        break;
      }
    }
    // Avoid duplicating if exact import already present
    if (src.includes(importStatement)) return;
    lines.splice(insertAt, 0, importStatement);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Inserted import in', filePath);
  }
}

function usesIdentifier(src, id) {
  const re = new RegExp(`\\b${id}\\b`);
  return re.test(src);
}

walk(root);
console.log('Done');
