/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

export class LILA {
    static #normalizeValue(value) {
        switch(typeof value) {
            case 'number': return value;
            case 'string': return value.charCodeAt(0);
            default:       return 0;
        }
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

    allocationPointer = 0;

    allocate(chunks) {
        const pointer = this.allocationPointer;

        for (let i = 0; chunks > i; i++)
            this.memory[this.allocationPointer++] = 0;

        return pointer;
    }

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
            return this.registers[source];

        if (!isNaN(Number(source)))
            return this.memory[parseInt(Number(source))];
        
        throw SyntaxError(`Invalid retrieval source (${source})`);
    }

    move(destination, value) {
        if (destination in this.registers)
            return void (this.registers[destination] = LILA.#normalizeValue(value));

        if (!isNaN(Number(destination)))
            return void (this.memory[parseInt(Number(destination))] = LILA.#normalizeValue(value));

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

    subtract(destination, value) {
        this.move(
            destination,
            this.#adjustFlags(
                this.retrieve(destination) - LILA.#normalizeValue(value)
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

    static #TokenTypes = {
        whitespace: /^\s+/,
        comment: /^;.*/,
        number: /^\d+(\.\d+)?/,
        comma: /^,/,
        colon: /^:/,
        identifier: /^[_A-Za-z][_A-Za-z\d]*/,
    }

    static #tokenize(script) {
        const result = [];

        while (script.length) {
            let tokenFound = false;

            for (const [tokenType, tokenMatcher] of Object.entries(LILA.#TokenTypes)) {
                const match = script.match(tokenMatcher)?.[0] ?? null;

                if (match) {
                    script = script.slice(match.length);

                    tokenFound = true;

                    if (tokenType === 'whitespace')
                        break;

                    if (tokenType === 'comment')
                        break;

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