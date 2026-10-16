const fs = require('node:fs');
const parser = require('@babel/parser');
const path = require('node:path');
const files = ['', 'functions', 'scripts'].flatMap((dir) =>
  fs.existsSync(path.join(__dirname, dir)) ? fs.readdirSync(path.join(__dirname, dir)).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => path.join(dir, f)) : []);
let failed = false;
for (const file of files) {
  try {
    parser.parse(fs.readFileSync(require('node:path').join(__dirname, file), 'utf8'),
      { sourceType: 'unambiguous', plugins: ['jsx'] });
    console.log('OK ', file);
  } catch (error) {
    failed = true;
    console.error('ERR', file, '->', error.message.split('\n')[0]);
  }
}
if (failed) process.exitCode = 1;
