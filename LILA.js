/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

class Token {
    type;
    value;

    /**
     * @param {string} type 
     * @param {any} value 
     */
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

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

    #pushHelper(value) {
        this.move(
            new Token(
                'address',
                --this.registers.sreg,
            ),
            value,
        );
    }

    #popHelper() {
        return this.retrieve(
            new Token(
                'address',
                this.registers.sreg++,
            )
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
        
        throw ReferenceError(`On line ${this.#debugLine}; Invalid retrieval source (${source.value})`);
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

        throw ReferenceError(`On line ${this.#debugLine}; Invalid write destination (${destination.value})`);
    }

    #memoryGet(address) {
        return this.memory[address] ?? 0;
    }

    #memorySet(address, value) {
        this.memory[address] = value;
    }
    
    #getString(address, length) {
        let message = '';

        for (let i = 0; length > i; i++) {
            const char = this.#memoryGet(address + i);

            if (!char) {
                break;
            }

            message += String.fromCharCode(char);
        }

        return message;
    }

    static #preprocess(script) {
        const entryMemory = {};

        // crlf to lf

        script = script.replace(/\r\n/g, '\n');

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
                identifier => labels[identifier.toUpperCase()] ?? identifier,
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
                    throw SyntaxError(`On line ${lineNumber + 1}; The macro label "${identifier}" may not start with an underscore. Identifiers starting with underscores are reserved for integrated functions.`);

                if (Object.keys(LILA.registers).includes(identifier.toLowerCase()))
                    throw SyntaxError(`On line ${lineNumber + 1}; The macro label "${identifier}" is in conflict with the identifier of a register.`);

                content = content.trim();

                labels[identifier.toUpperCase()] = content;

                return '';
            });
        }

        if (script.length)
            script = script.join('\n') + '\n';

        return [script, entryMemory];
    }

    static #TokenTypes = {
        whitespace: /^[^\S\n]+/,
        'line break': /^\n/,
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

                    if (tokenType === 'line break')
                        lineNumber++;

                    result.push(new Token(
                        tokenType,
                        match,
                    ));

                    break;
                }
            }

            if (!tokenFound)
                throw SyntaxError(`On line ${lineNumber}; Unknown token (${script.trim()}).`);
        }

        return result;
    }

    #codeEntry = 0;

    codePointer = 0;

    #previous_code_pointer = 0;

    #code = [];

    #codeDebugLineReferences = [];

    get #debugLine() {        
        return this.#codeDebugLineReferences[this.#previous_code_pointer];
    }

    #pushCode(code, sourceCodeLineNumber) {
        this.#code.push(code);
        this.#codeDebugLineReferences.push(sourceCodeLineNumber);
    }

    get state() {
        return {
            flags: Object.assign({}, this.flags),
            registers: Object.assign({}, this.registers),
            memory: Object.assign({}, this.memory),
        };
    }

    exec() {
        this.memory = Object.assign({}, this.#entryMemory);

        for (const register of Object.keys(this.registers))
            this.registers[register] = 0;

        this.codePointer = this.#codeEntry;

        while(this.#code.length > this.codePointer) {
            this.#code[this.#previous_code_pointer = this.codePointer++]();
        }

        return this.state;
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

        throw ReferenceError(`On line ${this.#debugLine}; Arithmetic expression (${expression}) contains illegal identifier(s).`);
    }

    static #getTokenInfo(token) {
        let tokenValue = token.value;

        switch (token.type) {
            case 'line break':
                tokenValue = '\\n';

                break;
            case 'address':
                tokenValue = `[${token.value}]`;
        }

        return `${tokenValue !== null ? `"${tokenValue}" ` : ''}(${token.type})`;
    }

    #matchHelper(sample, fallback_action, ...cases) {
        for (const match_case of cases) {
            const patterns = match_case[0];
            const action = match_case[1];

            if (patterns.includes(sample))
                return action(sample);
        }

        return fallback_action(sample);
    }

    constructor(script) {
        const [processedScript, entryMemory] = LILA.#preprocess(script);

        this.#entryMemory = entryMemory;

        const tokens = LILA.#tokenize(
            processedScript
        );

        const jumpAdresses = {
            '_START': this.#codeEntry
        };

        let lineNumber = 1;

        for (let i = 0; tokens.length > i;) {
            const peekToken = (offset = 0) => tokens[i + offset];

            const readToken = types => {
                const nextToken = peekToken();

                if (!types.includes(nextToken.type))
                    throw SyntaxError(`On line ${lineNumber}; Got unexpected token ${LILA.#getTokenInfo(nextToken)}. Expected ${types.map(type => (type === 'line break' ? 'end of instruction' : type)).join(' or ')}.`);

                if (nextToken.type === 'line break')
                    lineNumber++;

                i++;

                return nextToken;
            };

            const readJump = condition => {
                const destination = readToken(['identifier', 'number', 'address']);

                readToken(['line break']);

                if (destination.type === 'identifier') {
                    const destination_value = destination.value.toUpperCase();

                    return () => {
                        if (!(destination_value in jumpAdresses))
                            throw ReferenceError(`On line ${this.#debugLine}; Attempted jump to undefined or invalid label "${destination.value}".`);

                        if (!condition || condition())
                            this.codePointer = jumpAdresses[destination_value];
                    };
                }

                return () => {
                    if (!condition || condition()) {
                        this.codePointer = this.retrieve(destination);

                        if (this.codePointer < 0 || this.codePointer > this.#code.length)
                            throw RangeError(`On line ${this.#debugLine}; Jumped out-of-bounds due to the given address pointing outside the code space.`);
                    }
                };
            };

            if (peekToken().type === 'line break') {
                readToken(['line break']);

                continue;
            }

            if (peekToken().type === 'jumplabel') {
                const labelToken = readToken(['jumplabel']);

                if (readToken(['line break'])) {
                    jumpAdresses[labelToken.value.toUpperCase()] = this.#code.length;

                    continue;
                }
            }

            if (peekToken().type === 'identifier') {
                const code = this.#matchHelper(
                    readToken(['identifier']).value.toUpperCase(),
                    () => null,
                    [['MOV', 'MOVE'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.retrieve(source),
                            );
                        };
                    }],
                    [['LEA'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['address']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                parseInt(this.#evaluateExpression(source.value)),
                            )
                        };
                    }],
                    [['INC', 'INCREMENT'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) + 1
                                ),
                            );
                        };
                    }],
                    [['DEC', 'DECREMENT'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) - 1
                                ),
                            );
                        };
                    }],
                    [['ADD'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) + this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['SUB', 'SUBTRACT'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) - this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['MUL', 'MULTIPLY'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) * this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['DIV', 'DIVIDE'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) / this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['AND'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) & this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['OR'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) | this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['XOR'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) ^ this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['NOT'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    ~this.retrieve(destination)
                                ),
                            );
                        };
                    }],
                    [['NEG', 'NEGATE'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) * -1
                                ),
                            );
                        };
                    }],
                    [['SAL', 'SHL'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) << this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['SAR'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) >> this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['SHR'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#adjustFlags(
                                    this.retrieve(destination) >>> this.retrieve(source)
                                ),
                            );
                        };
                    }],
                    [['XCHG', 'EXCHANGE'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['comma']);

                        const source = readToken(['identifier', 'address']);

                        readToken(['line break']);

                        return () => {
                            const temp = this.retrieve(destination);

                            this.move(
                                destination,
                                this.retrieve(source),
                            );

                            this.move(
                                source,
                                temp,
                            );
                        };
                    }],
                    [['CMP', 'COMPARE'], () => {
                        const value1 = readToken(['identifier', 'address', 'number']);

                        readToken(['comma']);

                        const value2 = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.#adjustFlags(
                                this.retrieve(value1) - this.retrieve(value2)
                            );
                        };
                    }],
                    [['TEST'], () => {
                        const value1 = readToken(['identifier', 'address', 'number']);

                        readToken(['comma']);

                        const value2 = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.#adjustFlags(
                                this.retrieve(value1) & this.retrieve(value2)
                            );
                        };
                    }],
                    [['PSH', 'PUSH'], () => {
                        const value1 = readToken(['identifier', 'address', 'number']);

                        readToken(['line break']);

                        return () => {
                            this.#pushHelper(
                                this.retrieve(value1)
                            );
                        };
                    }],
                    [['POP'], () => {
                        const destination = readToken(['identifier', 'address']);

                        readToken(['line break']);

                        return () => {
                            this.move(
                                destination,
                                this.#popHelper(),
                            );
                        };
                    }],
                    [['CALL'], () => {
                        const destination = readToken(['identifier', 'number', 'address']);

                        if (destination.type === 'identifier') {
                            const destination_value = destination.value.toUpperCase();

                            const call_to_builtin = destination.value[0] === '_';

                            if (call_to_builtin && !(destination_value in this.#integrated_functions))
                                throw ReferenceError(`On line ${lineNumber}; Attempted call to undefined integrated function "${destination.value}".`);

                            readToken(['line break']);

                            if (call_to_builtin)
                                return this.#integrated_functions[destination_value];

                            return () => {
                                if (!(destination_value in jumpAdresses))
                                    throw ReferenceError(`On line ${this.#debugLine}; Attempted call to undefined subroutine "${destination.value}".`);

                                this.#pushHelper(this.#previous_code_pointer + 1);

                                this.codePointer = jumpAdresses[destination_value];
                            };
                        }

                        readToken(['line break']);

                        return () => {
                            this.#pushHelper(this.#previous_code_pointer + 1);

                            this.codePointer = this.retrieve(destination);

                            if (this.codePointer < 0 || this.codePointer > this.#code.length)
                                throw RangeError(`On line ${this.#debugLine}; Jumped out-of-bounds due to the given address pointing outside the code space.`);
                        };
                    }],
                    [['RET', 'RETURN'], () => {
                        readToken(['line break']);

                        return () => {
                            this.codePointer = this.#popHelper();

                            if (this.codePointer < 0 || this.codePointer > this.#code.length)
                                throw RangeError(`On line ${this.#debugLine}; Jumped out-of-bounds due to the return address on top of the stack pointing outside the code space.`);
                        };
                    }],
                    [['EXIT'], () => {
                        readToken(['line break']);

                        return () => {
                            this.codePointer = this.#code.length;
                        };
                    }],
                    [['JMP', 'JUMP'], () => readJump(null)],
                    [[
                        'JE', // jump if equal
                        'JZ', // jump if zero
                    ], () => readJump(() => this.flags.zf)],
                    [[
                        'JNE', // jump if not equal
                        'JNZ', // jump if not zero
                    ], () => readJump(() => !this.flags.zf)],
                    [[
                        'JS', // jump if sign
                        'JL', // jump if less
                        'JNGE', // jump if not greater or equal
                    ], () => readJump(() => this.flags.sf)],
                    [[
                        'JNS', // jump if not sign
                        'JGE', // jump if greater or equal
                        'JNL', // jump if not lesser
                    ], () => readJump(() => !this.flags.sf)],
                    [[
                        'JG', // jump if greater
                        'JNLE', // jump if not less or equal
                    ], () => readJump(() => !this.flags.sf && !this.flags.zf)],
                    [[
                        'JLE', // jump if less or equal
                        'JNG', // jump if not greater
                    ], () => readJump(() => this.flags.sf || this.flags.zf)],
                    [[
                        'JI', // jump if integral
                    ], () => readJump(() => this.flags.if)],
                    [[
                        'JNI', // jump if not integral
                    ], () => readJump(() => !this.flags.if)],
                    [[
                        'JF',// jump if finite
                    ], () => readJump(() => this.flags.ff)],
                    [[
                        'JNF', // jump if not finite
                    ], () => readJump(() => !this.flags.ff)],
                );

                if (code) {
                    this.#pushCode(
                        code,
                        lineNumber - 1,
                    );

                    continue;
                }
            }

            throw SyntaxError(`On line ${lineNumber}; Invalid token sequence ${tokens.slice(i - 1).map(token => LILA.#getTokenInfo(token)).join(', ')}.`);
        }

        this.#codeEntry = jumpAdresses['_START'];
    }

    #integrated_functions = {
        '_PRINT': () => {
            const message_pointer = this.registers.areg;
            const message_length = this.registers.breg;

            alert(this.#getString(
                message_pointer,
                message_length,
            ));
        },
        '_READ': () => {
            const message_pointer = this.registers.creg;
            const message_length = this.registers.dreg;

            const input = prompt(this.#getString(
                message_pointer,
                message_length,
            )) ?? '';

            const buffer_pointer = this.registers.areg;
            const buffer_length = this.registers.breg;

            for (let i = 0; buffer_length > i; i++) {
                const char = input[i];

                if (char) {
                    this.#memorySet(
                        buffer_pointer + i,
                        char.charCodeAt(0)
                    );
                }
                else {
                    this.#memorySet(
                        buffer_pointer + i,
                        0
                    );
                }
            }
        },
    }
}