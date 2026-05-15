import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { logAudit } from '../../../lib/audit';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';

type ParsedRow = {
    line: number;
    serial_no: number;
    name: string;
    area: string;
    owner_name: string | null;
    owner_phone: string | null;
    room_count: number | null;
    valid: boolean;
    error?: string;
};

const SAMPLE = `serial_no,name,area,owner_name,owner_phone,room_count
37,K J RESORT,RAMAPURAM,K JALA REDDY,+919182066946,19
38,ARNA BEACH RESORT,RAMAPURAM,G.PRADEEP,+919666746756,10`;

export default function BulkImport() {
    const router = useRouter();
    const [text, setText] = useState('');
    const [committing, setCommitting] = useState(false);

    const rows = useMemo<ParsedRow[]>(() => {
        if (!text.trim()) return [];
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        const out: ParsedRow[] = [];

        // Skip header if present
        const startIdx = /^\s*serial[_ ]?no/i.test(lines[0] ?? '') ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
            const cells = splitCsvLine(lines[i]);
            const serial = parseInt(cells[0] ?? '');
            const name = (cells[1] ?? '').trim();
            const area = (cells[2] ?? '').trim();
            const owner = (cells[3] ?? '').trim();
            const phone = (cells[4] ?? '').trim();
            const rooms = (cells[5] ?? '').trim();

            let error: string | undefined;
            if (!Number.isFinite(serial) || serial < 1) error = 'invalid serial_no';
            else if (!name) error = 'missing name';
            else if (!area) error = 'missing area';

            out.push({
                line: i + 1,
                serial_no: Number.isFinite(serial) ? serial : 0,
                name,
                area,
                owner_name: owner || null,
                owner_phone: phone || null,
                room_count: rooms ? (parseInt(rooms) || null) : null,
                valid: !error,
                error,
            });
        }
        return out;
    }, [text]);

    const validRows = rows.filter(r => r.valid);
    const invalidRows = rows.filter(r => !r.valid);

    async function commit() {
        if (validRows.length === 0) { Alert.alert('Nothing to import', 'Paste at least one valid row.'); return; }

        Alert.alert(
            'Import resorts',
            `Insert ${validRows.length} resorts? ${invalidRows.length > 0 ? `(${invalidRows.length} invalid rows will be skipped.) ` : ''}Duplicate serial numbers will fail and the whole batch will roll back.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Import', onPress: async () => {
                        setCommitting(true);
                        const payload = validRows.map(r => ({
                            serial_no: r.serial_no,
                            name: r.name,
                            area: r.area,
                            owner_name: r.owner_name,
                            owner_phone: r.owner_phone,
                            room_count: r.room_count,
                            is_active: true,
                        }));
                        const { error, count } = await supabase.from('resorts').insert(payload, { count: 'exact' });
                        if (error) {
                            const friendly = error.code === '23505'
                                ? 'One of the serial numbers already exists. Use a different range or update the existing resort instead.'
                                : error.message;
                            Alert.alert('Import failed', friendly);
                            setCommitting(false);
                            return;
                        }
                        await logAudit('create_resort', 'resort', null, { bulk_count: count ?? validRows.length });
                        setCommitting(false);
                        Alert.alert('Imported', `Created ${count ?? validRows.length} resorts.`, [
                            { text: 'OK', onPress: () => router.back() },
                        ]);
                    },
                },
            ]
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={styles.label}>Paste CSV</Text>
            <Text style={styles.hint}>
                Columns (in order): <Text style={styles.mono}>serial_no, name, area, owner_name, owner_phone, room_count</Text>.
                Header row is optional. Fields with commas should be quoted.
            </Text>
            <TextInput
                style={styles.textarea}
                value={text}
                onChangeText={setText}
                placeholder={SAMPLE}
                placeholderTextColor={colors.textMuted}
                multiline
                autoCapitalize="characters"
                autoCorrect={false}
            />

            {rows.length > 0 && (
                <>
                    <Text style={styles.section}>
                        Preview — {validRows.length} valid, {invalidRows.length} invalid
                    </Text>
                    {invalidRows.length > 0 && (
                        <View style={styles.errorBox}>
                            {invalidRows.slice(0, 5).map(r => (
                                <Text key={r.line} style={styles.errorLine}>
                                    Line {r.line}: {r.error}
                                </Text>
                            ))}
                            {invalidRows.length > 5 && <Text style={styles.errorLine}>... and {invalidRows.length - 5} more.</Text>}
                        </View>
                    )}
                    <View style={styles.previewTable}>
                        {validRows.slice(0, 50).map(r => (
                            <View key={r.line} style={styles.previewRow}>
                                <Text style={styles.previewSn}>#{r.serial_no}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.previewName}>{r.name}</Text>
                                    <Text style={styles.previewMeta}>{r.area}{r.owner_name ? ` • ${r.owner_name}` : ''}{r.room_count != null ? ` • ${r.room_count} rooms` : ''}</Text>
                                </View>
                            </View>
                        ))}
                        {validRows.length > 50 && (
                            <Text style={styles.previewMeta}>... and {validRows.length - 50} more rows</Text>
                        )}
                    </View>
                </>
            )}

            <Pressable
                style={[styles.commitBtn, (committing || validRows.length === 0) && { opacity: 0.5 }]}
                onPress={commit}
                disabled={committing || validRows.length === 0}
            >
                <Text style={styles.commitBtnText}>{committing ? 'Importing…' : `Import ${validRows.length} resorts`}</Text>
            </Pressable>
        </ScrollView>
    );
}

// Minimal CSV line parser supporting quoted fields with commas
function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
            if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (c === '"') { inQ = false; }
            else cur += c;
        } else {
            if (c === ',') { out.push(cur); cur = ''; }
            else if (c === '"' && cur === '') { inQ = true; }
            else cur += c;
        }
    }
    out.push(cur);
    return out.map(s => s.trim());
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
    hint: { fontSize: 12, color: colors.textMuted, lineHeight: 16, marginBottom: 8 },
    mono: { fontFamily: 'monospace', color: colors.primaryDark },
    textarea: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 13, color: colors.textPrimary, minHeight: 140, textAlignVertical: 'top', fontFamily: 'monospace' },
    section: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginTop: 16, marginBottom: 8 },
    errorBox: { backgroundColor: colors.dangerTintLight, borderRadius: 10, padding: 10, marginBottom: 12 },
    errorLine: { color: colors.danger, fontSize: 12, fontFamily: 'monospace' },
    previewTable: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 8 },
    previewRow: { flexDirection: 'row', alignItems: 'center', padding: 6, borderBottomWidth: 1, borderColor: colors.border, gap: 8 },
    previewSn: { width: 44, fontSize: 13, fontWeight: '700', color: colors.primaryDark },
    previewName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    previewMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    commitBtn: { marginTop: 24, backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
    commitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
