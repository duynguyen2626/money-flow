/**
 * Utility functions for formatting cashback cycle tags into readable date ranges
 */

/**
 * Formats a cycle tag (e.g., "NOV25") into a readable date range (e.g., "25.10 - 24.11")
 * 
 * @param tag - Tag in format "MMMYY" (e.g., "NOV25", "DEC24")
 * @returns Formatted date range string or original tag if format not recognized
 * 
 * @example
 * formatCycleTag("NOV25") // Returns "25.10 - 24.11"
 * formatCycleTag("DEC25") // Returns "25.11 - 24.12"
 */
export function formatCycleTag(tag: string): string {
    if (!tag || tag.length < 5) return tag;

    // Extract month (first 3 letters) and year (last 2 digits)
    const monthAbbrev = tag.slice(0, 3).toUpperCase();
    const yearStr = tag.slice(-2);

    // Map month abbreviations to month numbers (1-indexed)
    const monthMap: Record<string, number> = {
        'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4,
        'MAY': 5, 'JUN': 6, 'JUL': 7, 'AUG': 8,
        'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
    };

    const monthNum = monthMap[monthAbbrev];
    if (!monthNum) return tag; // Unknown month, return original

    // Parse year (assume 20xx for years 00-99)
    const year = 2000 + parseInt(yearStr, 10);
    if (isNaN(year)) return tag;

    // Standard cycle: 25th of current month to 24th of next month
    const cycleStartDay = 25;
    const cycleEndDay = 24;

    // Calculate start date (25th of previous month)
    const startMonth = monthNum === 1 ? 12 : monthNum - 1;
    const startYear = monthNum === 1 ? year - 1 : year;

    // Calculate end date (24th of current month)
    const endMonth = monthNum;
    const endYear = year;

    // Format as "DD.MM"
    const formatDay = (day: number) => String(day).padStart(2, '0');
    const formatMonth = (month: number) => String(month).padStart(2, '0');

    return `${formatDay(cycleStartDay)}.${formatMonth(startMonth)} - ${formatDay(cycleEndDay)}.${formatMonth(endMonth)}`;
}

/**
 * Formats a cycle tag into a more detailed format with year
 * 
 * @param tag - Tag in format "MMMYY" (e.g., "NOV25")
 * @returns Formatted date range with year
 * 
 * @example
 * formatCycleTagWithYear("NOV25") // Returns "25.10.2024 - 24.11.2025"
 */
export function formatCycleTagWithYear(tag: string): string {
    if (!tag || tag.length < 5) return tag;

    const monthAbbrev = tag.slice(0, 3).toUpperCase();
    const yearStr = tag.slice(-2);

    const monthMap: Record<string, number> = {
        'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4,
        'MAY': 5, 'JUN': 6, 'JUL': 7, 'AUG': 8,
        'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
    };

    const monthNum = monthMap[monthAbbrev];
    if (!monthNum) return tag;

    const year = 2000 + parseInt(yearStr, 10);
    if (isNaN(year)) return tag;

    const cycleStartDay = 25;
    const cycleEndDay = 24;

    const startMonth = monthNum === 1 ? 12 : monthNum - 1;
    const startYear = monthNum === 1 ? year - 1 : year;

    const endMonth = monthNum;
    const endYear = year;

    const formatDay = (day: number) => String(day).padStart(2, '0');
    const formatMonth = (month: number) => String(month).padStart(2, '0');

    return `${formatDay(cycleStartDay)}.${formatMonth(startMonth)}.${startYear} - ${formatDay(cycleEndDay)}.${formatMonth(endMonth)}.${endYear}`;
}
