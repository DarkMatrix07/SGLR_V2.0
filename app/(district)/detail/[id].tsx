import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Vibration } from 'react-native';
import Spinner from '../../../components/Spinner';
import { colors,  formatDate, formatStars } from '../../../lib/theme';
import { InspectionWithReviewer, Resort } from '../../../lib/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getSession } from '../../../lib/authRouting';
import { logAudit } from '../../../lib/audit';
import { generatePostInspectionPDF } from '../../../utils/generatePDF';
import {
    CATEGORIES,
    CATEGORY_LABELS,
    ChecklistItem,
    getAnswerText,
    getScoreColor,
    getStarLabel,
    getStatusColor,
    isVisible,
} from '../../../lib/checklist';

export default function InspectionDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [inspection, setInspection] = useState<InspectionWithReviewer | null>(null);
    const [resort, setResort] = useState<Resort | null>(null);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        const [inspRes, itemsRes] = await Promise.all([
            supabase.from('inspections').select('*, resort:resorts(*), reviewer:officers!inspections_reviewed_by_fkey(name)').eq('id', id).maybeSingle(),
            supabase.from('checklist_items').select('*').order('sort_order'),
        ]);
        if (inspRes.data) {
            setInspection(inspRes.data);
            setResort(inspRes.data.resort);
            setComments(inspRes.data.district_comments ?? '');
        }
        if (itemsRes.data) setItems(itemsRes.data);
        setLoading(false);
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

                        const session = await getSession();
                        if (!session) {
                            Alert.alert('Session Expired', 'Please log in again.');
                            setActing(false);
                            router.replace('/login');
                            return;
                        }

                        const isUnfreeze = action === 'unfreeze';
                        const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending';

                        const { error } = await supabase
                            .from('inspections')
                            .update({
                                status: newStatus,
                                district_comments: isUnfreeze ? null : (comments || null),
                                reviewed_at: isUnfreeze ? null : new Date().toISOString(),
                                reviewed_by: isUnfreeze ? null : session.officerId,
                            })
                            .eq('id', id);

                        if (error) {
                            console.error('Inspection update failed:', error.message);
                            Alert.alert('Action Failed', 'Could not update the inspection. Check your connection and try again.');
                            setActing(false);
                        } else {
                            Vibration.vibrate(40);
                            const auditAction = action === 'approve' ? 'approve_inspection'
                                : action === 'reject' ? 'reject_inspection'
                                : 'unfreeze_inspection';
                            await logAudit(auditAction, 'inspection', id as string, {
                                resort: resort?.name,
                                comments: comments || null,
                            });
                            router.back();
                        }
                    },
                },
            ]
        );
    }



    if (loading) return <Spinner />;
    if (!inspection || !resort) {
        return <View style={styles.errorScreen}><Text style={styles.errorText}>Failed to load inspection data</Text></View>;
    }

    const isPending = inspection.status === 'pending';
    const isApproved = inspection.status === 'approved';
    const responses = inspection.responses ?? {};

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
                <View style={styles.resortHeader}>
                    <Text style={styles.resortName}>{resort.serial_no}. {resort.name}</Text>
                    <Text style={styles.resortArea}>{resort.area} • {resort.room_count ?? '?'} rooms</Text>
                </View>

                <View style={styles.statusBar}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inspection.status) + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(inspection.status) }]}>
                            {inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1)}
                        </Text>
                    </View>
                    {inspection.reviewed_at && (
                        <Text style={styles.reviewedMeta}>
                            Reviewed by {inspection.reviewer?.name ?? 'unknown'} on {formatDate(inspection.reviewed_at)}
                        </Text>
                    )}
                </View>

                <View style={styles.scoreCard}>
                    <Text style={[styles.scoreValue, { color: getScoreColor(inspection.total_score) }]}>
                        {inspection.total_score} / 200
                    </Text>
                    <Text style={styles.starsText}>{formatStars(inspection.stars)}</Text>
                    <Text style={styles.performanceLabel}>{getStarLabel(inspection.stars)}</Text>
                    <Text style={styles.dateText}>Submitted: {formatDate(inspection.created_at)}</Text>
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
                                const answered = !!r;
                                return (
                                    <View key={item.id} style={[styles.itemRow, !answered && styles.itemRowUnanswered]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemLabel}>{item.id.toUpperCase()}. {item.label}</Text>
                                            <Text style={[styles.itemAnswer, !answered && { color: colors.danger }]}>
                                                {getAnswerText(item, r)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.itemMarks, (r?.marks || 0) < 0 && { color: colors.danger }]}>
                                            {r?.marks ?? 0}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}

                {(isPending || isApproved) ? (
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
                ) : comments ? (
                    <View style={styles.commentBox}>
                        <Text style={styles.commentLabel}>District Comments</Text>
                        <Text style={styles.commentReadonly}>{comments}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => generatePostInspectionPDF(resort, inspection, items)}
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
    resortHeader: { backgroundColor: colors.primaryDark, padding: 16 },
    resortName: { fontSize: 18, fontWeight: '700', color: '#fff' },
    resortArea: { fontSize: 13, color: colors.headerSubtext, marginTop: 2 },
    scoreCard: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    scoreValue: { fontSize: 32, fontWeight: '700' },
    starsText: { fontSize: 22, color: colors.warning, marginTop: 6 },
    performanceLabel: { fontSize: 15, fontWeight: '600', color: colors.primaryDark, marginTop: 4 },
    dateText: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primaryLight, padding: 12, marginTop: 8 },
    catTitle: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, flex: 1 },
    catScore: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 1, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.success },
    itemRowUnanswered: { borderLeftColor: colors.danger },
    itemLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    itemAnswer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    itemMarks: { fontSize: 16, fontWeight: '700', color: colors.primaryDark, marginLeft: 12, minWidth: 30, textAlign: 'right' },
    commentBox: { margin: 12 },
    commentLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
    commentInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top', minHeight: 80 },
    commentReadonly: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
    statusBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 12, gap: 10 },
    statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
    statusBadgeText: { fontSize: 13, fontWeight: '700' },
    reviewedMeta: { fontSize: 12, color: colors.textMuted, flex: 1 },
    errorScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    errorText: { color: colors.textMuted, fontSize: 16 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 16, borderTopWidth: 1, borderColor: colors.border, elevation: 8, gap: 12 },
    actionBtn: { flex: 1, padding: 14, borderRadius: 20, alignItems: 'center' },
    rejectBtn: { borderWidth: 1.5, borderColor: colors.danger },
    rejectBtnText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
    approveBtn: { backgroundColor: colors.success },
    approveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    unfreezeBtn: { borderWidth: 1.5, borderColor: colors.warning },
    unfreezeBtnText: { color: colors.warning, fontSize: 15, fontWeight: '600' },
    downloadBtn: { margin: 12, marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, elevation: 6, alignItems: 'center' },
    downloadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});