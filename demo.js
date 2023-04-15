import { LILA } from './LILA.js';

window.myProgram = new LILA(await (await fetch('./example.lila')).text());

const codeinput = document.getElementById('codeinput');
const codeoutput = document.getElementById('codeoutput');

codeinput.oninput = () => {
    try {
        codeoutput.innerText = (new LILA(
            codeinput.value
        )).exec();
    }
    catch(e) {
        codeoutput.innerText = e;
    }
}