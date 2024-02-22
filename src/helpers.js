/**
 * Formats a default error message.
 * 
 * @param {number} line 
 * @param {number} column 
 * @param {string} message 
 * @returns 
 */
export function format_error(line, column, message) {
    return `(line ${line}:${column}); ${message}`;
}

/**
 * Substitutes patterns in a given sequence of nodes based on a given rule.
 * 
 * @param {[]} Nodes 
 * @param {(
 *      consume_node: () => *,
 *      peek_node: (offset = 0) => *?,
 * ) => []?} rule 
 */
export function substitute_matches(Nodes, rule) {
    const ProcessedNodes = [];

    let index = 0;
    let iteration_start_index = 0;

    const consume_node = () => {
        if (!Nodes[index]) {
            throw RangeError('Unexpected end of input, cannot consume another token.');
        }

        return Nodes[index++];
    }

    const peek_node = (offset = 0) => {
        const adjusted_offset = (index - iteration_start_index) + offset;

        if (0 > adjusted_offset) {
            return ProcessedNodes[ProcessedNodes.length + adjusted_offset] ?? null;
        }

        return Nodes[index + offset] ?? null;
    }

    while (Nodes.length > index) {
        iteration_start_index = index;

        const SubstituteNodes = rule(consume_node, peek_node);

        if (SubstituteNodes) {
            ProcessedNodes.push(...SubstituteNodes);
        }
        else {
            index = iteration_start_index;

            ProcessedNodes.push(Nodes[index++]);
        }
    }

    return ProcessedNodes;
}