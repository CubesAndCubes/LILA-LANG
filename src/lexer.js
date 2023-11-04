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
 * Registered types of tokens.
 * 
 * @type {Map<Symbol, RegExp>}
 */
const TokenTypes = new Map();

/**
 * Registers a new token type.
 * 
 * @param {RegExp} type_matcher 
 */
export function register_token_type(type_matcher) {
    const type_symbol = Symbol();

    TokenTypes.set(type_symbol, type_matcher);

    return type_symbol;
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

        for (const [token_type, token_matcher] of TokenTypes.entries()) {
            match = source.match(token_matcher)?.[0] ?? null;

            if (match) {
                match_type = token_type;

                break;
            }
        }

        if (!match)
            throw SyntaxError(`(line ${line}:${column}); Unknown token (${source.trim()}).`);

        // slice off the match from the source buffer
        source = source.slice(match.length);

        Tokens.push(new Token(
            match_type,
            match,
            line,
            column,
        ));
    }

    return Tokens;
}