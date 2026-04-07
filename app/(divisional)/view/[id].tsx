import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { generateAndSharePDF } from '../../../utils/generatePDF';

type ChecklistItem = {
    id: string;
    category: string;
    label: string;
    input_type: string;
    max_marks: number;
    options: any[] | null;
    visibility_condition: any | null;
};

const CATEGORY_LABELS: Record<string, string> = {
    A: 'A. Faecal Sludge Management',
    B: 'B. Solid Waste Management',
    C: 'C. Grey Water Management',
};

const NEGATIVE_LABELS: Record<string, string> = {
    single_pit: 'Single-pit toilet',
    septic_tank: 'Septic tank',
    offsite_stp: 'Off-site STP via sewer',
    onsite_stp: 'On-site decentralised STP',
};

export default function ViewInspection() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [resort, setResort] = useState<any>(null);
    const [inspection, setInspection] = useState<any>(null);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        const [resortRes, itemsRes, inspRes] = await Promise.all([
            supabase.from('resorts').select('*').eq('id', id).single(),
            supabase.from('checklist_items').select('*').order('sort_order'),
            supabase.from('inspections').select('*').eq('resort_id', id).order('created_at', { ascending: false }).limit(1).single(),
        ]);
        if (resortRes.data) setResort(resortRes.data);
        if (itemsRes.data) setItems(itemsRes.data);
        if (inspRes.data) setInspection(inspRes.data);
        setLoading(false);
    }

    function getAnswerText(item: ChecklistItem) {
        const r = inspection?.responses?.[item.id];
        if (!r) return 'Not answered';
        if (item.input_type === 'yes_no') {
            if (r.answer === 'yes') return `Yes (${r.marks})`;
            if (r.answer === 'no') return 'No (0)';
            if (r.answer === 'manual') return `Manual: ${r.marks}`;
        }
        if (item.input_type === 'single_select') {
            const opt = item.options?.[r.selected];
            return opt ? `${opt.label} (${r.marks})` : 'Not answered';
        }
        if (item.input_type === 'negative_select') {
            return `${NEGATIVE_LABELS[r.selected] || r.selected} (${r.marks})`;
        }
        if (item.input_type === 'numerical') {
            return `${r.score} / ${item.max_marks}`;
        }
        return 'Not answered';
    }

    function isVisible(item: ChecklistItem) {
        if (!item.visibility_condition) return true;
        const { dependsOn, showWhen } = item.visibility_condition;
        const parent = inspection?.responses?.[dependsOn];
        if (!parent) return false;
        return parent.selected === showWhen;
    }

    function getStatusColor(status: string) {
        if (status === 'approved') return '#2ECC71';
        if (status === 'pending') return '#F4A423';
        if (status === 'rejected') return '#E63946';
        return '#8A9BAE';
    }

    function getStarLabel(stars: number) {
        if (stars === 5) return 'Excellent';
        if (stars === 4) return 'Good';
        if (stars === 3) return 'Average';
        if (stars === 2) return 'Below Average';
        return 'Poor';
    }

    if (loading || !resort) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#0D9DA8" /></View>;
    }

    if (!inspection) {
        return <View style={styles.center}><Text style={{ color: '#8A9BAE', fontSize: 16 }}>No inspection found</Text></View>;
    }

    const categories = ['A', 'B', 'C'];

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#EEF4F5' }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.resortHeader}>
                <Text style={styles.resortName}>{resort.serial_no}. {resort.name}</Text>
                <Text style={styles.resortArea}>{resort.area}</Text>
            </View>

            <View style={styles.statusBar}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inspection.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(inspection.status) }]}>
                        {inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1)}
                    </Text>
                </View>
                {inspection.district_comments && (
                    <Text style={styles.comments}>District: {inspection.district_comments}</Text>
                )}
            </View>

            <View style={styles.scoreCard}>
                <Text style={styles.scoreValue}>{inspection.total_score} / 200</Text>
                <Text style={styles.starsText}>{'★'.repeat(inspection.stars)}{'☆'.repeat(5 - inspection.stars)}</Text>
                <Text style={styles.performanceLabel}>{getStarLabel(inspection.stars)}</Text>
            </View>

            {categories.map(cat => {
                const catItems = items.filter(i => i.category === cat && isVisible(i));
                if (catItems.length === 0) return null;
                const catScore = catItems.reduce((sum, i) => sum + (inspection.responses?.[i.id]?.marks || 0), 0);
                return (
                    <View key={cat}>
                        <View style={styles.catHeader}>
                            <Text style={styles.catTitle}>{CATEGORY_LABELS[cat]}</Text>
                            <Text style={styles.catScore}>{catScore}</Text>
                        </View>
                        {catItems.map(item => {
                            const r = inspection.responses?.[item.id];
                            return (
                                <View key={item.id} style={styles.itemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemLabel}>{item.id.toUpperCase()}. {item.label}</Text>
                                        <Text style={styles.itemAnswer}>{getAnswerText(item)}</Text>
                                    </View>
                                    <Text style={[styles.itemMarks, (r?.marks || 0) < 0 && { color: '#E63946' }]}>
                                        {r?.marks ?? 0}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                );
            })}

            <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => generateAndSharePDF(resort, inspection, items)}
            >
                <Text style={styles.downloadBtnText}>Download PDF</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF4F5' },
    resortHeader: { backgroundColor: '#0D7377', padding: 16 },
    resortName: { fontSize: 18, fontWeight: '700', color: '#fff' },
    resortArea: { fontSize: 13, color: '#ffffffbb', marginTop: 2 },
    statusBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
    statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
    statusText: { fontSize: 13, fontWeight: '700' },
    comments: { fontSize: 13, color: '#8A9BAE', flex: 1 },
    scoreCard: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E0E8EA' },
    scoreValue: { fontSize: 32, fontWeight: '700', color: '#0D7377' },
    starsText: { fontSize: 22, color: '#F4A423', marginTop: 6 },
    performanceLabel: { fontSize: 15, fontWeight: '600', color: '#0D7377', marginTop: 4 },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D5EFEF', padding: 12, marginTop: 8 },
    catTitle: { fontSize: 14, fontWeight: '700', color: '#0D7377', flex: 1 },
    catScore: { fontSize: 16, fontWeight: '700', color: '#0D7377' },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 1, padding: 12 },
    itemLabel: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
    itemAnswer: { fontSize: 12, color: '#8A9BAE', marginTop: 2 },
    itemMarks: { fontSize: 16, fontWeight: '700', color: '#0D7377', marginLeft: 12, minWidth: 30, textAlign: 'right' },
    downloadBtn: { marginHorizontal: 12, marginTop: 24, backgroundColor: '#0D9DA8', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, elevation: 6, alignItems: 'center' },
    downloadBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});