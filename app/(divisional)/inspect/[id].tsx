import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import Spinner from '../../../components/Spinner';
import { colors,  formatDate } from '../../../lib/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { generatePreInspectionPDF } from '../../../utils/generatePDF';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    CATEGORIES,
    CATEGORY_LABELS_FULL,
    ChecklistItem,
    NEGATIVE_KEYS,
    Responses,
    SUBCATEGORIES,
    SUB_LABELS,
    getTotalScore,
    isVisible,
} from '../../../lib/checklist';

type Resort = {
    id: string;
    name: string;
    serial_no: number;
    area: string;
    owner_name: string | null;
    owner_phone: string | null;
    room_count: number | null;
};

export default function InspectionForm() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [resort, setResort] = useState<Resort | null>(null);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [responses, setResponses] = useState<Responses>({});
    const [loading, setLoading] = useState(true);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
    const [priorRejection, setPriorRejection] = useState<{ comments: string | null; reviewedAt: string | null } | null>(null);

    useEffect(() => {
        async function init() {
            const [resortRes, itemsRes, lastInspRes] = await Promise.all([
                supabase.from('resorts').select('id, name, serial_no, area, owner_name, owner_phone, room_count').eq('id', id).maybeSingle(),
                supabase.from('checklist_items').select('*').order('sort_order'),
                supabase.from('inspections').select('status, district_comments, reviewed_at').eq('resort_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
            ]);
            if (resortRes.data) setResort(resortRes.data);
            if (itemsRes.data) setItems(itemsRes.data);
            if (lastInspRes.data?.status === 'rejected') {
                setPriorRejection({
                    comments: lastInspRes.data.district_comments,
                    reviewedAt: lastInspRes.data.reviewed_at,
                });
            }

            // Check for existing draft.
            // If saved within the last 60s we treat this as a return-from-Summary and silently restore.
            const draft = await AsyncStorage.getItem(`draft_${id}`);
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    const ageMs = parsed.savedAt ? Date.now() - new Date(parsed.savedAt).getTime() : Infinity;
                    if (ageMs < 60_000 && parsed.responses) {
                        setResponses(parsed.responses);
                    } else {
                        setDraftTimestamp(parsed.savedAt || null);
                        setShowDraftModal(true);
                    }
                } catch {
                    await AsyncStorage.removeItem(`draft_${id}`);
                }
            }
            setLoading(false);
        }
        init();
    }, []);

    useEffect(() => {
        if (Object.keys(responses).length > 0) {
            const draftData = JSON.stringify({
                responses,
                savedAt: new Date().toISOString(),
            });
            AsyncStorage.setItem(`draft_${id}`, draftData);
        }
    }, [responses]);

    function setResponse(itemId: string, data: any) {
        setResponses(prev => ({ ...prev, [itemId]: data }));
    }

    async function resumeDraft() {
        const draft = await AsyncStorage.getItem(`draft_${id}`);
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                setResponses(parsed.responses || {});
            } catch {
                await AsyncStorage.removeItem(`draft_${id}`);
            }
        }
        setShowDraftModal(false);
    }

    function startFresh() {
        setResponses({});
        AsyncStorage.removeItem(`draft_${id}`);
        setShowDraftModal(false);
    }

    function renderYesNo(item: ChecklistItem) {
        const current = responses[item.id];
        const isManual = current?.answer === 'manual';
        return (
            <View>
                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={[styles.optionBtn, current?.answer === 'yes' && styles.optionBtnActiveYes]}
                        onPress={() => setResponse(item.id, { answer: 'yes', marks: item.max_marks })}
                    >
                        <Text style={[styles.optionBtnText, current?.answer === 'yes' && styles.optionBtnTextActive]}>Yes ({item.max_marks})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.optionBtn, current?.answer === 'no' && styles.optionBtnActiveNo]}
                        onPress={() => setResponse(item.id, { answer: 'no', marks: 0 })}
                    >
                        <Text style={[styles.optionBtnText, current?.answer === 'no' && styles.optionBtnTextActive]}>No (0)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.optionBtn, isManual && styles.optionBtnActiveManual]}
                        onPress={() => setResponse(item.id, { answer: 'manual', marks: current?.marks || 0 })}
                    >
                        <Text style={[styles.optionBtnText, isManual && styles.optionBtnTextActive]}>Manual</Text>
                    </TouchableOpacity>
                </View>
                {isManual && (
                    <View style={styles.manualRow}>
                        <TextInput
                            style={styles.manualInput}
                            value={current?.marks?.toString() || ''}
                            onChangeText={(text) => {
                                const num = parseInt(text) || 0;
                                const clamped = Math.min(Math.max(num, 0), item.max_marks);
                                setResponse(item.id, { answer: 'manual', marks: clamped });
                            }}
                            keyboardType="number-pad"
                            placeholder={`0 - ${item.max_marks}`}
                            placeholderTextColor="#8A9BAE"
                        />
                        <Text style={styles.manualRange}>/ {item.max_marks}</Text>
                    </View>
                )}
            </View>
        );
    }

    function renderSingleSelect(item: ChecklistItem) {
        const current = responses[item.id];
        return (
            <View>
                {item.options?.map((opt, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={[styles.radioRow, current?.selected === idx && styles.radioRowActive]}
                        onPress={() => setResponse(item.id, { selected: idx, marks: opt.marks })}
                    >
                        <View style={[styles.radio, current?.selected === idx && styles.radioActive]}>
                            {current?.selected === idx && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.radioLabel}>{opt.label}</Text>
                        <Text style={[styles.radioMarks, opt.marks < 0 && { color: colors.danger }]}>{opt.marks > 0 ? '+' : ''}{opt.marks}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    }

    function renderNegativeSelect(item: ChecklistItem) {
        const current = responses[item.id];
        return (
            <View>
                {item.options?.map((opt, idx) => {
                    const key = NEGATIVE_KEYS[idx];
                    const isSelected = current?.selected === key;
                    return (
                        <View key={idx}>
                            <TouchableOpacity
                                style={[styles.radioRow, isSelected && styles.radioRowActive]}
                                onPress={() => {
                                    setResponses(prev => {
                                        const n = { ...prev };
                                        // Any change to the parent invalidates conditional children
                                        delete n['3_sub'];
                                        delete n['3_desludge'];
                                        if (key === 'single_pit') {
                                            n[item.id] = { selected: key, marks: -8 };
                                        } else {
                                            n[item.id] = { selected: key, subScore: 0, marks: 0 };
                                        }
                                        return n;
                                    });
                                }}
                            >
                                <View style={[styles.radio, isSelected && styles.radioActive]}>
                                    {isSelected && <View style={styles.radioDot} />}
                                </View>
                                <Text style={styles.radioLabel}>{opt.label}</Text>
                                <Text style={[styles.radioMarks, key === 'single_pit' && { color: colors.danger }]}>
                                    {key === 'single_pit' ? '-8' : `0-${opt.subScoreMax}`}
                                </Text>
                            </TouchableOpacity>

                            {isSelected && key !== 'single_pit' && (
                                <View style={styles.subScoreBox}>
                                    <Text style={styles.subScoreLabel}>
                                        {key === 'septic_tank' ? 'Septic tank conformity score' : key === 'offsite_stp' ? 'Off-site STP score' : 'On-site STP score'}
                                    </Text>
                                    <View style={styles.numericalRow}>
                                        <TextInput
                                            style={styles.numericalInput}
                                            value={current?.subScore?.toString() || ''}
                                            onChangeText={(text) => {
                                                const num = parseInt(text) || 0;
                                                const max = opt.subScoreMax || 32;
                                                const clamped = Math.min(Math.max(num, 0), max);
                                                setResponse(item.id, { ...current, selected: key, subScore: clamped, marks: clamped });
                                            }}
                                            keyboardType="number-pad"
                                            placeholder={`0 - ${opt.subScoreMax}`}
                                            placeholderTextColor="#8A9BAE"
                                        />
                                        <Text style={styles.numericalRange}>/ {opt.subScoreMax}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        );
    }

    function renderNumerical(item: ChecklistItem) {
        const current = responses[item.id];
        const val = current?.score?.toString() || '';
        return (
            <View style={styles.numericalRow}>
                <TextInput
                    style={styles.numericalInput}
                    value={val}
                    onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        const clamped = Math.min(Math.max(num, item.min_marks), item.max_marks);
                        setResponse(item.id, { score: clamped, marks: clamped });
                    }}
                    keyboardType="number-pad"
                    placeholder={`${item.min_marks} - ${item.max_marks}`}
                    placeholderTextColor="#8A9BAE"
                />
                <Text style={styles.numericalRange}>/ {item.max_marks}</Text>
            </View>
        );
    }

    function renderItem(item: ChecklistItem) {
        if (!isVisible(item, responses)) return null;
        return (
            <View key={item.id} style={[styles.itemCard, item.visibility_condition && styles.conditionalCard]}>
                <View style={styles.itemHeader}>
                    <Text style={styles.itemId}>{item.id.toUpperCase()}</Text>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                </View>
                {item.description && <Text style={styles.itemDesc}>{item.description}</Text>}
                {item.input_type === 'yes_no' && renderYesNo(item)}
                {item.input_type === 'single_select' && renderSingleSelect(item)}
                {item.input_type === 'negative_select' && renderNegativeSelect(item)}
                {item.input_type === 'numerical' && renderNumerical(item)}
            </View>
        );
    }

    async function handleReview() {
        await AsyncStorage.setItem(
            `draft_${id}`,
            JSON.stringify({ responses, savedAt: new Date().toISOString() })
        );
        router.push(`/(divisional)/summary/${id}`);
    }



    if (loading) return <Spinner />;
    if (!resort) {
        return <View style={styles.errorScreen}><Text style={styles.errorText}>Failed to load resort data</Text></View>;
    }

    const totalScore = getTotalScore(items, responses);
    const visibleItems = items.filter(i => isVisible(i, responses));
    const answeredCount = visibleItems.filter(i => responses[i.id]).length;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, backgroundColor: colors.bg }}
        >
            <Modal visible={showDraftModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Draft Found</Text>
                        <Text style={styles.modalText}>
                            You have an unfinished inspection for this resort.
                            {draftTimestamp && `\n\nLast saved: ${formatDate(draftTimestamp)}`}
                        </Text>
                        <TouchableOpacity style={styles.modalBtnPrimary} onPress={resumeDraft}>
                            <Text style={styles.modalBtnPrimaryText}>Resume Draft</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalBtnSecondary} onPress={startFresh}>
                            <Text style={styles.modalBtnSecondaryText}>Start Fresh</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.resortHeader}>
                    <Text style={styles.resortName}>{resort.serial_no}. {resort.name}</Text>
                    <Text style={styles.resortArea}>{resort.area}</Text>
                </View>

                {priorRejection && (
                    <View style={styles.rejectionBanner}>
                        <Text style={styles.rejectionTitle}>Previous inspection was rejected</Text>
                        {priorRejection.comments
                            ? <Text style={styles.rejectionText}>{priorRejection.comments}</Text>
                            : <Text style={styles.rejectionText}>No reason was provided. Address any obvious gaps and resubmit.</Text>}
                        {priorRejection.reviewedAt && (
                            <Text style={styles.rejectionDate}>Rejected on {formatDate(priorRejection.reviewedAt)}</Text>
                        )}
                    </View>
                )}

                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                    <TouchableOpacity
                        style={styles.blankPdfBtn}
                        onPress={() => generatePreInspectionPDF(resort, items)}
                    >
                        <Text style={styles.blankPdfBtnText}>↓ Download Blank Checklist</Text>
                    </TouchableOpacity>
                </View>

                {CATEGORIES.map(cat => {
                    const catItems = items.filter(i => i.category === cat);
                    if (catItems.length === 0) return null;
                    return (
                        <View key={cat}>
                            <Text style={styles.categoryHeader}>{CATEGORY_LABELS_FULL[cat]}</Text>
                            {SUBCATEGORIES.map(sub => {
                                const subItems = catItems.filter(i => i.subcategory === sub);
                                if (subItems.length === 0) return null;
                                return (
                                    <View key={`${cat}-${sub}`}>
                                        <Text style={styles.subHeader}>{SUB_LABELS[sub]}</Text>
                                        {subItems.map(item => renderItem(item))}
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.scoreLabel}>Total Score • {answeredCount}/{visibleItems.length} answered</Text>
                    <Text style={[styles.scoreValue, totalScore < 0 && { color: colors.danger }]}>{totalScore} / 200</Text>
                </View>
                <TouchableOpacity style={styles.reviewBtn} onPress={handleReview}>
                    <Text style={styles.reviewBtnText}>Review →</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    resortHeader: { backgroundColor: colors.primaryDark, padding: 16 },
    resortName: { fontSize: 18, fontWeight: '700', color: '#fff' },
    resortArea: { fontSize: 13, color: colors.headerSubtext, marginTop: 2 },
    categoryHeader: { fontSize: 15, fontWeight: '700', color: colors.primaryDark, backgroundColor: colors.primaryLight, padding: 12, marginTop: 12 },
    subHeader: { fontSize: 13, fontWeight: '600', color: colors.textMuted, paddingHorizontal: 16, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    itemCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
    conditionalCard: { marginLeft: 28, borderColor: colors.primary, borderLeftWidth: 3 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    itemId: { fontSize: 12, fontWeight: '700', color: colors.primary, backgroundColor: colors.primaryTintLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
    itemLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1 },
    itemDesc: { fontSize: 12, color: colors.textMuted, marginBottom: 10, lineHeight: 17 },
    btnRow: { flexDirection: 'row', gap: 10 },
    optionBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
    optionBtnActiveYes: { borderColor: colors.success, backgroundColor: colors.successTintLight },
    optionBtnActiveNo: { borderColor: colors.danger, backgroundColor: colors.dangerTintLight },
    optionBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    optionBtnTextActive: { color: colors.textPrimary },
    radioRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 4 },
    radioRowActive: { backgroundColor: colors.primaryTintLight },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    radioActive: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    radioLabel: { flex: 1, fontSize: 13, color: colors.textPrimary },
    radioMarks: { fontSize: 13, fontWeight: '600', color: colors.primaryDark, marginLeft: 8 },
    numericalRow: { flexDirection: 'row', alignItems: 'center' },
    numericalInput: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    numericalRange: { fontSize: 14, color: colors.textMuted, marginLeft: 8 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderColor: colors.border, elevation: 8 },
    scoreLabel: { fontSize: 12, color: colors.textMuted },
    scoreValue: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
    reviewBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    reviewBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    optionBtnActiveManual: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
    manualRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    manualInput: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    manualRange: { fontSize: 14, color: colors.textMuted, marginLeft: 8 },
    blankPdfBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, alignSelf: 'flex-start', backgroundColor: '#fff' },
    blankPdfBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    modalText: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 20 },
    modalBtnPrimary: { backgroundColor: colors.primary, padding: 14, borderRadius: 20, alignItems: 'center', marginBottom: 10 },
    modalBtnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    modalBtnSecondary: { padding: 14, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: colors.danger },
    modalBtnSecondaryText: { color: colors.danger, fontSize: 15, fontWeight: '600' }, subScoreBox: { marginLeft: 30, marginTop: 4, marginBottom: 8, padding: 12, backgroundColor: colors.bg, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: colors.primary },
    subScoreLabel: { fontSize: 12, color: colors.primaryDark, fontWeight: '600', marginBottom: 8 },
    rejectionBanner: { marginHorizontal: 12, marginTop: 12, padding: 14, backgroundColor: colors.rejectBg, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.danger },
    rejectionTitle: { fontSize: 13, fontWeight: '700', color: colors.danger, marginBottom: 6 },
    rejectionText: { fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
    rejectionDate: { fontSize: 11, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
    errorScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    errorText: { color: colors.textMuted, fontSize: 16 },
});