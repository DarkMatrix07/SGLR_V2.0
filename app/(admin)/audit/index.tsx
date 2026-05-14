import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { colors, formatDateTime } from '../../../lib/theme';

type AuditRow = {
    id: string;
    actor_name: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: any;
    created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
    create_officer: 'Created officer',
    update_officer: 'Updated officer',
    deactivate_officer: 'Deactivated officer',
    reset_pin: 'Reset PIN for officer',
    create_resort: 'Created resort',
    update_resort: 'Updated resort',
    deactivate_resort: 'Deactivated resort',
    create_checklist_item: 'Created checklist item',
    update_checklist_item: 'Updated checklist item',
    delete_checklist_item: 'Deleted checklist item',
    update_settings: 'Updated settings',
    approve_inspection: 'Approved inspection',
    reject_inspection: 'Rejected inspection',
    unfreeze_inspection: 'Unfroze inspection',
};

export default function AuditLog() {
    const [items, setItems] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(useCallback(() => { fetch(); }, []));

    async function fetch() {
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
        if (data) setItems(data as any);
        setLoading(false);
        setRefreshing(false);
    }
    async function onRefresh() { setRefreshing(true); await fetch(); }

    if (loading) return <Spinner />;

    return (
        <FlatList
            style={{ backgroundColor: colors.bg }}
            data={items}
            keyExtractor={r => r.id}
            contentContainerStyle={items.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingVertical: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            ListEmptyComponent={<Text style={styles.empty}>No actions recorded yet.</Text>}
            renderItem={({ item }) => {
                const summary = describe(item);
                return (
                    <View style={styles.row}>
                        <Text style={styles.action}>{ACTION_LABELS[item.action] ?? item.action}</Text>
                        {summary ? <Text style={styles.detail}>{summary}</Text> : null}
                        <Text style={styles.meta}>{item.actor_name ?? 'unknown'} • {formatDateTime(item.created_at)}</Text>
                    </View>
                );
            }}
        />
    );
}

function describe(row: AuditRow): string {
    const d = row.details;
    if (!d) return '';
    if (row.entity_type === 'officer' && d.name) return `${d.name} (${d.phone ?? ''} • ${d.role ?? ''})`.trim();
    if (row.entity_type === 'resort' && d.name) return `${d.name}${d.serial_no ? ` (#${d.serial_no})` : ''}`;
    return '';
}

const styles = StyleSheet.create({
    empty: { textAlign: 'center', color: colors.textMuted, fontSize: 14, padding: 24 },
    row: { backgroundColor: colors.surface, marginHorizontal: 12, marginBottom: 6, padding: 12, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: colors.primary },
    action: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    detail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    meta: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
});
