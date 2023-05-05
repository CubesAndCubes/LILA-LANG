import { LILA } from './LILA.js';

window.myProgram = new LILA(await (await fetch('./example.lila')).text());

const codeinput = document.getElementById('codeinput');
const codeoutput = document.getElementById('codeoutput');

const generateStateInfo = state => `<b><u>REGISTERS</u></b>

<b>areg</b>: ${state.registers.areg}
<b>breg</b>: ${state.registers.breg}
<b>creg</b>: ${state.registers.creg}
<b>dreg</b>: ${state.registers.dreg}
<b>sreg</b>: ${state.registers.sreg}
<b>freg</b>: ${state.registers.freg}

<b><u>FLAGS</u></b>

<b>zf</b>: ${state.flags.zf}
<b>sf</b>: ${state.flags.sf}
<b>if</b>: ${state.flags.if}
<b>ff</b>: ${state.flags.ff}

<b><u>MEMORY</u></b>

${Object.keys(
    state.memory
).sort(
    (x, y) => x - y
).map(
    address => `${(address > -1) ? ' ' : ''}<b>${address}</b>: ${state.memory[address]}`
).join('\n')}`;

codeinput.addEventListener('keydown', e => {
    if (e.key !== 'Tab')
        return;
    
    e.preventDefault();

    const start = codeinput.selectionStart;
    const end = codeinput.selectionEnd;

    codeinput.value = codeinput.value.substring(0, start) + '\t' + codeinput.value.substring(end);

    codeinput.selectionStart = codeinput.selectionEnd = start + 1;
});

codeinput.oninput = () => {
    let program;

    try {
        program = new LILA(codeinput.value);
    }
    catch (e) {
        codeoutput.innerHTML = `<div class="error">${e}</div>`;

        return;
    }

    try {
        const output = program.exec();

        codeoutput.innerHTML = generateStateInfo(output);
    }
    catch(e) {
        codeoutput.innerHTML = `<div class="error">${e}</div>

${generateStateInfo(program.state)}`;
    }
}