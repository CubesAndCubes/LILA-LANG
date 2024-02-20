import { Token } from './lexer.js';
import * as token_definitions from './token_definitions.js';

/**
 * 
 * @param {Token[]} Tokens 
 */
function reduce_line_breaks(Tokens) {
    const ProcessedTokens = [];

    for (let i = 0; Tokens.length > i; i++) {
        if (Tokens[i].type === token_definitions.line_break && Tokens[i - 1].type === token_definitions.line_break) {
            continue;
        }

        ProcessedTokens.push(Tokens[i]);
    }

    return ProcessedTokens;
}

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
 * 
 * @param {Token[]} Tokens 
 */
function separate_tokens_by_line(Tokens) {
    const Lines = [];

    let LineCollection = [];
    let line = Tokens[0]?.line ?? 0;

    for (const Token of Tokens) {
        if (Token.line > line) {
            Lines.push(LineCollection);

            LineCollection = [];

            line = Token.line;
        }

        LineCollection.push(Token);
    }

    if (LineCollection.length > 0) {
        Lines.push(LineCollection);
    }

    return Lines;
}

/**
 * 
 * @param {Token[]} Tokens 
 */
function process_lines(Tokens) {
    let allocation_pointer = 0;

    const Constants = {};

    const Lines = separate_tokens_by_line(Tokens);

    for (let i = 0; Lines.length > i; i++) {
        for (let j = 0; Lines[j].length > j; j++) {
            if (Lines[j].type === token_definitions.dollar) {
                // Substitute dollar token ($)

                ProcessedTokens.push(new Token(
                    token_definitions.number,
                    allocation_pointer,
                    Tokens[j].line,
                    Tokens[j].column,
                ));

                continue;
            }
            else if (Tokens[j].type === token_definitions.identifier && Tokens[j + 1]?.type !== token_definitions.colon && Tokens[j].value in Constants) {
                // Substitute label

                ProcessedTokens.push(...Constants[Tokens[j].value]);

                continue;
            }

            ProcessedTokens.push(Tokens[j]);
        }
    }

    return ProcessedTokens;
}

/**
 * Processes a given sequence of tokens and prepares it for parsing.
 * 
 * @param {Token[]} Tokens 
 */
export function process(Tokens) {
    Tokens = reduce_line_breaks(Tokens);

    Tokens = convert_strings_to_numbers(Tokens);

    Tokens = process_lines(Tokens);

    return Tokens;
}