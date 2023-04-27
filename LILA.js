/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

export class LILA {
    flags = {
        zf: true, // Zero Flag
        sf: false, // Sign Flag
        if: true, // Integrity/Integer Flag
        ff: true, // Finite Flag
    };

    #adjustFlags(value) {
        this.flags.zf = 0 === value;

        this.flags.sf = 0 > value;

        this.flags.if = Number.isInteger(value);

        this.flags.ff = isFinite(value);

        return value;
    }

    #entryMemory = {};

    memory = {};

    static registers = {
        areg: 0, // Accumulator Register
        breg: 0, // Base Register
        creg: 0, // Counter Register
        dreg: 0, // Data Register
        sreg: 0, // Stack (Pointer) Register
        freg: 0, // (Stack) Frame (Pointer) Register
    };

    registers = Object.assign({}, LILA.registers);

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
        
        throw ReferenceError(`line ${this.#debugLine}; Invalid retrieval source (${source.value})`);
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

        throw ReferenceError(`line ${this.#debugLine}; Invalid write destination (${destination.value})`);
    }

    loadEffectiveAddress(destination, source) {
        if (source.type === 'address') {
            this.move(
                destination,
                parseInt(this.#evaluateExpression(source.value)),
            )

            return;
        }

        throw ReferenceError(`line ${this.#debugLine}; Cannot get effective address of non-address (${source.value})`);
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

    bitwiseUnsignedRightShift(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) >>> value
            ),
        );
    }

    static #preprocess(script) {
        const entryMemory = {};

        // remove comments

        script = script.replace(/;.*/g, '');

        // trim lines

        script = script.replace(/^[^\S\n]+|[^\S\n]+$/g, '');

        // string expressions to numbers arrays

        script = script.replace(
            /("[^"]+")|('[^']+')/g,
            match => match.slice(1, -1).split('').map(char => char.charCodeAt(0)).join(',')
        );

        // separate lines

        script = script.match(/^.*/gm) ?? [];

        let allocationPointer = 0;

        const labels = {};

        for (let lineNumber = 0; script.length > lineNumber; lineNumber++) {
            if (script[lineNumber].trim() === '') {
                script[lineNumber] = '';

                continue;
            }

            // evaluate dollar signs ($)

            script[lineNumber] = script[lineNumber].replace(
                /(?<=[+\-*\/%\s]|^)\$(?=[+\-*\/%\s]|$)/g,
                allocationPointer,
            );

            // evaluate labels

            script[lineNumber] = script[lineNumber].replace(
                /[_A-Za-z][_A-Za-z\d]*(?!.*:)/g,
                identifier => labels[identifier] ?? identifier,
            );

            // evaluate arithmetic expressions

            script[lineNumber] = script[lineNumber].replace(
                /([()]+[^\S\n]*)?((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)([^\S\n]*[()]+)?([^\S\n]*[+\-*\/%][*]?[^\S\n]*([()]+[^\S\n]*)?((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)([^\S\n]*[()]+)?)+/g,
                expression => !expression.match(/[^\d+\-*\/%()\s.]/) ? eval(expression) : expression,
            );

            // REServe Chunks (pesudo instruction)

            script[lineNumber] = script[lineNumber].replace(/RESC[^\S\n]+(\d+(\.\d+)?)/gi, (match, chunks) => {
                const pointer = allocationPointer;

                allocationPointer += Number(parseInt(chunks));

                return pointer;
            });

            // DEFine Chunks (pseudo instruction)

            script[lineNumber] = script[lineNumber].replace(/DEFC[^\S\n]+(\d+(\.\d+)?([^\S\n]*,[^\S\n]*\d+(\.\d+)?)*)/gi, (match, chunks) => {
                const pointer = allocationPointer;

                for (const value of chunks.match(/\d+(\.\d+)?/g) ?? [])
                    entryMemory[allocationPointer++] = Number(value);

                return pointer;
            });

            // Store in label

            script[lineNumber] = script[lineNumber].replace(/^[^\S\n]*([_A-Za-z][_A-Za-z\d]*):\s*(\d+(\.\d+)?)\s*$/gm, (match, identifier, content) => {
                if (identifier[0] === '_')
                    throw SyntaxError(`line ${lineNumber + 1}; The macro label "${identifier}" may not start with an underscore. Identifiers starting with underscores are reserved.`);

                if (Object.keys(LILA.registers).includes(identifier.toLowerCase()))
                    throw SyntaxError(`line ${lineNumber + 1}; The macro label "${identifier}" conflicts with the identifier of a register.`);

                content = content.trim();

                labels[identifier] = content;

                return '';
            });
        }

        if (script.length)
            script = script.join('\n') + '\n';

        return [script, entryMemory];
    }

    static #TokenTypes = {
        whitespace: /^[^\S\n]+/,
        endline: /^\n/,
        address: /^\[[^\S\n]*((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*|([()]+[^\S\n]*)?((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)([^\S\n]*[()]+)?([^\S\n]*[+\-*\/%][*]?[^\S\n]*([()]+[^\S\n]*)?((-[^\S\n]*)?\d+(\.\d+)?|[_A-Za-z][_A-Za-z\d]*)([^\S\n]*[()]+)?)+)[^\S\n]*\]/,
        number: /^(-[^\S\n]*)?\d+(\.\d+)?/,
        comma: /^,/,
        jumplabel: /^[_A-Za-z][_A-Za-z\d]*:/,
        identifier: /^[_A-Za-z][_A-Za-z\d]*/,
    }

    static #tokenize(script) {
        const result = [];

        let lineNumber = 1;

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

                    if (tokenType === 'endline')
                        lineNumber++;

                    result.push({
                        type: tokenType,
                        value: match,
                    });

                    break;
                }
            }

            if (!tokenFound)
                throw SyntaxError(`line ${lineNumber}; Unknown token (${script}).`);
        }

        return result;
    }

    #codeEntry = 0;

    codePointer = 0;

    #oldCodePointer = 0;

    #code = [];

    #codeDebugLineReferences = [];

    get #debugLine() {        
        return this.#codeDebugLineReferences[this.#oldCodePointer];
    }

    #pushCode(code, sourceCodeLineNumber) {
        this.#code.push(code);
        this.#codeDebugLineReferences.push(sourceCodeLineNumber);
    }

    exec() {
        this.memory = Object.assign({}, this.#entryMemory);

        for (const register of Object.keys(this.registers))
            this.registers[register] = 0;

        this.codePointer = this.#codeEntry;

        while(this.#code.length > this.codePointer) {
            this.#code[this.#oldCodePointer = this.codePointer++]();
        }

        return {
            flags: Object.assign({}, this.flags),
            registers: Object.assign({}, this.registers),
            memory: Object.assign({}, this.memory),
        };
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

        throw ReferenceError(`line ${this.#debugLine}; Arithmetic expression (${expression}) contains illegal identifier(s).`);
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

        let lineNumber = 1;

        for (let i = 0; tokens.length > i;) {
            const peekToken = (offset = 0) => tokens[i + offset];

            const readToken = types => {
                const nextToken = peekToken();

                if (!types.includes(nextToken.type))
                    throw SyntaxError(`line ${lineNumber}; Got unexpected token (${nextToken.type})${(nextToken.type !== 'endline') ? ` with value "${nextToken.value}"` : ''}, expected ${types.join(' or ')}.`);

                if (nextToken.type === 'endline')
                    lineNumber++;

                i++;

                return nextToken;
            };

            const readJump = condition => {
                const label = readToken(['identifier']);

                readToken(['endline']);

                this.#pushCode(
                    () => {
                        if (!(label.value in jumpAdresses))
                            throw ReferenceError(`line ${this.#debugLine}; Attempted jump to undefined or invalid label "${label.value}".`);

                        if (condition())
                            this.codePointer = jumpAdresses[label.value];
                    }, lineNumber - 1,
                );
            };

            if (peekToken().type === 'endline') {
                readToken(['endline']);

                continue;
            }

            if (peekToken().type === 'jumplabel') {
                const labelToken = readToken(['jumplabel']);

                if (readToken(['endline'])) {
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

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.move(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'LEA':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['address']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.loadEffectiveAddress(
                                    destination,
                                    source,
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'INC':
                    case 'INCREMENT':
                        destination = readToken(['identifier', 'address']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.increment(destination);
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'DEC':
                    case 'DECREMENT':
                        destination = readToken(['identifier', 'address']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.decrement(destination);
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'ADD':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.add(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'SUB':
                    case 'SUBTRACT':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.subtract(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'MUL':
                    case 'MULTIPLY':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.multiply(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'DIV':
                    case 'DIVIDE':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.divide(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'AND':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.bitwiseAnd(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'OR':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.bitwiseOr(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'XOR':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.bitwiseExclusiveOr(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'NOT':
                        destination = readToken(['identifier', 'address']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.bitwiseNot(destination);
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'SAL':
                    case 'SHL':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.bitwiseLeftShift(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'SAR':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.bitwiseRightShift(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'SHR':
                        destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        source = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.bitwiseUnsignedRightShift(
                                    destination,
                                    this.retrieve(source),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'CMP':
                    case 'COMPARE':
                        value1 = readToken(['identifier', 'address', 'number']);

                        readToken(['comma']);

                        value2 = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.compare(
                                    this.retrieve(value1),
                                    this.retrieve(value2),
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'PSH':
                    case 'PUSH':
                        value1 = readToken(['identifier', 'address', 'number']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.push(
                                    this.retrieve(value1)
                                );
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'POP':
                        destination = readToken(['identifier', 'address']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.pop(destination);
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'CALL':
                        label = readToken(['identifier']);

                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                if (!(label.value in jumpAdresses))
                                    throw ReferenceError(`line ${this.#debugLine}; Attempted call to undefined subroutine "${label.value}".`);

                                this.push(this.#oldCodePointer + 1);

                                this.codePointer = jumpAdresses[label.value];
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'RET':
                    case 'RETURN':
                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.codePointer = this.#popHelper();

                                if (this.codePointer < 0 || this.codePointer > this.#code.length)
                                    throw RangeError(`line ${this.#debugLine}; Jumped out-of-bounds due to invalid return address on top of stack.`);
                            }, lineNumber - 1,
                        );

                        continue;
                    case 'EXIT':
                        readToken(['endline']);

                        this.#pushCode(
                            () => {
                                this.codePointer = this.#code.length;
                            }, lineNumber - 1,
                        );

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
                    case 'JNGE': // jump if not greater or equal
                        readJump(() => this.flags.sf);

                        continue;
                    case 'JNS': // jump if not sign
                    case 'JGE': // jump if greater or equal
                    case 'JNL': // jump if not lesser
                        readJump(() => !this.flags.sf);

                        continue;
                    case 'JG': // jump if greater
                    case 'JNLE': // jump if not less or equal
                        readJump(() => !this.flags.sf && !this.flags.zf);

                        continue;
                    case 'JLE': // jump if less or equal
                    case 'JNG': // jump if not greater
                        readJump(() => this.flags.sf || this.flags.zf);

                        continue;
                    case 'JI': // jump if integral
                        readJump(() => this.flags.if);

                        continue;
                    case 'JNI': // jump if not integral
                        readJump(() => !this.flags.if);

                        continue;
                    case 'JF': // jump if finite
                        readJump(() => this.flags.ff);

                        continue;
                    case 'JNF': // jump if not finite
                        readJump(() => !this.flags.ff);

                        continue;
                }
            }

            throw SyntaxError(`line ${lineNumber}; Invalid sequence of tokens (${tokens.slice(i - 1).map(token => token.type).join(', ')}).`);
        }

        this.#codeEntry = jumpAdresses['_start'];
    }
}