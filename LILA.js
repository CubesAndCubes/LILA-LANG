/* LILA | Low-Level Instruction Language | Copyright (c) 2023 CubesAndCubes */

export class LILA {
    memory = [];

    allocate(chunks) {
        return this.memory.length += chunks - chunks;
    }

    #tokenize(script) {
        const result = [];

        let temp = '';

        for (const current of script) {
            temp += current;

            let tokenFound = false;

            switch(temp) {
                
            }

            if (tokenFound)
                temp = '';
        }

        return result;
    }

    eval(script) {
        const tokens = this.#tokenize(script);
    }
}