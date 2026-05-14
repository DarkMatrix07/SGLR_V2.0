import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getSession } from '../../../lib/authRouting';
import {
    CATEGORIES,
    CATEGORY_LABELS,
    ChecklistItem,
    getAnswerText,
    getCategoryScore,
    getScoreColor,
    getStarLabel,
    getStars,
    getTotalScore,
    isVisible,
} from '../../../lib/checklist';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Summary() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [resort, setResort] = useState<any>(null);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [resortRes, itemsRes, draft] = await Promise.all([
            supabase.from('resorts').select('*').eq('id', id).single(),
            supabase.from('checklist_items').select('*').order('sort_order'),
            AsyncStorage.getItem(`draft_${id}`),
        ]);
        if (resortRes.data) setResort(resortRes.data);
        if (itemsRes.data) setItems(itemsRes.data);
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                setResponses(parsed.responses ?? parsed ?? {});
            } catch {
                await AsyncStorage.removeItem(`draft_${id}`);
            }
        }
        setLoading(false);
    }

    async function handleSubmit() {
        const total = getTotalScore(items, responses);
        const stars = getStars(total);

        const visibleItems = items.filter(i => isVisible(i, responses));
        const unanswered = visibleItems.filter(i => !responses[i.id]).length;

        const title = unanswered > 0 ? 'Incomplete Inspection' : 'Submit Inspection';
        const message = unanswered > 0
            ? `${unanswered} of ${visibleItems.length} questions are unanswered.\n\nTotal: ${total}/200 (${stars} stars)\n\nSubmit anyway?`
            : `Total: ${total}/200 (${stars} stars)\n\nAre you sure you want to submit?`;

        Alert.alert(
            title,
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: unanswered > 0 ? 'Submit Anyway' : 'Submit',
                    onPress: async () => {
                        setSubmitting(true);

                        const session = await getSession();
                        if (!session) {
                            Alert.alert('Session Expired', 'Please log in again.');
                            setSubmitting(false);
                            router.replace('/login');
                            return;
                        }

                        const { error } = await supabase.from('inspections').insert({
                            resort_id: id,
                            officer_id: session.officerId,
                            responses,
                            total_score: total,
                            stars,
                            status: 'pending',
                        });

                        if (error) {
                            console.error('Supabase insert error:', error.message);
                            Alert.alert('Submission Failed', 'Please check your internet connection and try again.');
                            setSubmitting(false);
                        } else {
                            await AsyncStorage.removeItem(`draft_${id}`);
                            // Pop inspect + summary off the stack, then go to confirm
                            if (router.canDismiss()) router.dismissAll();
                            router.push(`/(divisional)/confirm/${id}`);
                        }
                    },
                },
            ]
        );
    }

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#0D9DA8" /></View>;
    }
    if (!resort) {
        return <View style={styles.center}><Text style={{ color: '#8A9BAE', fontSize: 16 }}>Failed to load resort data</Text></View>;
    }

    const total = getTotalScore(items, responses);
    const stars = getStars(total);

    return (
        <View style={{ flex: 1, backgroundColor: '#EEF4F5' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                <View style={styles.resortHeader}>
                    <Text style={styles.resortName}>{resort.serial_no}. {resort.name}</Text>
                    <Text style={styles.resortArea}>{resort.area}</Text>
                </View>

                <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>Total Score</Text>
                    <Text style={[styles.scoreValue, { color: getScoreColor(total) }]}>{total} / 200</Text>
                    <Text style={styles.starsText}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</Text>
                    <Text style={[styles.performanceLabel, { color: getScoreColor(total) }]}>
                        {getStarLabel(stars)}
                    </Text>
                </View>

                {CATEGORIES.map(cat => {
                    const catItems = items.filter(i => i.category === cat && isVisible(i, responses));
                    if (catItems.length === 0) return null;
                    const catScore = getCategoryScore(items, responses, cat);
                    return (
                        <View key={cat}>
                            <View style={styles.catHeader}>
                                <Text style={styles.catTitle}>{CATEGORY_LABELS[cat]}</Text>
                                <Text style={styles.catScore}>{catScore}</Text>
                            </View>
                            {catItems.map(item => {
                                const r = responses[item.id];
                                const answered = !!r;
                                return (
                                    <View key={item.id} style={[styles.itemRow, !answered && styles.itemRowUnanswered]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemLabel}>{item.id.toUpperCase()}. {item.label}</Text>
                                            <Text style={[styles.itemAnswer, !answered && { color: '#E63946' }]}>
                                                {getAnswerText(item, r)}
                                            </Text>
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
            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.editBtn} onPress={() => router.back()}>
                    <Text style={styles.editBtnText}>← Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF4F5' },
    resortHeader: { backgroundColor: '#0D7377', padding: 16 },
    resortName: { fontSize: 18, fontWeight: '700', color: '#fff' },
    resortArea: { fontSize: 13, color: '#ffffffbb', marginTop: 2 },
    scoreCard: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E0E8EA' },
    scoreLabel: { fontSize: 13, color: '#8A9BAE' },
    scoreValue: { fontSize: 36, fontWeight: '700', marginTop: 4 },
    starsText: { fontSize: 24, color: '#F4A423', marginTop: 8 },
    performanceLabel: { fontSize: 16, fontWeight: '600', marginTop: 4 },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D5EFEF', padding: 12, marginTop: 8 },
    catTitle: { fontSize: 14, fontWeight: '700', color: '#0D7377', flex: 1 },
    catScore: { fontSize: 16, fontWeight: '700', color: '#0D7377' },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 1, padding: 12, borderLeftWidth: 3, borderLeftColor: '#2ECC71' },
    itemRowUnanswered: { borderLeftColor: '#E63946' },
    itemLabel: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
    itemAnswer: { fontSize: 12, color: '#8A9BAE', marginTop: 2 },
    itemMarks: { fontSize: 16, fontWeight: '700', color: '#0D7377', marginLeft: 12, minWidth: 30, textAlign: 'right' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 16, borderTopWidth: 1, borderColor: '#E0E8EA', elevation: 8, gap: 12 },
    editBtn: { flex: 1, padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: '#0D9DA8', alignItems: 'center' },
    editBtnText: { color: '#0D9DA8', fontSize: 15, fontWeight: '600' },
    submitBtn: { flex: 1, padding: 14, borderRadius: 20, backgroundColor: '#0D9DA8', alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});