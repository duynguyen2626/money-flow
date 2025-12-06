/**
 * Helper function to render enhanced refund note with icons
 * Format: [UUID] Notes or [Original_ID] Notes
 */

export function parseRefundNote(note: string | null | undefined): {
    isRefund: boolean;
    groupId: string | null;
    sequence: number | null;
    cleanNote: string;
} {
    if (!note) {
        return { isRefund: false, groupId: null, sequence: null, cleanNote: '' };
    }

    // Match pattern: [UUID] or [Original_ID] at start
    // Matches standard UUID (8-4-4-4-12) or any ID inside brackets
    const idMatch = note.match(/^\[([a-zA-Z0-9-]+)\]\s*(.*)$/);

    if (idMatch) {
        const [, fullId, cleanNote] = idMatch;
        // Construct a short ID for display (first 4...last 4)
        const shortId = fullId.length > 8
            ? `${fullId.substring(0, 4)}...${fullId.substring(fullId.length - 4)}`
            : fullId;

        return {
            isRefund: true,
            groupId: shortId,
            sequence: null, // No explicit sequence in new format, handled by logic/context if needed
            cleanNote: cleanNote.trim(),
        };
    }

    // Legacy support for Sequence.[ID]
    const legacyMatch = note.match(/^(\d+)\.\[([A-Z0-9]+)\]\s*(.*)$/);
    if (legacyMatch) {
        const [, sequence, groupId, cleanNote] = legacyMatch;
        return {
            isRefund: true,
            groupId,
            sequence: parseInt(sequence, 10),
            cleanNote: cleanNote.trim(),
        };
    }

    return { isRefund: false, groupId: null, sequence: null, cleanNote: note };
}
