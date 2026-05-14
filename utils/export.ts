import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function escapeCsv(value: any): string {
    if (value == null) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

/**
 * Build a CSV from an array of objects. Columns are the keys of the first row.
 * Returns the CSV text.
 */
export function toCsv(rows: Record<string, any>[], columns?: string[]): string {
    if (rows.length === 0) return '';
    const cols = columns ?? Object.keys(rows[0]);
    const header = cols.map(escapeCsv).join(',');
    const lines = rows.map(r => cols.map(c => escapeCsv(r[c])).join(','));
    return [header, ...lines].join('\n');
}

/**
 * Write a CSV file to the OS share sheet. Returns nothing.
 */
export async function shareCsv(filename: string, csv: string) {
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!dir) throw new Error('No filesystem directory available');
    const uri = `${dir}${filename}`;
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: filename });
    }
}
