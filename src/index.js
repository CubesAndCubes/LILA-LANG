import * as lexer from './lexer.js';
import * as preprocessor from './preprocessor.js';

export function compile(source) {
    let Tokens = lexer.tokenize(source);

    console.log(Tokens);

    Tokens = preprocessor.process(Tokens);

    console.log(Tokens);

    return Tokens;
}