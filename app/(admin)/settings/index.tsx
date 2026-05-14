import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Spinner from '../../../components/Spinner';
import { logAudit } from '../../../lib/audit';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';

type Thresholds = { five_star: number; four_star: number; three_star: number; two_star: number };

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [thresholds, setThresholds] = useState<Thresholds>({ five_star: 170, four_star: 130, three_star: 90, two_star: 50 });
    const [saving, setSaving] = useState(false);

    useFocusEffect(useCallback(() => { fetch(); }, []));

    async function fetch() {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'rating_thresholds').maybeSingle();
        if (data?.value) setThresholds(data.value as Thresholds);
        setLoading(false);
    }

    async function save() {
        const t = thresholds;
        if (!(t.five_star > t.four_star && t.four_star > t.three_star && t.three_star > t.two_star && t.two_star >= 0)) {
            Alert.alert('Invalid', 'Thresholds must be strictly decreasing and non-negative.');
            return;
        }
        setSaving(true);
        const { error } = await supabase.from('app_settings').update({ value: thresholds, updated_at: new Date().toISOString() }).eq('key', 'rating_thresholds');
        if (error) {
            Alert.alert('Save failed', error.message);
            setSaving(false);
            return;
        }
        await logAudit('update_settings', 'settings', 'rating_thresholds', thresholds);
        setSaving(false);
        Alert.alert('Saved', 'Threshold settings updated.');
    }

    if (loading) return <Spinner />;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={styles.section}>STAR RATING THRESHOLDS</Text>
            <Text style={styles.intro}>Score (out of 200) required to earn each star tier.</Text>

            <ThresholdRow stars="★★★★★" value={thresholds.five_star} onChange={(v) => setThresholds({ ...thresholds, five_star: v })} />
            <ThresholdRow stars="★★★★" value={thresholds.four_star} onChange={(v) => setThresholds({ ...thresholds, four_star: v })} />
            <ThresholdRow stars="★★★" value={thresholds.three_star} onChange={(v) => setThresholds({ ...thresholds, three_star: v })} />
            <ThresholdRow stars="★★" value={thresholds.two_star} onChange={(v) => setThresholds({ ...thresholds, two_star: v })} />
            <View style={styles.row}>
                <Text style={styles.stars}>★ (below {thresholds.two_star})</Text>
                <Text style={styles.muted}>fallback</Text>
            </View>

            <Pressable style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Thresholds'}</Text>
            </Pressable>

            <Text style={styles.hint}>
                Note: thresholds are stored in app_settings but the divisional/district/PDF screens still use compiled-in defaults
                (170 / 130 / 90 / 50). To take effect end-to-end, regenerate the app with these values or wire the screens to
                read from app_settings on mount.
            </Text>
        </ScrollView>
    );
}

function ThresholdRow({ stars, value, onChange }: { stars: string; value: number; onChange: (v: number) => void }) {
    return (
        <View style={styles.row}>
            <Text style={styles.stars}>{stars}</Text>
            <TextInput
                style={styles.input}
                value={String(value)}
                onChangeText={(v) => onChange(parseInt(v.replace(/\D/g, '')) || 0)}
                keyboardType="number-pad"
                placeholder="Min score"
                placeholderTextColor={colors.textMuted}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    section: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
    intro: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
    stars: { flex: 1, fontSize: 18, color: colors.warning, fontWeight: '600' },
    muted: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
    input: { width: 100, padding: 10, backgroundColor: colors.bg, borderRadius: 8, borderWidth: 1, borderColor: colors.border, fontSize: 16, fontWeight: '600', textAlign: 'center', color: colors.textPrimary },
    saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    hint: { fontSize: 11, color: colors.textMuted, marginTop: 16, lineHeight: 16, fontStyle: 'italic' },
});
