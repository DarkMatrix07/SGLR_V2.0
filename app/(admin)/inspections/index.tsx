import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { capitalize, colors, formatDate, formatStars } from '../../../lib/theme';

type TabKey = 'all' | 'pending' | 'approved' | 'rejected';
const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
];

type Row = {
    id: string;
    status: string;
    total_score: number;
    stars: number;
    created_at: string;
    resort: { name: string; serial_no: number; area: string } | null;
    officer: { name: string | null; phone: string } | null;
};

export default function AdminInspections() {
    const router = useRouter();
    const [items, setItems] = useState<Row[]>([]);
    const [tab, setTab] = useState<TabKey>('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    async function fetchData() {
        const { data } = await supabase
            .from('inspections')
            .select('id, status, total_score, stars, created_at, resort:resorts(name, serial_no, area), officer:officers!inspections_officer_id_fkey(name, phone)')
            .order('created_at', { ascending: false });
        if (data) setItems(data as any);
        setLoading(false);
        setRefreshing(false);
    }
    async function onRefresh() { setRefreshing(true); await fetchData(); }

    const filtered = items
        .filter(i => tab === 'all' || i.status === tab)
        .filter(i => {
            if (!search) return true;
            const s = search.toLowerCase();
            return i.resort?.name?.toLowerCase().includes(s)
                || i.resort?.area?.toLowerCase().includes(s)
                || i.officer?.name?.toLowerCase().includes(s);
        });

    if (loading) return <Spinner />;

    return (
        <View style={styles.container}>
            <View style={styles.tabRow}>
                {TABS.map(t => {
                    const count = items.reduce((n, i) => n + ((t.key === 'all' || i.status === t.key) ? 1 : 0), 0);
                    const active = tab === t.key;
                    return (
                        <Pressable key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.key)}>
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label} ({count})</Text>
                        </Pressable>
                    );
                })}
            </View>

            <TextInput
                style={styles.search}
                placeholder="Search by resort, area, or officer..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={colors.textMuted}
            />

            <FlatList
                data={filtered}
                keyExtractor={i => i.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                ListEmptyComponent={<Text style={styles.empty}>No inspections.</Text>}
                renderItem={({ item }) => (
                    <Pressable
                        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                        android_ripple={{ color: colors.primaryLight }}
                        onPress={() => router.push({ pathname: '/(district)/detail/[id]', params: { id: item.id } } as never)}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{item.resort?.serial_no}. {item.resort?.name ?? 'Unknown resort'}</Text>
                            <Text style={styles.subtitle}>
                                {item.resort?.area} • {item.officer?.name ?? item.officer?.phone ?? 'unknown officer'}
                            </Text>
                            <Text style={styles.subtitle}>{formatStars(item.stars)} {item.total_score}/200 • {formatDate(item.created_at)}</Text>
                        </View>
                        <View style={[styles.statusBadge, badgeStyle(item.status)]}>
                            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{capitalize(item.status)}</Text>
                        </View>
                    </Pressable>
                )}
            />
        </View>
    );
}

function statusColor(s: string) {
    if (s === 'approved') return colors.success;
    if (s === 'pending') return colors.warning;
    if (s === 'rejected') return colors.danger;
    return colors.textMuted;
}
function badgeStyle(s: string) { return { backgroundColor: statusColor(s) + '20' }; }

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    tabRow: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
    tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: colors.primaryDark },
    search: { margin: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    empty: { textAlign: 'center', color: colors.textMuted, fontSize: 14, padding: 24 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },
});
