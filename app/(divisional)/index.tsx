import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppSession, getSession } from '../../lib/authRouting';
import Spinner from '../../components/Spinner';
import { capitalize, colors, formatStars } from '../../lib/theme';

type Resort = {
    id: string;
    serial_no: number;
    name: string;
    area: string;
    owner_name: string | null;
    owner_phone: string | null;
    room_count: number | null;
};

type Inspection = {
    id: string;
    resort_id: string;
    status: string;
    total_score: number;
    stars: number;
};

export default function ResortList() {
    const [resorts, setResorts] = useState<Resort[]>([]);
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [session, setSession] = useState<AppSession | null>(null);
    const router = useRouter();

    useFocusEffect(useCallback(() => { getSession().then(setSession); }, []));

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    // Live updates: refetch whenever any inspection changes (so approve/reject by district shows up immediately)
    useEffect(() => {
        const channel = supabase
            .channel('divisional-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => {
                fetchData();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    async function fetchData() {
        const [resortRes, inspRes] = await Promise.all([
            supabase.from('resorts').select('*').eq('is_active', true).order('serial_no'),
            supabase.from('inspections').select('id, resort_id, status, total_score, stars').order('created_at', { ascending: false }),
        ]);
        if (resortRes.data) setResorts(resortRes.data);
        if (inspRes.data) setInspections(inspRes.data);
        setLoading(false);
        setRefreshing(false);
    }

    async function onRefresh() {
        setRefreshing(true);
        await fetchData();
    }

    function getLatestInspection(resortId: string) {
        return inspections.find(i => i.resort_id === resortId);
    }

    function getStatusLabel(status: string) {
        if (status === 'rejected') return 'Recheck';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    function getStatusColor(status: string) {
        if (status === 'approved') return colors.success;
        if (status === 'pending') return colors.warning;
        if (status === 'rejected') return colors.danger;
        return colors.textMuted;
    }

    function handlePress(resort: Resort) {
        const inspection = getLatestInspection(resort.id);
        if (!inspection || inspection.status === 'rejected') {
            router.push(`/(divisional)/inspect/${resort.id}`);
        } else {
            router.push(`/(divisional)/view/${resort.id}`);
        }
    }

    const filtered = resorts.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.area.toLowerCase().includes(search.toLowerCase()) ||
        (r.owner_name && r.owner_name.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) return <Spinner />;

    return (
        <View style={styles.container}>
            {session && (
                <Text style={styles.sessionMeta}>
                    Logged in as {session.name ?? session.phone} • {capitalize(session.role)}
                </Text>
            )}
            <TextInput
                style={styles.search}
                placeholder="Search resorts..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#8A9BAE"
            />
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RESORTS</Text>
                <View style={styles.sectionLine} />
            </View>
            <FlatList
                data={filtered}
                keyExtractor={r => r.id}
                contentContainerStyle={filtered.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor="#0D9DA8" />}
                ListEmptyComponent={
                    <Text style={styles.empty}>
                        {search ? 'No resorts match your search.' : 'No resorts available. Pull down to refresh.'}
                    </Text>
                }
                renderItem={({ item: resort }) => {
                    const inspection = getLatestInspection(resort.id);
                    return (
                        <Pressable
                            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                            android_ripple={{ color: colors.primaryLight }}
                            onPress={() => handlePress(resort)}
                        >
                            <View style={styles.numberCircle}>
                                <Text style={styles.numberText}>{resort.serial_no}</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.resortName}>{resort.name}</Text>
                                    {inspection ? (
                                        <Text style={[styles.statusText, { color: getStatusColor(inspection.status) }]}>
                                            • {getStatusLabel(inspection.status)}
                                        </Text>
                                    ) : (
                                        <Text style={styles.unratedText}>• Unrated</Text>
                                    )}
                                </View>
                                <Text style={styles.detail}>{resort.area}</Text>
                                {resort.owner_name && (
                                    <Text style={styles.detail}>{resort.owner_name} • {resort.owner_phone}</Text>
                                )}
                                {(inspection?.stars ?? 0) > 0 && (
                                    <Text style={styles.stars}>{formatStars(inspection?.stars || 0)} ({inspection?.total_score} pts)</Text>
                                )}
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </Pressable>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    search: { margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    sessionMeta: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 14, paddingTop: 10 },
    empty: { textAlign: 'center', color: colors.textMuted, fontSize: 14, padding: 24 },
    sectionHeader: { marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, letterSpacing: 1, marginBottom: 6 },
    sectionLine: { height: 2, backgroundColor: colors.primary },
    card: {
        backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 12,
        padding: 14, borderWidth: 1, borderColor: colors.border,
        flexDirection: 'row', alignItems: 'center',
        overflow: 'hidden',
    },
    numberCircle: {
        width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary,
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    numberText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
    cardContent: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
    resortName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginRight: 6 },
    unratedText: { fontSize: 13, fontStyle: 'italic', color: colors.textMuted },
    statusText: { fontSize: 13, fontStyle: 'italic', fontWeight: '600' },
    detail: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    stars: { fontSize: 13, color: colors.warning, marginTop: 4 },
    chevron: { fontSize: 28, color: colors.primary, marginLeft: 8 },
});