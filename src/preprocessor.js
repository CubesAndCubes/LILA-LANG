import { Token } from './lexer.js';
import * as token_definitions from './token_definitions.js';

/**
 * 
 * @param {Token[]} Tokens 
 */
function convert_strings_to_numbers(Tokens) {
    const ProcessedTokens = [];

    for (const CurrentToken of Tokens) {
        if (CurrentToken.type === token_definitions.string) {
            for (let i = 0; CurrentToken.value.length > i; i++) {
                ProcessedTokens.push(new Token(
                    token_definitions.number,
                    CurrentToken.value[i].charCodeAt(0),
                    CurrentToken.line,
                    CurrentToken.column,
                ));

                if (CurrentToken.value.length - 1 > i) {
                    ProcessedTokens.push(new Token(
                        token_definitions.comma,
                        ',',
                        CurrentToken.line,
                        CurrentToken.column,
                    ));
                }
            }

            continue;
        }

        ProcessedTokens.push(CurrentToken);
    }

    return ProcessedTokens;
}

/**
 * Processes a given sequence of tokens and prepares it for parsing.
 * 
 * @param {Token[]} Tokens 
 */
export function process(Tokens) {
    Tokens = convert_strings_to_numbers(Tokens);

    return Tokens;
}