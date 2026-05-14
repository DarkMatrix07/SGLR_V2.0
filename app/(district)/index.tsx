import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

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
    const router = useRouter();

    useFocusEffect(useCallback(() => { fetchData(); }, []));

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
        if (score >= 130) return '#2ECC71';
        if (score >= 90) return '#F4A423';
        if (score >= 50) return '#FF6B35';
        return '#E63946';
    }

    const filtered = inspections
        .filter(i => i.status === tab)
        .filter(i => {
            if (!search) return true;
            const s = search.toLowerCase();
            return i.resort?.name?.toLowerCase().includes(s) || i.resort?.area?.toLowerCase().includes(s);
        });

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#0D9DA8" /></View>;
    }

    return (
        <View style={styles.container}>
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9DA8']} tintColor="#0D9DA8" />}
                ListEmptyComponent={<Text style={styles.empty}>No {tab} inspections</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
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
                                    {'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)} {getStarLabel(item.stars)}
                                </Text>
                            </View>
                            <Text style={styles.date}>
                                {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF4F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF4F5' },
    tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E0E8EA' },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabActive: { borderBottomWidth: 3, borderBottomColor: '#0D9DA8' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#8A9BAE' },
    tabTextActive: { color: '#0D7377' },
    search: { margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E8EA' },
    empty: { textAlign: 'center', color: '#8A9BAE', marginTop: 40, fontSize: 15 },
    card: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0E8EA' },
    cardTop: { marginBottom: 10 },
    resortName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
    area: { fontSize: 13, color: '#8A9BAE', marginTop: 2 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    score: { fontSize: 18, fontWeight: '700' },
    starRow: { fontSize: 13, color: '#F4A423', marginTop: 2 },
    date: { fontSize: 12, color: '#8A9BAE' },
});