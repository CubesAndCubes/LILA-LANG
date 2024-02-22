import { Token } from './lexer.js';
import * as token_definitions from './token_definitions.js';
import { format_error, substitute_matches } from './helpers.js';

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
 * Processes a given sequence of tokens and prepares it for parsing.
 * 
 * @param {Token[]} Tokens 
 */
export function process(Tokens) {
    // compress line breaks
    Tokens = substitute_matches(Tokens, (consume, peek) => {
        if (peek()?.type === token_definitions.line_break && peek(-1)?.type === token_definitions.line_break) {
            consume();

            return [];
        }

        return null;
    });

    // convert strings to numbers
    Tokens = substitute_matches(Tokens, (consume, peek) => {
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

        return null;
    });

    let allocation_pointer = 0;

    const Constants = {};

    Tokens = separate_tokens_by_line(Tokens).map(LineTokens => {
        // substitute dollar tokens ($)
        LineTokens = substitute_matches(LineTokens, (consume, peek) => {
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

            return null;
        });

        // substitute label
        LineTokens = substitute_matches(LineTokens, (consume, peek) => {
            if (peek()?.type === token_definitions.identifier && peek(1)?.type !== token_definitions.colon && peek()?.value in Constants) {
                const Label = consume();

                return Constants[Label.value];
            }

            return null;
        });

        // pre-compute arithmetic expressions
        LineTokens = substitute_matches(LineTokens, (consume, peek) => {
            const collect_expression = () => {
                if (peek()?.type === token_definitions.opening_parenthesis) {
                    consume();

                    const expression = collect_binary_expression(collect_expression());

                    if (!expression) {
                        return null;
                    }

                    if (peek()?.type !== token_definitions.closing_parenthesis) {
                        throw SyntaxError(format_error(peek(-1).line, peek(-1).end_column, 'parentheses have not been terminated.'));
                    }

                    consume();

                    return expression;
                }
                else if (peek()?.type === token_definitions.number) {
                    return consume();
                }

                return null;
            }

            const collect_binary_expression = (left) => {
                if (!left) {
                    return null;
                }

                if (peek()?.type !== token_definitions.operator) {
                    return left;
                }

                const operator = consume();

                const right = collect_expression();

                if (!right) {
                    throw SyntaxError('Unexpected end of input.');
                }

                return collect_binary_expression({
                    left,
                    operator,
                    right,
                });
            }

            const Expression = collect_binary_expression(collect_expression());

            if (Expression instanceof Token) {
                return null;
            }

            console.log(Expression);

            const evaluate_expression = (expression) => {

            }

            evaluate_expression(Expression);

            return [];
        });

        return LineTokens;
    }).flat();

    return Tokens;
}