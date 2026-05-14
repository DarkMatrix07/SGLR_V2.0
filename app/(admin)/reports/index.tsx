import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { colors, formatDate } from '../../../lib/theme';
import { shareCsv, toCsv } from '../../../utils/export';

type Stats = {
    totalInspections: number;
    avgScore: number;
    starDistribution: number[];
    byArea: { area: string; count: number; avg: number }[];
    topOfficers: { name: string; count: number }[];
};

export default function AdminReports() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState<string | null>(null);

    useFocusEffect(useCallback(() => { fetchStats(); }, []));

    async function fetchStats() {
        const { data } = await supabase
            .from('inspections')
            .select('total_score, stars, status, resort:resorts(area), officer:officers!inspections_officer_id_fkey(name)')
            .eq('status', 'approved');
        const rows = (data ?? []) as any[];

        const total = rows.length;
        const avg = total > 0 ? rows.reduce((s, r) => s + (r.total_score || 0), 0) / total : 0;

        const stars = [0, 0, 0, 0, 0];
        rows.forEach(r => { if (r.stars >= 1 && r.stars <= 5) stars[r.stars - 1]++; });

        const areaMap = new Map<string, { count: number; sum: number }>();
        rows.forEach(r => {
            const area = r.resort?.area ?? 'Unknown';
            const m = areaMap.get(area) ?? { count: 0, sum: 0 };
            m.count++; m.sum += r.total_score || 0;
            areaMap.set(area, m);
        });
        const byArea = [...areaMap.entries()]
            .map(([area, m]) => ({ area, count: m.count, avg: Math.round(m.sum / m.count) }))
            .sort((a, b) => b.count - a.count);

        const officerMap = new Map<string, number>();
        rows.forEach(r => {
            const name = r.officer?.name ?? 'Unknown';
            officerMap.set(name, (officerMap.get(name) ?? 0) + 1);
        });
        const topOfficers = [...officerMap.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        setStats({
            totalInspections: total,
            avgScore: Math.round(avg),
            starDistribution: stars,
            byArea,
            topOfficers,
        });
        setLoading(false);
    }

    async function exportInspectionsCsv() {
        setExporting('inspections');
        try {
            const { data, error } = await supabase
                .from('inspections')
                .select('id, status, total_score, stars, created_at, reviewed_at, district_comments, resort:resorts(serial_no, name, area, owner_name, owner_phone, room_count), officer:officers!inspections_officer_id_fkey(name, phone)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            const rows = (data ?? []).map((r: any) => ({
                ref: r.id.slice(0, 8).toUpperCase(),
                resort_serial: r.resort?.serial_no,
                resort_name: r.resort?.name,
                area: r.resort?.area,
                owner: r.resort?.owner_name,
                owner_phone: r.resort?.owner_phone,
                rooms: r.resort?.room_count,
                officer: r.officer?.name,
                officer_phone: r.officer?.phone,
                total_score: r.total_score,
                stars: r.stars,
                status: r.status,
                submitted_at: r.created_at,
                reviewed_at: r.reviewed_at,
                district_comments: r.district_comments,
            }));
            await shareCsv(`sglr-inspections-${formatDate(new Date()).replace(/\s/g, '')}.csv`, toCsv(rows));
        } catch (e: any) {
            Alert.alert('Export failed', e?.message ?? 'Unknown error');
        } finally {
            setExporting(null);
        }
    }

    async function exportResortsCsv() {
        setExporting('resorts');
        try {
            const { data, error } = await supabase.from('resorts').select('*').order('serial_no');
            if (error) throw error;
            await shareCsv('sglr-resorts.csv', toCsv((data ?? []) as any));
        } catch (e: any) {
            Alert.alert('Export failed', e?.message ?? 'Unknown error');
        } finally {
            setExporting(null);
        }
    }

    async function exportOfficersCsv() {
        setExporting('officers');
        try {
            const { data, error } = await supabase.from('officers').select('id, phone, name, role, is_active, created_at').order('role');
            if (error) throw error;
            await shareCsv('sglr-officers.csv', toCsv((data ?? []) as any));
        } catch (e: any) {
            Alert.alert('Export failed', e?.message ?? 'Unknown error');
        } finally {
            setExporting(null);
        }
    }

    if (loading || !stats) return <Spinner />;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.section}>OVERVIEW</Text>
            <View style={styles.row}>
                <Stat label="Approved" value={stats.totalInspections} />
                <Stat label="Avg Score" value={`${stats.avgScore} / 200`} />
            </View>

            <Text style={styles.section}>STAR DISTRIBUTION</Text>
            <View style={styles.card}>
                {stats.starDistribution.map((c, i) => {
                    const maxCount = Math.max(1, ...stats.starDistribution);
                    const widthPct = (c / maxCount) * 100;
                    return (
                        <View key={i} style={styles.barRow}>
                            <Text style={styles.barLabel}>{'★'.repeat(i + 1)}</Text>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${widthPct}%` }]} />
                            </View>
                            <Text style={styles.barValue}>{c}</Text>
                        </View>
                    );
                })}
            </View>

            <Text style={styles.section}>BY AREA</Text>
            <View style={styles.card}>
                {stats.byArea.length === 0 ? <Text style={styles.empty}>No approved inspections yet.</Text> : stats.byArea.map(r => (
                    <View key={r.area} style={styles.kvRow}>
                        <Text style={styles.kvKey}>{r.area}</Text>
                        <Text style={styles.kvVal}>{r.count} • avg {r.avg}</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.section}>TOP OFFICERS</Text>
            <View style={styles.card}>
                {stats.topOfficers.length === 0 ? <Text style={styles.empty}>No data yet.</Text> : stats.topOfficers.map(o => (
                    <View key={o.name} style={styles.kvRow}>
                        <Text style={styles.kvKey}>{o.name}</Text>
                        <Text style={styles.kvVal}>{o.count} inspections</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.section}>EXPORT CSV</Text>
            <View style={{ marginHorizontal: 12, gap: 8, marginTop: 4 }}>
                <ExportBtn label="Export All Inspections" busy={exporting === 'inspections'} onPress={exportInspectionsCsv} />
                <ExportBtn label="Export All Resorts" busy={exporting === 'resorts'} onPress={exportResortsCsv} />
                <ExportBtn label="Export All Officers" busy={exporting === 'officers'} onPress={exportOfficersCsv} />
            </View>
        </ScrollView>
    );
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <View style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function ExportBtn({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
    return (
        <Pressable style={[styles.exportBtn, busy && { opacity: 0.5 }]} onPress={onPress} disabled={busy}>
            <Text style={styles.exportBtnText}>{busy ? 'Exporting...' : label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    section: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    row: { flexDirection: 'row', marginHorizontal: 12, gap: 8 },
    stat: { flex: 1, backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
    statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    card: { backgroundColor: colors.surface, marginHorizontal: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    empty: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
    barLabel: { width: 70, fontSize: 13, color: colors.warning },
    barBg: { flex: 1, height: 8, backgroundColor: colors.primaryTintLight, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: colors.primary },
    barValue: { width: 30, textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    kvKey: { fontSize: 13, color: colors.textPrimary },
    kvVal: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
    exportBtn: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
    exportBtnText: { color: '#fff', fontWeight: '700' },
});
