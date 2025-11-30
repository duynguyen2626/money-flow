/**
 * Helper function to render enhanced refund note with icons
 * Format: [ID refund][img shop]➡️[img bank] Notes
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

    // Match pattern: "3.[7C8A] Confirmed Refund"
    const refundMatch = note.match(/^(\d+)\.\[([A-Z0-9]+)\]\s*(.*)$/);

    if (refundMatch) {
        const [, sequence, groupId, cleanNote] = refundMatch;
        return {
            isRefund: true,
            groupId,
            sequence: parseInt(sequence, 10),
            cleanNote: cleanNote.trim(),
        };
    }

    return { isRefund: false, groupId: null, sequence: null, cleanNote: note };
}
