import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';
import { Resort } from '../../../lib/types';

export default function ResortsList() {
    const [items, setItems] = useState<Resort[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    async function fetchData() {
        const { data } = await supabase.from('resorts').select('*').order('serial_no');
        if (data) setItems(data as any);
        setLoading(false);
        setRefreshing(false);
    }
    async function onRefresh() { setRefreshing(true); await fetchData(); }

    const filtered = items.filter(r => {
        if (!search) return true;
        const s = search.toLowerCase();
        return r.name.toLowerCase().includes(s) || r.area.toLowerCase().includes(s) || String(r.serial_no).includes(s);
    });

    if (loading) return <Spinner />;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TextInput
                    style={styles.search}
                    placeholder="Search resorts..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={colors.textMuted}
                />
                <Link href="/(admin)/resorts/new" asChild>
                    <Pressable style={styles.addBtn}>
                        <Text style={styles.addBtnText}>+ New</Text>
                    </Pressable>
                </Link>
            </View>
            <FlatList
                data={filtered}
                keyExtractor={r => r.id}
                contentContainerStyle={filtered.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                ListEmptyComponent={<Text style={styles.empty}>{search ? 'No resorts match.' : 'No resorts yet.'}</Text>}
                renderItem={({ item }) => (
                    <Pressable
                        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                        android_ripple={{ color: colors.primaryLight }}
                        onPress={() => router.push(`/(admin)/resorts/${item.id}` as never)}
                    >
                        <View style={styles.numberCircle}>
                            <Text style={styles.numberText}>{item.serial_no}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.subtitle}>{item.area} {item.room_count ? `• ${item.room_count} rooms` : ''}</Text>
                            {item.owner_name && <Text style={styles.subtitle}>{item.owner_name} {item.owner_phone ? `• ${item.owner_phone}` : ''}</Text>}
                        </View>
                        {!item.is_active && <Text style={styles.inactive}>Inactive</Text>}
                    </Pressable>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    headerRow: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center' },
    search: { flex: 1, padding: 12, backgroundColor: colors.surface, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
    addBtnText: { color: '#fff', fontWeight: '700' },
    empty: { textAlign: 'center', color: colors.textMuted, fontSize: 14, padding: 24 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    numberCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    numberText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
    name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    inactive: { fontSize: 11, color: colors.danger, fontStyle: 'italic' },
});
