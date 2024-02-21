import { Token } from './lexer.js';
import * as token_definitions from './token_definitions.js';
import { format_error } from './helpers.js';

/**
 * Helper for handling pre-processing steps.
 * 
 * @param {Token[]} Tokens 
 * @param {(
 *      consume_token: () => Token,
 *      peek_token: (offset = 0) => Token?,
 * ) => Token[]?} handler 
 */
function process_step(Tokens, handler) {
    /**
     * @type {Token[]}
     */
    const ProcessedTokens = [];

    let walker_index = 0;
    let iteration_start_walker_index = walker_index;

    const peek_token = (offset = 0) => {
        if (0 > (walker_index - iteration_start_walker_index) + offset) {
            return ProcessedTokens[ProcessedTokens.length + (walker_index - iteration_start_walker_index) + offset] ?? null;
        }

        return Tokens[walker_index + offset] ?? null;
    }

    const consume_token = () => {
        if (!Tokens[walker_index]) {
            throw RangeError('Unexpected end of input; cannot consume another token.');
        }

        return Tokens[walker_index++];
    }

    while (Tokens.length > walker_index) {
        iteration_start_walker_index = walker_index;

        const SubstituteTokens = handler(consume_token, peek_token);

        if (iteration_start_walker_index === walker_index) {
            ProcessedTokens.push(Tokens[walker_index++]);
        }
        else if (SubstituteTokens && SubstituteTokens.length > 0) {
            ProcessedTokens.push(...SubstituteTokens);
        }
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
                    Tokens[j].end_column,
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
    // compress line breaks
    Tokens = process_step(Tokens, (consume, peek) => {
        if (peek()?.type === token_definitions.line_break && peek(-1)?.type === token_definitions.line_break) {
            consume();
        }
    });

    // convert strings to numbers
    Tokens = process_step(Tokens, (consume, peek) => {
        if (peek()?.type === token_definitions.string) {
            const StringToken = consume();
            const SubstituteTokens = [];

            for (let i = 0; StringToken.value.length > i; i++) {
                SubstituteTokens.push(new Token(
                    token_definitions.number,
                    StringToken.value[i].charCodeAt(0),
                    StringToken.line,
                    StringToken.column,
                    StringToken.end_column,
                ));

                if (StringToken.value.length - 1 > i) {
                    SubstituteTokens.push(new Token(
                        token_definitions.comma,
                        ',',
                        StringToken.line,
                        StringToken.column,
                        StringToken.end_column,
                    ));
                }
            }

            return SubstituteTokens;
        }
    });

    let allocation_pointer = 0;

    const Constants = {};

    Tokens = separate_tokens_by_line(Tokens).map(LineTokens => {
        // substitute dollar tokens ($)
        LineTokens = process_step(LineTokens, (consume, peek) => {
            if (peek()?.type === token_definitions.dollar) {
                const DollarToken = consume();

                return [new Token(
                    token_definitions.number,
                    allocation_pointer,
                    DollarToken.line,
                    DollarToken.column,
                    DollarToken.end_column,
                )];
            }
        });

        // substitute label
        LineTokens = process_step(LineTokens, (consume, peek) => {
            if (peek()?.type === token_definitions.identifier && peek(1)?.type !== token_definitions.colon && peek()?.value in Constants) {
                const Label = consume();

                return Constants[Label.value];
            }
        });

        // pre-compute arithmetic expressions
        LineTokens = process_step(LineTokens, (consume, peek) => {
            const collect_sub_expression = (group = false) => {
                const Body = [];

                if (group) {
                    if (peek()?.type !== token_definitions.opening_parenthesis) {
                        throw SyntaxError('Group must start with opening partenthesis.');
                    }

                    consume();
                }

                while ([token_definitions.number, token_definitions.identifier, token_definitions.opening_parenthesis].includes(peek()?.type)) {
                    if (peek()?.type === token_definitions.opening_parenthesis) {
                        Body.push(collect_sub_expression(true));
                    }
                    else {
                        Body.push(consume());
                    }

                    if (peek()?.type === token_definitions.operator) {
                        Body.push(consume());

                        continue;
                    }

                    throw SyntaxError(format_error(peek().line, peek().end_column, `unknown token (${peek()?.value ?? null}) in arithmetic expression.`));
                }

                if (group) {
                    if (peek()?.type !== token_definitions.closing_parenthesis) {
                        throw SyntaxError(format_error(peek(-1).line, peek(-1).end_column, 'parentheses have not been terminated.'));
                    }

                    consume();
                }

                return Body;
            }

            const Expression = collect_sub_expression();

            console.log(Expression);

            return Expression;
        });

        return LineTokens;
    }).flat();

    return Tokens;
}