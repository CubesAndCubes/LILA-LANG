import { LILA } from './LILA.js';

try {
    window.myProgram = new LILA(await (await fetch('./example.lila')).text());
}
catch(e) {
    console.error(e);
}

const codeinput = document.getElementById('codeinput');
const codeoutput = document.getElementById('codeoutput');
const codeexecute = document.getElementById('code-execute');
const codeautoexecute = document.getElementById('code-auto-execute');

const generateStateInfo = state => `
<b><u>REGISTERS</u></b>

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
).join('\n')}
`.trim();

codeinput.addEventListener('keydown', e => {
    if (e.key !== 'Tab')
        return;
    
    e.preventDefault();

    const start = codeinput.selectionStart;
    const end = codeinput.selectionEnd;

    codeinput.value = codeinput.value.substring(0, start) + '\t' + codeinput.value.substring(end);

    codeinput.selectionStart = codeinput.selectionEnd = start + 1;
});

const execprogram = () => {
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
    catch (e) {
        codeoutput.innerHTML = `
<div class="error">${e}</div>

${generateStateInfo(program.state)}
        `.trim();
    }
}

codeexecute.addEventListener('click', () => {
    execprogram();
});

codeautoexecute.addEventListener('input', () => {
    if (codeautoexecute.checked)
        codeinput.addEventListener('input', execprogram);
    else
        codeinput.removeEventListener('input', execprogram);
});
