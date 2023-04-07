/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

export class LILA {
    memory = [];

    allocate(chunks) {
        return this.memory.length += chunks - chunks;
    }

    #TokenTypes = {
        
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

                    result.push({
                        type: tokenType,
                        value: match,
                    });
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