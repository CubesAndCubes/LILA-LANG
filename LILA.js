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
            {
                type: 'address',
                value: this.registers.sreg--,
            },
            LILA.#normalizeValue(value),
        );
    }

    pop(destination) {
        this.move(
            destination,
            this.retrieve({
                type: 'address',
                value: ++this.registers.sreg,
            }),
        );
    }

    retrieve(source) {
        switch(source.type) {
            case 'address':
                if (source.value in this.registers)
                    source.value = this.registers[source.value] ?? 0;

                return this.memory[parseInt(source.value)] ?? 0;

            case 'number':
                return source.value;

            case 'identifier':
                if (source.value in this.registers)
                    return this.registers[source.value] ?? 0;
        }
        
        throw SyntaxError(`Invalid retrieval source (${source.value})`);
    }

    move(destination, value) {
        switch (destination.type) {
            case 'address':
                if (destination.value in this.registers)
                    destination.value = this.registers[destination.value] ?? 0;

                return void (
                    this.memory[parseInt(destination.value)] = LILA.#normalizeValue(value)
                );

            case 'identifier':
                if (destination.value in this.registers)
                    return void (
                        this.registers[destination.value] = LILA.#normalizeValue(value)
                    );
        }

        throw SyntaxError(`Invalid write destination (${destination.value})`);
    }

    add(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) + LILA.#normalizeValue(value)
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

    multiply(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) * LILA.#normalizeValue(value)
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
                    this.move(
                        {
                            type: 'address',
                            value: allocationPointer++,
                        },
                        Number(value)
                    );

                return pointer;
            });

            // Store in label

            script[i] = script[i].replace(/^[^\S\n]*([_A-Za-z][_A-Za-z\d]*):\s*(\d+(\.\d+)?)\s*$/gm, (match, identifier, content) => {
                content = content.trim();

                labels[identifier] = content;

                return '';
            });
        }

        return script.join('\n').trim() + '\n';
    }

    static #TokenTypes = {
        whitespace: /^[^\S\n]+/,
        newline: /^\n\s*/,
        address: /^\[[^\S\n]*(\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)[^\S\n]*\]/,
        number: /^\d+(\.\d+)?/,
        comma: /^,/,
        jumplabel: /^[_A-Za-z][_A-Za-z\d]*:/,
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
                    
                    if (tokenType === 'jumplabel')
                        match = match.slice(0, -1);

                    if (tokenType === 'address')
                        match = match.slice(1, -1).trim();

                    if (tokenType === 'number' || (tokenType === 'address' && isFinite(match)))
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

    #codeEntry = 0;

    codePointer = 0;

    #code = [];

    exec() {
        this.codePointer = this.#codeEntry;

        while(this.#code.length > this.codePointer)
            this.#code[this.codePointer++]();

        return this.registers.areg;
    }

    constructor(script) {
        const tokens = LILA.#tokenize(
            this.#preprocess(script)
        );

        console.log(tokens);

        const jumpAdresses = {
            '_start': this.#codeEntry
        };

        for (let i = 0; tokens.length > i;) {
            const peekToken = (offset = 0) => tokens[i + offset];

            const readToken = types => {
                const nextToken = peekToken();

                if (!types.includes(nextToken.type))
                    throw SyntaxError(`Unexpected token; Expected (${types}), got (${nextToken.type})`);

                i++;

                return nextToken;
            };

            if (peekToken().type === 'jumplabel') {
                const labelToken = readToken(['jumplabel']);

                if (readToken(['newline'])) {
                    jumpAdresses[labelToken.value] = this.#code.length;

                    continue;
                }
            }

            if (peekToken().type === 'identifier') {
                let destination;
                let source;
                let value1;
                let value2;
                let label;

                switch (readToken(['identifier']).value.toUpperCase()) {
                    case 'MOV':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);
                        
                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.move(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'INC':
                        destination = readToken(['identifier', 'address']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.increment(destination);
                        });

                        continue;
                    case 'DEC':
                        destination = readToken(['identifier', 'address']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.decrement(destination);
                        });

                        continue;
                    case 'ADD':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.add(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'SUB':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.subtract(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'MUL':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.multiply(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'CMP':
                        value1 = readToken(['identifier', 'address', 'number']);

                        readToken(['comma']);

                        value2 = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.compare(
                                this.retrieve(value1),
                                this.retrieve(value2),
                            );
                        });

                        continue;
                    case 'PUSH':
                        value1 = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.push(
                                this.retrieve(value1)
                            );
                        });

                        continue;
                    case 'POP':
                        destination = readToken(['identifier', 'address']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.pop(destination);
                        });

                        continue;
                    case 'JMP':
                        label = readToken(['identifier']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            if (!(label.value in jumpAdresses))
                                throw SyntaxError(`Undefined jump label (${label.value}).`);

                            this.codePointer = jumpAdresses[label.value];
                        });

                        continue;
                    case 'CALL':
                        label = readToken(['identifier']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            if (!(label.value in jumpAdresses))
                                throw SyntaxError(`Undefined subroutine label (${label.value}).`);

                            this.push(this.codePointer);

                            this.codePointer = jumpAdresses[label.value];
                        });

                        continue;
                    case 'RET':
                        readToken(['newline']);

                        this.#code.push(() => {
                            this.codePointer = Math.max(
                                0,
                                this.retrieve({
                                    type: 'address',
                                    value: ++this.registers.sreg,
                                }),
                            );
                        });

                        continue;
                    case 'EXIT':
                        readToken(['newline']);

                        this.#code.push(() => {
                            this.codePointer = this.#code.length;
                        });

                        continue;
                    case 'JE': // jump if equal
                    case 'JZ': // jump if zero
                        label = readToken(['identifier']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            if (!(label.value in jumpAdresses))
                                throw SyntaxError(`Undefined jump label (${label.value}).`);

                            if (this.flags.zf)
                                this.codePointer = jumpAdresses[label.value];
                        });

                        continue;
                    case 'JNE': // jump if not equal
                    case 'JNZ': // jump if not zero
                        label = readToken(['identifier']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            if (!(label.value in jumpAdresses))
                                throw SyntaxError(`Undefined jump label (${label.value}).`);

                            if (!this.flags.zf)
                                this.codePointer = jumpAdresses[label.value];
                        });

                        continue;
                    case 'JS': // jump if sign
                        label = readToken(['identifier']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            if (!(label.value in jumpAdresses))
                                throw SyntaxError(`Undefined jump label (${label.value}).`);

                            if (this.flags.sf)
                                this.codePointer = jumpAdresses[label.value];
                        });

                        continue;
                    case 'JNS': // jump if not sign
                        label = readToken(['identifier']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            if (!(label.value in jumpAdresses))
                                throw SyntaxError(`Undefined jump label (${label.value}).`);

                            if (!this.flags.sf)
                                this.codePointer = jumpAdresses[label.value];
                        });

                        continue;
                    case 'JI': // jump if integral
                        label = readToken(['identifier']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            if (!(label.value in jumpAdresses))
                                throw SyntaxError(`Undefined jump label (${label.value}).`);

                            if (this.flags.if)
                                this.codePointer = jumpAdresses[label.value];
                        });

                        continue;
                    case 'JNI': // jump if not integral
                        label = readToken(['identifier']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            if (!(label.value in jumpAdresses))
                                throw SyntaxError(`Undefined jump label (${label.value}).`);

                            if (!this.flags.if)
                                this.codePointer = jumpAdresses[label.value];
                        });

                        continue;
                }
            }

            throw SyntaxError('Unexpected series of tokens.');
        }

        this.#codeEntry = jumpAdresses['_start'];
    }
}