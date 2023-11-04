import * as lexer from './lexer.js';

export function compile(source) {
    return lexer.tokenize(source);
}