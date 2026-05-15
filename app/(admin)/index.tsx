import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppSession, getSession } from '../../lib/authRouting';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

type Counts = {
    officers: number;
    resorts: number;
    inspections: { pending: number; approved: number; rejected: number };
    checklistItems: number;
};

const CARDS: { href: string; title: string; subtitle: string; icon: string }[] = [
    { href: '/(admin)/officers', title: 'Officers', subtitle: 'Manage divisional, district & admin users', icon: '👤' },
    { href: '/(admin)/resorts', title: 'Resorts', subtitle: 'Manage the resort master list', icon: '🏨' },
    { href: '/(admin)/checklist', title: 'Checklist', subtitle: 'Edit the SGLR scoring rubric', icon: '📋' },
    { href: '/(admin)/inspections', title: 'All Inspections', subtitle: 'Search & export submissions', icon: '🗂️' },
    { href: '/(admin)/audit', title: 'Audit Log', subtitle: 'Recent admin & review actions', icon: '🕓' },
    { href: '/(admin)/reports', title: 'Reports', subtitle: 'Analytics & CSV export', icon: '📈' },
    { href: '/(admin)/settings', title: 'Settings', subtitle: 'Star thresholds & app config', icon: '⚙️' },
];

export default function AdminHome() {
    const router = useRouter();
    const [session, setSession] = useState<AppSession | null>(null);
    const [counts, setCounts] = useState<Counts | null>(null);

    useFocusEffect(useCallback(() => {
        getSession().then(setSession);
        fetchCounts();
    }, []));

    async function fetchCounts() {
        const [officersRes, resortsRes, inspsRes, checklistRes] = await Promise.all([
            supabase.from('officers').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('resorts').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('inspections').select('status'),
            supabase.from('checklist_items').select('id', { count: 'exact', head: true }),
        ]);
        const insps = inspsRes.data ?? [];
        setCounts({
            officers: officersRes.count ?? 0,
            resorts: resortsRes.count ?? 0,
            inspections: {
                pending: insps.filter(i => i.status === 'pending').length,
                approved: insps.filter(i => i.status === 'approved').length,
                rejected: insps.filter(i => i.status === 'rejected').length,
            },
            checklistItems: checklistRes.count ?? 0,
        });
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {session && (
                <Text style={styles.sessionMeta}>Logged in as {session.name ?? session.phone} • Admin</Text>
            )}

            {counts && (
                <View style={styles.statsRow}>
                    <Stat label="Officers" value={counts.officers} />
                    <Stat label="Resorts" value={counts.resorts} />
                    <Stat label="Items" value={counts.checklistItems} />
                </View>
            )}

            {counts && (
                <View style={styles.statsRow}>
                    <Stat label="Pending" value={counts.inspections.pending} color={colors.warning} />
                    <Stat label="Approved" value={counts.inspections.approved} color={colors.success} />
                    <Stat label="Rejected" value={counts.inspections.rejected} color={colors.danger} />
                </View>
            )}

            <View style={styles.cardsContainer}>
                {CARDS.map(c => (
                    <Pressable
                        key={c.href}
                        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                        android_ripple={{ color: colors.primaryLight }}
                        onPress={() => router.push(c.href as never)}
                    >
                        <Text style={styles.cardIcon}>{c.icon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{c.title}</Text>
                            <Text style={styles.cardSubtitle}>{c.subtitle}</Text>
                        </View>
                        <Text style={styles.cardChevron}>›</Text>
                    </Pressable>
                ))}
            </View>
        </ScrollView>
    );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <View style={styles.stat}>
            <Text style={[styles.statValue, color && { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    sessionMeta: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 14, paddingTop: 10 },
    statsRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 8, gap: 8 },
    stat: { flex: 1, backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '700', color: colors.primaryDark },
    statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    cardsContainer: { marginTop: 12 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    cardIcon: { fontSize: 26, marginRight: 14 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    cardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    cardChevron: { fontSize: 28, color: colors.primary, marginLeft: 8 },
});
