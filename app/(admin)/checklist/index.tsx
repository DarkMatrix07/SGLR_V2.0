import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { CATEGORIES, CATEGORY_LABELS_FULL, ChecklistItem, SUB_LABELS, SUBCATEGORIES } from '../../../lib/checklist';
import { colors } from '../../../lib/theme';

export default function ChecklistList() {
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useFocusEffect(useCallback(() => { fetch(); }, []));

    async function fetch() {
        const { data } = await supabase.from('checklist_items').select('*').order('sort_order');
        if (data) setItems(data as any);
        setLoading(false);
        setRefreshing(false);
    }
    async function onRefresh() { setRefreshing(true); await fetch(); }

    if (loading) return <Spinner />;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            contentContainerStyle={{ paddingBottom: 80 }}
        >
            <View style={styles.toolbar}>
                <Text style={styles.totalText}>{items.length} items</Text>
                <Link href="/(admin)/checklist/new" asChild>
                    <Pressable style={styles.addBtn}>
                        <Text style={styles.addBtnText}>+ New Item</Text>
                    </Pressable>
                </Link>
            </View>

            {CATEGORIES.map(cat => {
                const catItems = items.filter(i => i.category === cat);
                if (catItems.length === 0) return null;
                const total = catItems.reduce((s, i) => s + (i.max_marks || 0), 0);
                return (
                    <View key={cat}>
                        <Text style={styles.catHeader}>{CATEGORY_LABELS_FULL[cat]} ({total} pts configured)</Text>
                        {SUBCATEGORIES.map(sub => {
                            const subItems = catItems.filter(i => i.subcategory === sub);
                            if (subItems.length === 0) return null;
                            return (
                                <View key={`${cat}-${sub}`}>
                                    <Text style={styles.subHeader}>{SUB_LABELS[sub]}</Text>
                                    {subItems.map(item => (
                                        <Pressable
                                            key={item.id}
                                            style={({ pressed }) => [styles.itemRow, pressed && { opacity: 0.85 }, !!item.visibility_condition && styles.conditional]}
                                            android_ripple={{ color: colors.primaryLight }}
                                            onPress={() => router.push(`/(admin)/checklist/${item.id}` as never)}
                                        >
                                            <View style={styles.itemId}>
                                                <Text style={styles.itemIdText}>{item.id}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itemLabel} numberOfLines={2}>{item.label}</Text>
                                                <Text style={styles.itemMeta}>{item.input_type} • {item.min_marks} to {item.max_marks} pts</Text>
                                            </View>
                                        </Pressable>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
    totalText: { fontSize: 13, color: colors.textMuted },
    addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    addBtnText: { color: '#fff', fontWeight: '700' },
    catHeader: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, backgroundColor: colors.primaryLight, padding: 12, marginTop: 6 },
    subHeader: { fontSize: 12, fontWeight: '600', color: colors.textMuted, paddingHorizontal: 16, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: 12, marginBottom: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    conditional: { marginLeft: 28, borderLeftWidth: 3, borderLeftColor: colors.primary },
    itemId: { backgroundColor: colors.primaryTintLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
    itemIdText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    itemLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    itemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
