import fs from 'fs';
import vm from 'vm';
const html = fs.readFileSync('index.html', 'utf8');
const scriptStart = html.indexOf('<script type="module">');
const scriptContent = html.substring(scriptStart + 22, html.indexOf('</script>', scriptStart));
try {
  new vm.Script(scriptContent);
  console.log('VALID SYNTAX!');
} catch (e) {
  console.error('SYNTAX ERROR:', e);
}
