/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

export class LILA {
    static #normalizeValue(value) {
        switch(typeof value) {
            case 'number': return value;
            case 'string': return value.charCodeAt(0);
            default:       return 0;
        }
    }

    registers = {
        areg: 0,
        breg: 0,
        creg: 0,
        dreg: 0, 
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

    add(destination, value) {
        this.move(
            destination,
            this.retrieve(destination) + LILA.#normalizeValue(value),
        );
    }

    subtract(destination, value) {
        this.move(
            destination,
            this.retrieve(destination) - LILA.#normalizeValue(value),
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