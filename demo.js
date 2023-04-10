import { LILA } from './LILA.js';

window.myProgram = new LILA(await (await fetch('./example.lila')).text());