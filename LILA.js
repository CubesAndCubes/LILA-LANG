/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

export class LILA {
    static #normalizeValue(value) {
        if (typeof value === 'number')
            return value;

        return 0;
    }

    flags = {
        zf: false, // Zero Flag
        sf: false, // Sign Flag
        if: false, // Integrity/Integer Flag
    };

    #adjustFlags(value) {
        this.flags.zf = 0 === value;

        this.flags.sf = 0 > value;

        this.flags.if = Number.isInteger(value);

        return value;
    }

    memory = {};

    registers = {
        areg: 0, // Accumulator Register
        breg: 0, // Base Register
        creg: 0, // Counter Register
        dreg: 0, // Data Register
        sreg: -1, // Stack (Pointer) Register
    };

    push(value) {
        this.move(
            this.registers.sreg--,
            LILA.#normalizeValue(value),
        );
    }

    pop(destination) {
        this.move(
            destination,
            this.retrieve(++this.registers.sreg),
        );
    }

    retrieve(source) {
        if (source in this.registers)
            return this.registers[source] ?? 0;

        if (!isNaN(Number(source)))
            return this.memory[parseInt(Number(source))] ?? 0;
        
        throw SyntaxError(`Invalid retrieval source (${source})`);
    }

    move(destination, value) {
        if (destination in this.registers)
            return void (this.registers[destination] = LILA.#normalizeValue(value));

        if (typeof destination === 'number')
            return void (this.memory[parseInt(destination)] = LILA.#normalizeValue(value));

        throw SyntaxError(`Invalid write destination (${destination})`);
    }

    add(destination, value, value2 = null) {
        this.move(
            destination,
            this.#adjustFlags(
                (value2 ?? this.retrieve(destination)) + LILA.#normalizeValue(value)
            ),
        );
    }

    increment(destination) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) + 1
            ),
        );
    }

    subtract(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) - LILA.#normalizeValue(value)
            ),
        );
    }

    decrement(destination) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) - 1
            ),
        );
    }

    compare(value, value2) {
        this.#adjustFlags(
            LILA.#normalizeValue(value) - LILA.#normalizeValue(value2)
        );
    }

    multiply(destination, value, value2 = null) {
        this.move(
            destination,
            this.#adjustFlags(
                (value2 ?? this.retrieve(destination)) * LILA.#normalizeValue(value)
            ),
        );
    }

    divide(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) / LILA.#normalizeValue(value)
            ),
        );
    }

    #preprocess(script) {
        // remove comments

        script = script.replace(/;.*/g, '');

        // string expressions to numbers arrays

        script = script.replace(/("[^"]+")|('[^']+')/g, match => match.slice(1, -1).split('').map(char => char.charCodeAt(0)).join(','));

        // make splim at separate

        script = script.match(/\S(.*\S)?/g);

        let allocationPointer = 0;

        const labels = {};

        for (let i = 0; script.length > i; i++) {
            // evaluate dollar signs ($)

            script[i] = script[i].replace(/\$/g, allocationPointer);

            // evaluate labels

            script[i] = script[i].replace(/[_A-Za-z][_A-Za-z\d]*(?!.*:)/g, identifier => labels[identifier] ?? identifier);

            // evaluate arithmetic expressions

            script[i] = script[i].replace(/([()]+[^\S\n]*)?(-[^\S\n]*)?\d+(\.\d+)?([^\S\n]*[()]+)?([^\S\n]*[+\-*/%][^\S\n]*([()]+[^\S\n]*)?(-[^\S\n]*)?\d+(\.\d+)?([^\S\n]*[()]+)?)+/g, expression => eval(expression));

            // REServe Chunks (pesudo instruction)

            script[i] = script[i].replace(/RESC[^\S\n]+(\d+(\.\d+)?)/gi, (match, chunks) => {
                const pointer = allocationPointer;

                allocationPointer += Number(parseInt(chunks));

                return pointer;
            });

            // DEFine Chunks (pseudo instruction)

            script[i] = script[i].replace(/DEFC[^\S\n]+(\d+(\.\d+)?([^\S\n]*,[^\S\n]*\d+(\.\d+)?)*)/gi, (match, chunks) => {
                const pointer = allocationPointer;

                for (const value of chunks.match(/\d+(\.\d+)?/g) ?? [])
                    this.move(allocationPointer++, Number(value));

                return pointer;
            });

            // Store in label

            script[i] = script[i].replace(/^[^\S\n]*([_A-Za-z][_A-Za-z\d]*):(.*)$/gm, (match, identifier, content) => {
                content = content.trim();

                labels[identifier] = content;

                return '';
            });
        }

        return script.join('\n');
    }

    static #TokenTypes = {
        whitespace: /^[^\S\n]+/,
        newline: /^\n\s*/,
        comment: /^;.*/,
        number: /^\d+(\.\d+)?/,
        string: /^("[^"]*")|^('[^']*')/,
        pseudoinstruction: /^(CNST|DEFC|RESC)(?=[^A-Z]|$)/,
        instruction: /^(MOV|ADD|SUB|MUL|DIV|CMP|CALL|RET|PUSH|POP|EXIT|JMP)(?=[^A-Z]|$)/i,
        comma: /^,/,
        colon: /^:/,
        dollar: /^\$/,
        operator: /^(\+|-|\*|\/)/,
        squareopen: /^\[/,
        squareclose: /^\]/,
        identifier: /^[_A-Za-z][_A-Za-z\d]*/,
    }

    static #tokenize(script) {
        const result = [];

        while (script.length) {
            let tokenFound = false;

            for (const [tokenType, tokenMatcher] of Object.entries(LILA.#TokenTypes)) {
                let match = script.match(tokenMatcher)?.[0] ?? null;

                if (match) {
                    script = script.slice(match.length);

                    tokenFound = true;

                    if (tokenType === 'whitespace')
                        break;

                    if (tokenType === 'comment')
                        break;

                    if (tokenType === 'string')
                        match = match.slice(1, -1);

                    if (tokenType === 'number')
                        match = Number(match);

                    result.push({
                        type: tokenType,
                        value: match,
                    });

                    break;
                }
            }

            if (!tokenFound)
                throw SyntaxError(`Undefined Token "${script}"`);
        }

        return result;
    }

    #code = [];

    constructor(script) {
        const tokens = LILA.#tokenize(script);
    }
}