import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Spinner from '../../../components/Spinner';
import { capitalize, formatDate, formatStars } from '../../../lib/theme';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { generatePostInspectionPDF } from '../../../utils/generatePDF';
import {
    CATEGORIES,
    CATEGORY_LABELS,
    ChecklistItem,
    getAnswerText,
    getStarLabel,
    getStatusColor,
    isVisible,
} from '../../../lib/checklist';

export default function ViewInspection() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [resort, setResort] = useState<any>(null);
    const [inspection, setInspection] = useState<any>(null);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => { fetchData(); }, [id]));

    async function fetchData() {
        const [resortRes, itemsRes, inspRes] = await Promise.all([
            supabase.from('resorts').select('*').eq('id', id).maybeSingle(),
            supabase.from('checklist_items').select('*').order('sort_order'),
            supabase.from('inspections').select('*, reviewer:officers!inspections_reviewed_by_fkey(name)').eq('resort_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (resortRes.data) setResort(resortRes.data);
        if (itemsRes.data) setItems(itemsRes.data);
        if (inspRes.data) setInspection(inspRes.data);
        setLoading(false);
    }

    if (loading) return <Spinner />;
    if (!resort) {
        return <View style={styles.errorScreen}><Text style={styles.errorText}>Failed to load resort data</Text></View>;
    }
    if (!inspection) {
        return <View style={styles.errorScreen}><Text style={styles.errorText}>No inspection found</Text></View>;
    }

    const responses = inspection.responses ?? {};

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#EEF4F5' }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.resortHeader}>
                <Text style={styles.resortName}>{resort.serial_no}. {resort.name}</Text>
                <Text style={styles.resortArea}>{resort.area}</Text>
            </View>

            <View style={styles.statusBar}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inspection.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(inspection.status) }]}>
                        {capitalize(inspection.status)}
                    </Text>
                </View>
                {inspection.district_comments && (
                    <Text style={styles.comments}>District: {inspection.district_comments}</Text>
                )}
                {inspection.reviewed_at && (
                    <Text style={styles.comments}>
                        Reviewed by {inspection.reviewer?.name ?? 'unknown'} • {formatDate(inspection.reviewed_at)}
                    </Text>
                )}
            </View>

            <View style={styles.scoreCard}>
                <Text style={styles.scoreValue}>{inspection.total_score} / 200</Text>
                <Text style={styles.starsText}>{formatStars(inspection.stars)}</Text>
                <Text style={styles.performanceLabel}>{getStarLabel(inspection.stars)}</Text>
            </View>

            {CATEGORIES.map(cat => {
                const catItems = items.filter(i => i.category === cat && isVisible(i, responses));
                if (catItems.length === 0) return null;
                const catScore = catItems.reduce((sum, i) => sum + (responses[i.id]?.marks || 0), 0);
                return (
                    <View key={cat}>
                        <View style={styles.catHeader}>
                            <Text style={styles.catTitle}>{CATEGORY_LABELS[cat]}</Text>
                            <Text style={styles.catScore}>{catScore}</Text>
                        </View>
                        {catItems.map(item => {
                            const r = responses[item.id];
                            return (
                                <View key={item.id} style={styles.itemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemLabel}>{item.id.toUpperCase()}. {item.label}</Text>
                                        <Text style={styles.itemAnswer}>{getAnswerText(item, r)}</Text>
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
                onPress={() => generatePostInspectionPDF(resort, inspection, items)}
            >
                <Text style={styles.downloadBtnText}>Download PDF</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    errorScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF4F5' },
    errorText: { color: '#8A9BAE', fontSize: 16 },
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