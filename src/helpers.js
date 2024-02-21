export function format_error(line, column, message) {
    return `(line ${line}:${column}); ${message}`;
}