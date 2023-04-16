import { LILA } from './LILA.js';

window.myProgram = new LILA(await (await fetch('./example.lila')).text());

const codeinput = document.getElementById('codeinput');
const codeoutput = document.getElementById('codeoutput');

codeinput.oninput = () => {
    try {
        const output = (new LILA(
            codeinput.value
        )).exec();

        codeoutput.innerHTML = `
<b><u>REGISTERS</u></b>

<b>areg</b>: ${output.registers.areg}
<b>breg</b>: ${output.registers.breg}
<b>creg</b>: ${output.registers.creg}
<b>dreg</b>: ${output.registers.dreg}
<b>sreg</b>: ${output.registers.sreg}
<b>freg</b>: ${output.registers.freg}

<b><u>FLAGS</u></b>

<b>zf</b>: ${output.flags.zf}
<b>sf</b>: ${output.flags.sf}
<b>if</b>: ${output.flags.if}
<b>ff</b>: ${output.flags.ff}

<b><u>MEMORY</u></b>

${Object.keys(
    output.memory
).sort(
    (x, y) => x - y
).map(
    address => `${(address > -1) ? ' ' : ''}<b>${address}</b>: ${output.memory[address]}`
).join('\n')}
`;
    }
    catch(e) {
        codeoutput.innerText = e;
    }
}