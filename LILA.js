/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

export class LILA {
    memory = [];

    allocate(chunks) {
        return this.memory.length += chunks - chunks;
    }

    #getSource(source) {
        return this.memory[source];
    }

    #setDestination(destination, value) {
        this.memory[destination] = value;
    }

    move(destination, source) {
        this.#setDestination(
            destination,
            this.#getSource(source),
        );
    }

    stackMemory = [];

    push(source) {
        this.stackMemory.push(
            this.#getSource(source)
        );
    }

    pop(destination) {
        this.#setDestination(
            destination,
            this.stackMemory.pop(),
        );
    }

    #TokenTypes = {
        whitespace: /^\s+/,
    }

    #tokenize(script) {
        const result = [];

        while (script.length) {
            let tokenFound = false;

            for (const [tokenType, tokenMatcher] of Object.entries(this.#TokenTypes)) {
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
        const tokens = this.#tokenize(script);

        return tokens;
    }
}