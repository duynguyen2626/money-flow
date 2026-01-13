
const fs = require('fs');
const path = 'src/actions/transaction-actions.ts';
let c = fs.readFileSync(path, 'utf8');
console.log('Last 200 chars:');
console.log(JSON.stringify(c.substring(c.length - 200)));
