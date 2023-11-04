import * as lexer from './lexer.js';

export const whitespace = lexer.register_token_type(
    /^[^\S\n]+/,
);

export const line_break = lexer.register_token_type(
    /^\n/,
);

export const comma = lexer.register_token_type(
    /^\,/,
);

export const colon = lexer.register_token_type(
    /^\:/,
);

export const opening_square_bracket = lexer.register_token_type(
    /^\[/,
);

export const closing_square_bracket = lexer.register_token_type(
    /^\]/,
);

export const opening_parenthesis = lexer.register_token_type(
    /^\(/,
);

export const closing_parenthesis = lexer.register_token_type(
    /^\)/,
);

export const identifier = lexer.register_token_type(
    /^\)/,
);