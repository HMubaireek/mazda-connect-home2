// The car's browser (Opera Presto) only runs ES5. Fails if the built launcher uses anything newer.
import { parse } from 'acorn';
import { readFileSync } from 'fs';
const file = new URL('../../installer/home2/js/MainMenuCtrl.js', import.meta.url);
parse(readFileSync(file, 'utf8'), { ecmaVersion: 5 });
console.log('ES5 OK');
