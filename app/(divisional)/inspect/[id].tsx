import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler } from 'react-native';

type ChecklistItem = {
    id: string;
    category: string;
    subcategory: string;
    label: string;
    description: string | null;
    input_type: string;
    min_marks: number;
    max_marks: number;
    options: any[] | null;
    visibility_condition: any | null;
    sort_order: number;
};

type Resort = {
    id: string;
    name: string;
    serial_no: number;
    area: string;
};

type Responses = Record<string, any>;

const CATEGORY_LABELS: Record<string, string> = {
    A: 'A. Faecal Sludge Management (80 Marks)',
    B: 'B. Solid Waste Management (80 Marks)',
    C: 'C. Grey Water Management (40 Marks)',
};

const SUB_LABELS: Record<string, string> = {
    infrastructure: 'Infrastructure',
    practices: 'Practices',
    awareness: 'Awareness Generation',
    innovations: 'Innovations',
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

    useEffect(() => {
        async function init() {
            const [resortRes, itemsRes] = await Promise.all([
                supabase.from('resorts').select('id, name, serial_no, area').eq('id', id).single(),
                supabase.from('checklist_items').select('*').order('sort_order'),
            ]);
            if (resortRes.data) setResort(resortRes.data);
            if (itemsRes.data) setItems(itemsRes.data);

            // Check for existing draft
            const draft = await AsyncStorage.getItem(`draft_${id}`);
            if (draft) {
                const parsed = JSON.parse(draft);
                setDraftTimestamp(parsed.savedAt || null);
                setShowDraftModal(true);
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

    function getTotalScore() {
        return Object.values(responses).reduce((sum: number, r: any) => sum + (r.marks || 0), 0);
    }

    function isVisible(item: ChecklistItem) {
        if (!item.visibility_condition) return true;
        const { dependsOn, showWhen } = item.visibility_condition;
        const parent = responses[dependsOn];
        if (!parent) return false;
        return parent.selected === showWhen;
    }

    function setResponse(itemId: string, data: any) {
        setResponses(prev => ({ ...prev, [itemId]: data }));
    }

    async function resumeDraft() {
        const draft = await AsyncStorage.getItem(`draft_${id}`);
        if (draft) {
            const parsed = JSON.parse(draft);
            setResponses(parsed.responses || {});
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
                        <Text style={[styles.radioMarks, opt.marks < 0 && { color: '#E63946' }]}>{opt.marks > 0 ? '+' : ''}{opt.marks}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    }

    function renderNegativeSelect(item: ChecklistItem) {
        const current = responses[item.id];
        const keys = ['single_pit', 'septic_tank', 'offsite_stp', 'onsite_stp'];
        return (
            <View>
                {item.options?.map((opt, idx) => {
                    const key = keys[idx];
                    const isSelected = current?.selected === key;
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.radioRow, isSelected && styles.radioRowActive]}
                            onPress={() => {
                                if (opt.hasSubScore) {
                                    setResponse(item.id, { selected: key, subScore: current?.subScore || 0, marks: current?.subScore || 0 });
                                } else {
                                    setResponse(item.id, { selected: key, marks: opt.marks });
                                    // Clear 3_sub if not septic tank
                                    if (key !== 'septic_tank') {
                                        setResponses(prev => { const n = { ...prev }; delete n['3_sub']; return n; });
                                    }
                                }
                            }}
                        >
                            <View style={[styles.radio, isSelected && styles.radioActive]}>
                                {isSelected && <View style={styles.radioDot} />}
                            </View>
                            <Text style={styles.radioLabel}>{opt.label}</Text>
                            <Text style={[styles.radioMarks, (opt.marks !== null && opt.marks < 0) && { color: '#E63946' }]}>
                                {opt.hasSubScore ? '0-22' : `${opt.marks > 0 ? '+' : ''}${opt.marks}`}
                            </Text>
                        </TouchableOpacity>
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
        if (!isVisible(item)) return null;
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
        await AsyncStorage.setItem(`draft_${id}`, JSON.stringify(responses));
        router.replace(`/(divisional)/summary/${id}`);
    }

    async function generateBlankPDF() {
        try {
            let tableRows = '';

            items.forEach(item => {
                tableRows += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #b2c9c9; text-align: center; font-size: 13px;">${item.id.toUpperCase()}</td>
                        <td style="padding: 8px; border: 1px solid #b2c9c9; font-size: 13px;">
                            <div style="font-weight: 600; margin-bottom: 4px;">${item.label}</div>
                            ${item.description ? `<div style="font-size: 12px; color: #555;">${item.description}</div>` : ''}
                        </td>
                        <td style="padding: 8px; border: 1px solid #b2c9c9; text-align: center; font-size: 13px;">${item.max_marks}</td>
                        <td style="padding: 8px; border: 1px solid #b2c9c9;"></td>
                    </tr>
                `;
            });

            const html = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <style>
                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #1A1A2E; }
                            .header { text-align: center; margin-bottom: 25px; }
                            .header h1 { color: #0D7377; margin: 0; font-size: 22px; font-weight: normal; letter-spacing: 1px; }
                            .header p { color: #1A1A2E; margin-top: 8px; font-size: 14px; font-weight: 500; }
                            .marks-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                            .marks-table th { background-color: #0D7377; color: white; padding: 12px 8px; text-align: left; border: 1px solid #0D7377; font-size: 13px; font-weight: 600; }
                            .marks-table th.center { text-align: center; }
                            .marks-table td { padding: 8px; border: 1px solid #b2c9c9; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>SGLR RATING</h1>
                            <p>${resort?.name || 'Resort'}</p>
                        </div>
                        <table class="marks-table">
                            <thead>
                                <tr>
                                    <th class="center" style="width: 40px;">ID</th>
                                    <th>Description</th>
                                    <th class="center" style="width: 70px;">Max Marks</th>
                                    <th class="center" style="width: 100px;">Marks Awarded</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { dialogTitle: 'Download Blank Checklist', UTI: 'com.adobe.pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Could not generate PDF report');
        }
    }

    if (loading || !resort) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#0D9DA8" /></View>;
    }

    const categories = ['A', 'B', 'C'];
    const subcategories = ['infrastructure', 'practices', 'awareness', 'innovations'];
    const totalScore = getTotalScore();

    return (
        <View style={{ flex: 1, backgroundColor: '#EEF4F5' }}>
            <Modal visible={showDraftModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Draft Found</Text>
                        <Text style={styles.modalText}>
                            You have an unfinished inspection for this resort.
                            {draftTimestamp && `\n\nLast saved: ${new Date(draftTimestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
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

                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                    <TouchableOpacity
                        style={styles.blankPdfBtn}
                        onPress={generateBlankPDF}
                    >
                        <Text style={styles.blankPdfBtnText}>↓ Download Blank Checklist</Text>
                    </TouchableOpacity>
                </View>

                {categories.map(cat => {
                    const catItems = items.filter(i => i.category === cat);
                    if (catItems.length === 0) return null;
                    return (
                        <View key={cat}>
                            <Text style={styles.categoryHeader}>{CATEGORY_LABELS[cat]}</Text>
                            {subcategories.map(sub => {
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
                    <Text style={styles.scoreLabel}>Total Score</Text>
                    <Text style={[styles.scoreValue, totalScore < 0 && { color: '#E63946' }]}>{totalScore} / 200</Text>
                </View>
                <TouchableOpacity style={styles.reviewBtn} onPress={handleReview}>
                    <Text style={styles.reviewBtnText}>Review →</Text>
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
    categoryHeader: { fontSize: 15, fontWeight: '700', color: '#0D7377', backgroundColor: '#D5EFEF', padding: 12, marginTop: 12 },
    subHeader: { fontSize: 13, fontWeight: '600', color: '#8A9BAE', paddingHorizontal: 16, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    itemCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0E8EA' },
    conditionalCard: { marginLeft: 28, borderColor: '#0D9DA8', borderLeftWidth: 3 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    itemId: { fontSize: 12, fontWeight: '700', color: '#0D9DA8', backgroundColor: '#E1F5EE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
    itemLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', flex: 1 },
    itemDesc: { fontSize: 12, color: '#8A9BAE', marginBottom: 10, lineHeight: 17 },
    btnRow: { flexDirection: 'row', gap: 10 },
    optionBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E8EA', alignItems: 'center' },
    optionBtnActiveYes: { borderColor: '#2ECC71', backgroundColor: '#2ECC7115' },
    optionBtnActiveNo: { borderColor: '#E63946', backgroundColor: '#E6394615' },
    optionBtnText: { fontSize: 14, fontWeight: '600', color: '#8A9BAE' },
    optionBtnTextActive: { color: '#1A1A2E' },
    radioRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 4 },
    radioRowActive: { backgroundColor: '#E1F5EE' },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E0E8EA', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    radioActive: { borderColor: '#0D9DA8' },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0D9DA8' },
    radioLabel: { flex: 1, fontSize: 13, color: '#1A1A2E' },
    radioMarks: { fontSize: 13, fontWeight: '600', color: '#0D7377', marginLeft: 8 },
    numericalRow: { flexDirection: 'row', alignItems: 'center' },
    numericalInput: { flex: 1, backgroundColor: '#EEF4F5', borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    numericalRange: { fontSize: 14, color: '#8A9BAE', marginLeft: 8 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderColor: '#E0E8EA', elevation: 8 },
    scoreLabel: { fontSize: 12, color: '#8A9BAE' },
    scoreValue: { fontSize: 20, fontWeight: '700', color: '#0D7377' },
    reviewBtn: { backgroundColor: '#0D9DA8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    reviewBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    optionBtnActiveManual: { borderColor: '#0D9DA8', backgroundColor: '#0D9DA815' },
    manualRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    manualInput: { flex: 1, backgroundColor: '#EEF4F5', borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    manualRange: { fontSize: 14, color: '#8A9BAE', marginLeft: 8 },
    blankPdfBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#0D9DA8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, alignSelf: 'flex-start', backgroundColor: '#fff' },
    blankPdfBtnText: { color: '#0D9DA8', fontSize: 13, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
    modalText: { fontSize: 14, color: '#8A9BAE', lineHeight: 20, marginBottom: 20 },
    modalBtnPrimary: { backgroundColor: '#0D9DA8', padding: 14, borderRadius: 20, alignItems: 'center', marginBottom: 10 },
    modalBtnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    modalBtnSecondary: { padding: 14, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#E63946' },
    modalBtnSecondaryText: { color: '#E63946', fontSize: 15, fontWeight: '600' },
});