// Verify syntax of crazygames-sdk.js
const fs = require('fs');
try {
  const content = fs.readFileSync('/Users/dzzzg8/Desktop/merge demo/js/crazygames-sdk.js', 'utf8');
  new Function(content); // Test if it's syntactically valid Javascript
  console.log('Syntax OK');
} catch(e) {
  console.error('Syntax Error:', e);
}
