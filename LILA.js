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

    registers = {
        areg: 0, // Accumulator Register
        breg: 0, // Base Register
        creg: 0, // Counter Register
        dreg: 0, // Data Register
    };

    memory = [];

    allocate(chunks) {
        return this.memory.length += chunks - chunks;
    }

    retrieve(source) {
        if (source in this.registers)
            return this.registers[source];

        return this.memory[source];
    }

    move(destination, value) {
        if (destination in this.registers)
            return void (this.registers[destination] = LILA.#normalizeValue(value));

        this.memory[destination] = LILA.#normalizeValue(value);
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

    stackMemory = [];

    push(value) {
        this.stackMemory.push(
            LILA.#normalizeValue(value)
        );
    }

    pop(destination) {
        this.move(
            destination,
            this.stackMemory.pop(),
        )
    }

    static #TokenTypes = {
        whitespace: /^\s+/,
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

    eval(script) {
        const tokens = LILA.#tokenize(script);

        return tokens;
    }
}