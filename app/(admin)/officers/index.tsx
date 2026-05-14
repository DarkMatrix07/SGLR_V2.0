import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { capitalize, colors } from '../../../lib/theme';

type OfficerRow = {
    id: string;
    phone: string;
    name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
};

export default function OfficersList() {
    const [items, setItems] = useState<OfficerRow[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    async function fetchData() {
        const { data } = await supabase.from('officers').select('*').order('role').order('name');
        if (data) setItems(data as any);
        setLoading(false);
        setRefreshing(false);
    }

    async function onRefresh() { setRefreshing(true); await fetchData(); }

    const filtered = items.filter(o => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (o.name?.toLowerCase().includes(s) ?? false)
            || o.phone.includes(s)
            || o.role.includes(s);
    });

    if (loading) return <Spinner />;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TextInput
                    style={styles.search}
                    placeholder="Search officers..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={colors.textMuted}
                />
                <Link href="/(admin)/officers/new" asChild>
                    <Pressable style={styles.addBtn} android_ripple={{ color: colors.primaryTint }}>
                        <Text style={styles.addBtnText}>+ New</Text>
                    </Pressable>
                </Link>
            </View>
            <FlatList
                data={filtered}
                keyExtractor={o => o.id}
                contentContainerStyle={filtered.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                ListEmptyComponent={<Text style={styles.empty}>{search ? 'No officers match your search.' : 'No officers yet.'}</Text>}
                renderItem={({ item }) => (
                    <Pressable
                        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                        android_ripple={{ color: colors.primaryLight }}
                        onPress={() => router.push(`/(admin)/officers/${item.id}` as never)}
                    >
                        <View style={styles.cardLeft}>
                            <Text style={styles.name}>{item.name ?? '(unnamed)'}</Text>
                            <Text style={styles.phone}>{item.phone}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : item.role === 'district' ? styles.districtBadge : styles.divisionalBadge]}>
                                {capitalize(item.role)}
                            </Text>
                            {!item.is_active && <Text style={styles.inactive}>Inactive</Text>}
                        </View>
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
    cardLeft: { flex: 1 },
    name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    phone: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    roleBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
    divisionalBadge: { backgroundColor: colors.primaryLight, color: colors.primaryDark },
    districtBadge: { backgroundColor: colors.successTint, color: colors.success },
    adminBadge: { backgroundColor: colors.warning + '30', color: colors.warning },
    inactive: { fontSize: 11, color: colors.danger, marginTop: 4, fontStyle: 'italic' },
});
