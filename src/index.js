import * as lexer from './lexer.js';
import './token_types.js';

export function compile(source) {
    return lexer.tokenize(source);
}