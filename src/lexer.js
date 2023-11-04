import * as token_definitons from './token_definitions.js';

/**
 * A fragment of the source code.
 */
export class Token {
    type;
    value;
    line;
    column;

    /**
     * @param {string} type 
     * @param {string} value 
     * @param {number} line 
     * @param {number} column 
     */
    constructor(type, value, line, column) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }
}

/**
 * Separates a given source into tokens.
 * 
 * @param {string} source 
 */
export function tokenize(source) {
    /**
     * @type {Token[]}
     */
    const Tokens = [];

    let line = 1;
    let column = 1;

    while (source.length > 0) {
        let match = null;
        let match_type = null;

        for (const [token_type, token_matcher] of token_definitons.get_definitions()) {
            match = source.match(token_matcher)?.[0] ?? null;

            if (match) {
                match_type = token_type;

                break;
            }
        }

        if (!match)
            throw SyntaxError(`(line ${line}:${column}); Unknown token (${source.trim()}).`);

        const old_line = line;
        const old_column = column;

        // slice off the match from the source buffer
        source = source.slice(match.length);

        column += match.length;

        if (match_type === token_definitons.whitespace)
            continue; // discard
        else if (match_type === token_definitons.comment)
            continue; // discard
        else if (match_type === token_definitons.line_break) {
            line++;
            column = 1;

            continue; // discard
        }
        else if (match_type === token_definitons.string) {
            match = match.slice(1, -1); // strip quotes
        }
        else if (match_type === token_definitons.number) {
            match = Number(match);
        }

        Tokens.push(new Token(
            match_type,
            match,
            old_line,
            old_column,
        ));
    }

    return Tokens;
}