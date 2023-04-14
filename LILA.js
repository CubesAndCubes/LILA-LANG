/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

export class LILA {
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

    #entryMemory = {};

    memory = {};

    registers = {
        areg: 0, // Accumulator Register
        breg: 0, // Base Register
        creg: 0, // Counter Register
        dreg: 0, // Data Register
        sreg: 0, // Stack (Pointer) Register
        freg: 0, // (Stack) Frame (Pointer) Register
    };

    #addressFrom(value) {
        return {
            type: 'address',
            value: value,
        };
    }

    push(value) {
        this.move(
            this.#addressFrom(--this.registers.sreg),
            value,
        );
    }

    #popHelper() {
        return this.retrieve(
            this.#addressFrom(this.registers.sreg++)
        );
    }

    pop(destination) {
        this.move(
            destination,
            this.#popHelper(),
        );
    }

    retrieve(source) {
        switch(source.type) {
            case 'address':
                return this.memory[
                    parseInt(this.#evaluateExpression(source.value))
                ] ?? 0;

            case 'number':
                return source.value;

            case 'identifier':
                if (source.value.toLowerCase?.() in this.registers)
                    return this.registers[source.value.toLowerCase()] ?? 0;
        }
        
        throw SyntaxError(`Invalid retrieval source (${source.value})`);
    }

    move(destination, value) {
        switch (destination.type) {
            case 'address':
                return void (
                    this.memory[
                        parseInt(this.#evaluateExpression(destination.value))
                    ] = value
                );

            case 'identifier':
                if (destination.value.toLowerCase?.() in this.registers)
                    return void (
                        this.registers[destination.value.toLowerCase()] = value
                    );
        }

        throw SyntaxError(`Invalid write destination (${destination.value})`);
    }

    add(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) + value
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
                this.retrieve(destination) - value
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
            value - value2
        );
    }

    multiply(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) * value
            ),
        );
    }

    divide(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) / value
            ),
        );
    }

    bitwiseAnd(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) & value
            ),
        );
    }

    bitwiseOr(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) | value
            ),
        );
    }

    bitwiseExclusiveOr(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) ^ value
            ),
        );
    }

    bitwiseNot(destination) {
        this.move(
            destination,
            this.#adjustFlags(
                ~ this.retrieve(destination)
            ),
        );
    }

    bitwiseLeftShift(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) << value
            ),
        );
    }

    bitwiseRightShift(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) >> value
            ),
        );
    }

    static #preprocess(script) {
        const entryMemory = {};

        // remove comments

        script = script.replace(/;.*/g, '');

        // string expressions to numbers arrays

        script = script.replace(
            /("[^"]+")|('[^']+')/g,
            match => match.slice(1, -1).split('').map(char => char.charCodeAt(0)).join(',')
        );

        // make slim and separate lines

        script = script.match(/\S(.*\S)?/g);

        let allocationPointer = 0;

        const labels = {};

        for (let i = 0; script.length > i; i++) {
            // evaluate dollar signs ($)

            script[i] = script[i].replace(
                /\$/g,
                allocationPointer,
            );

            // evaluate labels

            script[i] = script[i].replace(
                /[_A-Za-z][_A-Za-z\d]*(?!.*:)/g,
                identifier => labels[identifier] ?? identifier,
            );

            // evaluate arithmetic expressions

            script[i] = script[i].replace(
                /([()]+[^\S\n]*)?((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)([^\S\n]*[()]+)?([^\S\n]*[+\-*\/%][*]?[^\S\n]*([()]+[^\S\n]*)?((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)([^\S\n]*[()]+)?)+/g,
                expression => !expression.match(/[^\d+\-*\/%()\s.]/) ? eval(expression) : expression,
            );

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
                    entryMemory[allocationPointer++] = Number(value);

                return pointer;
            });

            // Store in label

            script[i] = script[i].replace(/^[^\S\n]*([_A-Za-z][_A-Za-z\d]*):\s*(\d+(\.\d+)?)\s*$/gm, (match, identifier, content) => {
                content = content.trim();

                labels[identifier] = content;

                return '';
            });
        }

        return [script.join('\n').trim() + '\n', entryMemory];
    }

    static #TokenTypes = {
        whitespace: /^[^\S\n]+/,
        newline: /^\n\s*/,
        address: /^\[[^\S\n]*(\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*|([()]+[^\S\n]*)?((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)([^\S\n]*[()]+)?([^\S\n]*[+\-*\/%][*]?[^\S\n]*([()]+[^\S\n]*)?((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)([^\S\n]*[()]+)?)+)[^\S\n]*\]/,
        number: /^(-[^\S\n]*)?\d+(\.\d+)?/,
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
        this.memory = Object.assign({}, this.#entryMemory);

        for (const register of Object.keys(this.registers))
            this.registers[register] = 0;

        this.codePointer = this.#codeEntry;

        while(this.#code.length > this.codePointer)
            this.#code[this.codePointer++]();

        return this.registers.areg;
    }

    #evaluateExpression(expression) {
        if (typeof expression === 'number')
            return expression;

        expression = expression.toLowerCase();

        if (expression in this.registers)
            return this.registers[expression] ?? 0;

        for (const [register, value] of Object.entries(this.registers))
            expression = expression.replaceAll(register, value ?? 0);

        if (!expression.match(/[^\d+\-*\/%()\s.]/))
            return Number(eval(expression));

        throw SyntaxError(`Arithmetic expression (${expression}) accesses illegal identifier(s).`);
    }

    constructor(script) {
        const [processedScript, entryMemory] = LILA.#preprocess(script);

        this.#entryMemory = entryMemory;

        const tokens = LILA.#tokenize(
            processedScript
        );

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

            const readJump = condition => {
                const label = readToken(['identifier']);

                readToken(['newline']);

                this.#code.push(() => {
                    if (!(label.value in jumpAdresses))
                        throw SyntaxError(`Undefined jump label (${label.value}).`);

                    if (condition())
                        this.codePointer = jumpAdresses[label.value];
                });
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
                    case 'MOVE':
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
                    case 'INCREMENT':
                        destination = readToken(['identifier', 'address']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.increment(destination);
                        });

                        continue;
                    case 'DEC':
                    case 'DECREMENT':
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
                    case 'SUBTRACT':
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
                    case 'MULTIPLY':
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
                    case 'DIV':
                    case 'DIVIDE':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.divide(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'AND':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.bitwiseAnd(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'OR':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.bitwiseOr(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'XOR':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.bitwiseExclusiveOr(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'NOT':
                        destination = readToken(['identifier', 'address']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.bitwiseNot(destination);
                        });

                        continue;
                    case 'SAL':
                    case 'SHL':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.bitwiseLeftShift(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'SAR':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['newline']);

                        this.#code.push(() => {
                            this.bitwiseRightShift(
                                destination,
                                this.retrieve(source),
                            );
                        });

                        continue;
                    case 'CMP':
                    case 'COMPARE':
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
                    case 'RETURN':
                        readToken(['newline']);

                        this.#code.push(() => {
                            this.codePointer = Math.max(
                                0,
                                this.#popHelper(),
                            );
                        });

                        continue;
                    case 'EXIT':
                        readToken(['newline']);

                        this.#code.push(() => {
                            this.codePointer = this.#code.length;
                        });

                        continue;
                    case 'JMP':
                    case 'JUMP':
                        readJump(() => true);

                        continue;
                    case 'JE': // jump if equal
                    case 'JZ': // jump if zero
                        readJump(() => this.flags.zf);

                        continue;
                    case 'JNE': // jump if not equal
                    case 'JNZ': // jump if not zero
                        readJump(() => !this.flags.zf);

                        continue;
                    case 'JS': // jump if sign
                    case 'JL': // jump if less
                        readJump(() => this.flags.sf);

                        continue;
                    case 'JNS': // jump if not sign
                    case 'JGE': // jump if greater or equal
                        readJump(() => !this.flags.sf);

                        continue;
                    case 'JG': // jump if greater
                        readJump(() => !this.flags.sf && !this.flags.zf);

                        continue;
                    case 'JLE': // jump if less or equal
                        readJump(() => this.flags.sf || this.flags.zf);

                        continue;
                    case 'JI': // jump if integral
                        readJump(() => this.flags.if);

                        continue;
                    case 'JNI': // jump if not integral
                        readJump(() => !this.flags.if);

                        continue;
                }
            }

            throw SyntaxError('Unexpected series of tokens.');
        }

        this.#codeEntry = jumpAdresses['_start'];
    }
}