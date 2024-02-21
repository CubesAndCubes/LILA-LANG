import * as token_definitons from './token_definitions.js';
import { format_error } from './helpers.js';

/**
 * A fragment of the source code.
 */
export class Token {
    type;
    value;
    line;
    column;
    end_column;

    /**
     * @param {Symbol} type 
     * @param {*} value 
     * @param {number} line 
     * @param {number} column 
     * @param {number} end_column 
     */
    constructor(type, value, line, column, end_column) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
        this.end_column = end_column;
    }
}

/**
 * Separates a given source into a sequence of tokens.
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
            throw SyntaxError(format_error(line, column, `unknown token (${source.trim()}).`));

        // remember current line and column
        const current_line = line;
        const current_column = column;
        const currnet_end_column = column + match.length;

        // slice off the match from the source buffer
        source = source.slice(match.length);

        // advance columns
        column += match.length;

        if (match_type === token_definitons.whitespace)
            continue; // discard
        else if (match_type === token_definitons.comment)
            continue; // discard
        else if (match_type === token_definitons.string) {
            match = match.slice(1, -1); // strip quotes
        }
        else if (match_type === token_definitons.number) {
            match = Number(match); // parse to number
        }

        Tokens.push(new Token(
            match_type,
            match,
            current_line,
            current_column,
            currnet_end_column,
        ));

        if (match_type === token_definitons.line_break) {
            // advance line
            line++;
            column = 1;
        }
    }

    return Tokens;
}