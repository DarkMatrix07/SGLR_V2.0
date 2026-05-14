import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

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
    const router = useRouter();

    useFocusEffect(useCallback(() => { fetchData(); }, []));

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
        if (status === 'approved') return '#2ECC71';
        if (status === 'pending') return '#F4A423';
        if (status === 'rejected') return '#E63946';
        return '#8A9BAE';
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

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#0D9DA8" /></View>;
    }

    return (
        <View style={styles.container}>
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
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9DA8']} tintColor="#0D9DA8" />}
                renderItem={({ item: resort }) => {
                    const inspection = getLatestInspection(resort.id);
                    return (
                        <TouchableOpacity style={styles.card} onPress={() => handlePress(resort)}>
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
                                    <Text style={styles.stars}>{"★".repeat(inspection?.stars || 0)} ({inspection?.total_score} pts)</Text>
                                )}
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF4F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF4F5' },
    search: { margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E8EA' },
    sectionHeader: { marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0D7377', letterSpacing: 1, marginBottom: 6 },
    sectionLine: { height: 2, backgroundColor: '#0D9DA8' },
    card: {
        backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 12,
        padding: 14, borderWidth: 1, borderColor: '#E0E8EA',
        flexDirection: 'row', alignItems: 'center',
    },
    numberCircle: {
        width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#0D9DA8',
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    numberText: { fontSize: 16, fontWeight: '600', color: '#0D7377' },
    cardContent: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
    resortName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginRight: 6 },
    unratedText: { fontSize: 13, fontStyle: 'italic', color: '#8A9BAE' },
    statusText: { fontSize: 13, fontStyle: 'italic', fontWeight: '600' },
    detail: { fontSize: 13, color: '#8A9BAE', lineHeight: 18 },
    stars: { fontSize: 13, color: '#F4A423', marginTop: 4 },
    chevron: { fontSize: 28, color: '#0D9DA8', marginLeft: 8 },
});