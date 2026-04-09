import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../../lib/supabase';

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

export default function InspectionDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [inspection, setInspection] = useState<any>(null);
    const [resort, setResort] = useState<any>(null);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        const [inspRes, itemsRes] = await Promise.all([
            supabase.from('inspections').select('*, resort:resorts(*)').eq('id', id).single(),
            supabase.from('checklist_items').select('*').order('sort_order'),
        ]);
        if (inspRes.data) {
            setInspection(inspRes.data);
            setResort(inspRes.data.resort);
        }
        if (itemsRes.data) setItems(itemsRes.data);
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

    function getScoreColor(score: number) {
        if (score >= 130) return '#2ECC71';
        if (score >= 90) return '#F4A423';
        if (score >= 50) return '#FF6B35';
        return '#E63946';
    }

    function getStarLabel(stars: number) {
        if (stars === 5) return 'Excellent';
        if (stars === 4) return 'Good';
        if (stars === 3) return 'Average';
        if (stars === 2) return 'Below Average';
        return 'Poor';
    }

    async function handleAction(action: 'approve' | 'reject' | 'unfreeze') {
        const labels = { approve: 'Approve', reject: 'Reject', unfreeze: 'Unfreeze' };
        Alert.alert(
            `${labels[action]} Inspection`,
            `Are you sure you want to ${action} this inspection?${comments ? `\n\nComment: ${comments}` : ''}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: labels[action],
                    style: action === 'reject' ? 'destructive' : 'default',
                    onPress: async () => {
                        setActing(true);
                        const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending';
                        const { error } = await supabase
                            .from('inspections')
                            .update({
                                status: newStatus,
                                district_comments: comments || null,
                                reviewed_at: new Date().toISOString(),
                            })
                            .eq('id', id);
                        if (error) {
                            Alert.alert('Error', error.message);
                            setActing(false);
                        } else {
                            router.back();
                        }
                    },
                },
            ]
        );
    }

    async function generateCompletedPDF() {
        try {
            const responses = inspection?.responses || {};
            let tableRows = '';

            items.forEach(item => {
                const r = responses[item.id];
                // Check if answered. If not answered, marks are 0
                const marksAwarded = r?.marks ?? 0;
                
                tableRows += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #E0E8EA; text-align: center;">${item.id.toUpperCase()}</td>
                        <td style="padding: 8px; border: 1px solid #E0E8EA;">${item.label}</td>
                        <td style="padding: 8px; border: 1px solid #E0E8EA; text-align: center;">${item.max_marks}</td>
                        <td style="padding: 8px; border: 1px solid #E0E8EA; text-align: center; font-weight: bold; color: #0D7377;">${marksAwarded}</td>
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
                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
                            .header { text-align: center; margin-bottom: 30px; }
                            .header h1 { color: #0D9DA8; margin: 0; font-size: 28px; letter-spacing: 2px; }
                            .header p { color: #8A9BAE; margin-top: 5px; font-size: 14px; }
                            .info-table { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
                            .info-table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 14px; }
                            .info-table td.label { font-weight: bold; width: 140px; color: #555; background-color: #f9f9f9; }
                            .marks-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                            .marks-table th { background-color: #0D9DA8; color: white; padding: 12px 8px; text-align: left; border: 1px solid #0D9DA8; font-size: 14px; }
                            .marks-table th.center { text-align: center; }
                            .marks-table td { padding: 8px; border: 1px solid #E0E8EA; font-size: 13px; }
                            .total-row td { font-weight: bold; font-size: 16px; background-color: #EEF4F5; }
                            .stars { color: #F4A423; font-size: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>SGLR RATING</h1>
                            <p>Inspection Report - Swachha Green Leaf Rating</p>
                        </div>

                        <table class="info-table">
                            <tr><td class="label">Resort Name:</td><td>${resort?.name || 'N/A'}</td></tr>
                            <tr><td class="label">Area:</td><td>${resort?.area || 'N/A'}</td></tr>
                            <tr><td class="label">Manager/Owner:</td><td>${resort?.owner_name || 'N/A'}</td></tr>
                            <tr><td class="label">Phone:</td><td>${resort?.owner_phone || 'N/A'}</td></tr>
                        </table>

                        <table class="marks-table">
                            <thead>
                                <tr>
                                    <th class="center" style="width: 50px;">ID</th>
                                    <th>Description</th>
                                    <th class="center" style="width: 80px;">Max Marks</th>
                                    <th class="center" style="width: 100px;">Marks Awarded</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                                <tr class="total-row">
                                    <td colspan="2" style="text-align: right; padding-right: 15px;">TOTAL SCORE & RATING:</td>
                                    <td class="center">200</td>
                                    <td class="center" style="color: #0D7377;">
                                        ${inspection?.total_score || 0}<br/>
                                        <span class="stars">${'★'.repeat(inspection?.stars || 0)}${'☆'.repeat(5 - (inspection?.stars || 0))}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { dialogTitle: 'Download Inspection Report', UTI: 'com.adobe.pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Could not generate PDF report');
        }
    }

    if (loading || !inspection || !resort) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#0D9DA8" /></View>;
    }

    const categories = ['A', 'B', 'C'];
    const isPending = inspection.status === 'pending';
    const isApproved = inspection.status === 'approved';

    return (
        <View style={{ flex: 1, backgroundColor: '#EEF4F5' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
                <View style={styles.resortHeader}>
                    <Text style={styles.resortName}>{resort.serial_no}. {resort.name}</Text>
                    <Text style={styles.resortArea}>{resort.area} • {resort.room_count ?? '?'} rooms</Text>
                </View>

                <View style={styles.scoreCard}>
                    <Text style={[styles.scoreValue, { color: getScoreColor(inspection.total_score) }]}>
                        {inspection.total_score} / 200
                    </Text>
                    <Text style={styles.starsText}>
                        {'★'.repeat(inspection.stars)}{'☆'.repeat(5 - inspection.stars)}
                    </Text>
                    <Text style={styles.performanceLabel}>{getStarLabel(inspection.stars)}</Text>
                    <Text style={styles.dateText}>
                        Submitted: {new Date(inspection.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
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
                                const answered = !!r;
                                return (
                                    <View key={item.id} style={[styles.itemRow, !answered && styles.itemRowUnanswered]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemLabel}>{item.id.toUpperCase()}. {item.label}</Text>
                                            <Text style={[styles.itemAnswer, !answered && { color: '#E63946' }]}>
                                                {getAnswerText(item)}
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

                {(isPending || isApproved) && (
                    <View style={styles.commentBox}>
                        <Text style={styles.commentLabel}>District Comments (optional)</Text>
                        <TextInput
                            style={styles.commentInput}
                            value={comments}
                            onChangeText={setComments}
                            placeholder="Add comments for the divisional team..."
                            placeholderTextColor="#8A9BAE"
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                )}

                <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={generateCompletedPDF}
                >
                    <Text style={styles.downloadBtnText}>↓ Download Inspection Report</Text>
                </TouchableOpacity>
            </ScrollView>

            {isPending && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleAction('reject')}
                        disabled={acting}
                    >
                        <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleAction('approve')}
                        disabled={acting}
                    >
                        <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isApproved && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.unfreezeBtn]}
                        onPress={() => handleAction('unfreeze')}
                        disabled={acting}
                    >
                        <Text style={styles.unfreezeBtnText}>Unfreeze Rating</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF4F5' },
    resortHeader: { backgroundColor: '#0D7377', padding: 16 },
    resortName: { fontSize: 18, fontWeight: '700', color: '#fff' },
    resortArea: { fontSize: 13, color: '#ffffffbb', marginTop: 2 },
    scoreCard: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E0E8EA' },
    scoreValue: { fontSize: 32, fontWeight: '700' },
    starsText: { fontSize: 22, color: '#F4A423', marginTop: 6 },
    performanceLabel: { fontSize: 15, fontWeight: '600', color: '#0D7377', marginTop: 4 },
    dateText: { fontSize: 12, color: '#8A9BAE', marginTop: 8 },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D5EFEF', padding: 12, marginTop: 8 },
    catTitle: { fontSize: 14, fontWeight: '700', color: '#0D7377', flex: 1 },
    catScore: { fontSize: 16, fontWeight: '700', color: '#0D7377' },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 1, padding: 12, borderLeftWidth: 3, borderLeftColor: '#2ECC71' },
    itemRowUnanswered: { borderLeftColor: '#E63946' },
    itemLabel: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
    itemAnswer: { fontSize: 12, color: '#8A9BAE', marginTop: 2 },
    itemMarks: { fontSize: 16, fontWeight: '700', color: '#0D7377', marginLeft: 12, minWidth: 30, textAlign: 'right' },
    commentBox: { margin: 12 },
    commentLabel: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
    commentInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, borderWidth: 1, borderColor: '#E0E8EA', textAlignVertical: 'top', minHeight: 80 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 16, borderTopWidth: 1, borderColor: '#E0E8EA', elevation: 8, gap: 12 },
    actionBtn: { flex: 1, padding: 14, borderRadius: 20, alignItems: 'center' },
    rejectBtn: { borderWidth: 1.5, borderColor: '#E63946' },
    rejectBtnText: { color: '#E63946', fontSize: 15, fontWeight: '600' },
    approveBtn: { backgroundColor: '#2ECC71' },
    approveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    unfreezeBtn: { borderWidth: 1.5, borderColor: '#F4A423' },
    unfreezeBtnText: { color: '#F4A423', fontSize: 15, fontWeight: '600' },
    downloadBtn: { margin: 12, marginTop: 16, backgroundColor: '#0D9DA8', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, elevation: 6, alignItems: 'center' },
    downloadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});