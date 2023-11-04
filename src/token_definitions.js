/**
 * All defined types of tokens.
 * 
 * @type {Map<Symbol, RegExp>}
 */
const TokenTypes = new Map();

/**
 * Defines a new token type.
 * 
 * @param {RegExp} type_matcher 
 */
function define_type(type_matcher) {
    const type_symbol = Symbol();

    TokenTypes.set(type_symbol, type_matcher);

    return type_symbol;
}

/**
 * Returns symbols and matchers of all defined token types.
 */
export function get_definitions() {
    return TokenTypes.entries();
}

export const whitespace = define_type(
    /^[^\S\n]+/,
);

export const comment = define_type(
    /^;.*/,
);

export const identifier = define_type(
    /^[_A-Za-z][_A-Za-z\d]*/,
);

export const number = define_type(
    /^(-[^\S\n]*)?\d+(\.\d+)?/,
);

export const string = define_type(
    /^"[^"]+"|'[^']+'/,
);

export const line_break = define_type(
    /^\n/,
);

export const opening_square_bracket = define_type(
    /^\[/,
);

export const closing_square_bracket = define_type(
    /^\]/,
);

export const operator = define_type(
    /^\+|\-|\*|\/|\%/,
);

export const comma = define_type(
    /^\,/,
);

export const colon = define_type(
    /^\:/,
);

export const dollar = define_type(
    /^\$/,
);

export const opening_parenthesis = define_type(
    /^\(/,
);

export const closing_parenthesis = define_type(
    /^\)/,
);