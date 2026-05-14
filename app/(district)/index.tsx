import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppSession, getSession } from '../../lib/authRouting';
import Spinner from '../../components/Spinner';
import { colors,  formatDate, formatStars } from '../../lib/theme';

type InspectionWithResort = {
    id: string;
    resort_id: string;
    status: string;
    total_score: number;
    stars: number;
    created_at: string;
    resort: {
        name: string;
        serial_no: number;
        area: string;
    };
};

type TabKey = 'pending' | 'approved' | 'rejected';
const TABS: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
];

export default function DistrictReview() {
    const [inspections, setInspections] = useState<InspectionWithResort[]>([]);
    const [tab, setTab] = useState<TabKey>('pending');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [session, setSession] = useState<AppSession | null>(null);
    const router = useRouter();

    useFocusEffect(useCallback(() => { fetchData(); }, []));
    useFocusEffect(useCallback(() => { getSession().then(setSession); }, []));

    async function fetchData() {
        const { data } = await supabase
            .from('inspections')
            .select('id, resort_id, status, total_score, stars, created_at, resort:resorts(name, serial_no, area)')
            .order('created_at', { ascending: false });
        if (data) setInspections(data as any);
        setLoading(false);
        setRefreshing(false);
    }

    async function onRefresh() {
        setRefreshing(true);
        await fetchData();
    }

    function getStarLabel(stars: number) {
        if (stars === 5) return 'Excellent';
        if (stars === 4) return 'Good';
        if (stars === 3) return 'Average';
        if (stars === 2) return 'Below Average';
        return 'Poor';
    }

    function getScoreColor(score: number) {
        if (score >= 130) return colors.success;
        if (score >= 90) return colors.warning;
        if (score >= 50) return colors.orange;
        return colors.danger;
    }

    const filtered = inspections
        .filter(i => i.status === tab)
        .filter(i => {
            if (!search) return true;
            const s = search.toLowerCase();
            return i.resort?.name?.toLowerCase().includes(s) || i.resort?.area?.toLowerCase().includes(s);
        });

    if (loading) return <Spinner />;

    return (
        <View style={styles.container}>
            {session && (
                <Text style={styles.sessionMeta}>
                    Logged in as {session.name ?? session.phone} • District
                </Text>
            )}
            <View style={styles.tabRow}>
                {TABS.map(t => {
                    const count = inspections.reduce((n, i) => n + (i.status === t.key ? 1 : 0), 0);
                    const active = tab === t.key;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.tab, active && styles.tabActive]}
                            onPress={() => setTab(t.key)}
                        >
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                {t.label} ({count})
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TextInput
                style={styles.search}
                placeholder="Search inspections..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#8A9BAE"
            />

            <FlatList
                data={filtered}
                keyExtractor={i => i.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor="#0D9DA8" />}
                ListEmptyComponent={<Text style={styles.empty}>No {tab} inspections</Text>}
                renderItem={({ item }) => (
                    <Pressable
                        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                        android_ripple={{ color: colors.primaryLight }}
                        onPress={() => router.push({ pathname: '/(district)/detail/[id]', params: { id: item.id } })}
                    >
                        <View style={styles.cardTop}>
                            <Text style={styles.resortName}>{item.resort?.serial_no}. {item.resort?.name}</Text>
                            <Text style={styles.area}>{item.resort?.area}</Text>
                        </View>
                        <View style={styles.cardBottom}>
                            <View>
                                <Text style={[styles.score, { color: getScoreColor(item.total_score) }]}>
                                    {item.total_score}/200
                                </Text>
                                <Text style={styles.starRow}>
                                    {formatStars(item.stars)} {getStarLabel(item.stars)}
                                </Text>
                            </View>
                            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                        </View>
                    </Pressable>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: colors.primaryDark },
    search: { margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
    sessionMeta: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
    card: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    cardTop: { marginBottom: 10 },
    resortName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    area: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    score: { fontSize: 18, fontWeight: '700' },
    starRow: { fontSize: 13, color: colors.warning, marginTop: 2 },
    date: { fontSize: 12, color: colors.textMuted },
});