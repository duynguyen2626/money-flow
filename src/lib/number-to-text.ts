export function readMoney(amount: number): string {
    if (amount === 0) return 'không đồng';

    const units = ['', 'ngàn', 'triệu', 'tỷ', 'ngàn tỷ', 'triệu tỷ'];
    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

    let s = Math.abs(amount).toString();
    const groups = [];
    while (s.length > 0) {
        groups.push(s.slice(-3));
        s = s.slice(0, -3);
    }

    let result = '';
    for (let i = 0; i < groups.length; i++) {
        const group = parseInt(groups[i]);
        if (group === 0 && i < groups.length - 1) continue; // Skip empty groups unless it's the last one (handled by amount===0 check)

        // Simple reading for now, can be enhanced for "lẻ", "mốt", "lăm"
        // For the UI requirement "22 ngàn 3 trăm...", we want a concise format.
        // Let's try to format it nicely.

        if (group > 0) {
            result = `${group} ${units[i]} ` + result;
        }
    }

    return result.trim();
}

export function formatVietnameseCurrencyText(amount: number): { value: string; unit: string }[] {
    if (!amount || isNaN(amount)) return [];

    const str = Math.abs(amount).toString();
    const len = str.length;
    const parts: { value: string; unit: string }[] = [];

    // Basic logic to split into billions, millions, thousands
    // 123456789 -> 123 triệu 456 ngàn 789

    let remaining = Math.abs(amount);

    const billions = Math.floor(remaining / 1_000_000_000);
    remaining %= 1_000_000_000;

    const millions = Math.floor(remaining / 1_000_000);
    remaining %= 1_000_000;

    const thousands = Math.floor(remaining / 1_000);
    remaining %= 1_000;

    const units = remaining;

    if (billions > 0) parts.push({ value: billions.toString(), unit: 'tỷ' });
    if (millions > 0) parts.push({ value: millions.toString(), unit: 'triệu' });
    if (thousands > 0) parts.push({ value: thousands.toString(), unit: 'ngàn' });
    if (units > 0) parts.push({ value: units.toString(), unit: 'đồng' });

    return parts;
}
