import * as lexer from './lexer.js';

export const whitespace = lexer.register_token_type(
    'whitespace',
    /^[^\S\n]+/,
);

export const line_break = lexer.register_token_type(
    'line break',
    /^\n/,
);

export const comma = lexer.register_token_type(
    'comma',
    /^\,/,
);

export const colon = lexer.register_token_type(
    'colon',
    /^\:/,
);

export const opening_square_bracket = lexer.register_token_type(
    'opening square bracket',
    /^\[/,
);

export const closing_square_bracket = lexer.register_token_type(
    'closing square bracket',
    /^\]/,
);