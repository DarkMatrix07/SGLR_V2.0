import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { logAudit } from '../lib/audit';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

type Props = {
    initial?: {
        id: string;
        phone: string;
        name: string | null;
        role: string;
        pin: string;
        is_active: boolean;
    } | null;
};

const ROLES = ['divisional', 'district', 'admin'] as const;

export default function OfficerForm({ initial }: Props) {
    const router = useRouter();
    const isEdit = !!initial;
    const [localPhone, setLocalPhone] = useState(initial ? initial.phone.replace(/^\+91/, '') : '');
    const [name, setName] = useState(initial?.name ?? '');
    const [role, setRole] = useState<string>(initial?.role ?? 'divisional');
    const [pin, setPin] = useState(initial?.pin ?? '');
    const [active, setActive] = useState(initial?.is_active ?? true);
    const [saving, setSaving] = useState(false);

    function setPhoneClean(raw: string) {
        let d = raw.replace(/\D/g, '');
        if (d.startsWith('91') && d.length > 10) d = d.slice(2);
        setLocalPhone(d.slice(0, 10));
    }

    async function save() {
        if (!/^\d{10}$/.test(localPhone)) { Alert.alert('Invalid', 'Phone must be 10 digits.'); return; }
        if (!/^\d{4}$/.test(pin)) { Alert.alert('Invalid', 'PIN must be 4 digits.'); return; }
        if (!name.trim()) { Alert.alert('Invalid', 'Name is required.'); return; }

        setSaving(true);
        const payload = { phone: `+91${localPhone}`, name: name.trim(), role, pin, is_active: active };

        const { data, error } = isEdit
            ? await supabase.from('officers').update(payload).eq('id', initial!.id).select().single()
            : await supabase.from('officers').insert(payload).select().single();

        if (error) {
            console.error('Officer save failed:', error.message);
            const msg = error.code === '23505' ? 'An officer with this phone already exists.' : 'Could not save officer.';
            Alert.alert('Save Failed', msg);
            setSaving(false);
            return;
        }

        await logAudit(isEdit ? 'update_officer' : 'create_officer', 'officer', data.id, {
            phone: data.phone, role: data.role, name: data.name,
        });
        router.back();
    }

    async function resetPin() {
        Alert.alert('Reset PIN', 'Set PIN to 0000?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reset', style: 'destructive', onPress: async () => {
                    const { error } = await supabase.from('officers').update({ pin: '0000' }).eq('id', initial!.id);
                    if (error) { Alert.alert('Failed', error.message); return; }
                    await logAudit('reset_pin', 'officer', initial!.id);
                    setPin('0000');
                    Alert.alert('Done', 'PIN reset to 0000.');
                }
            }
        ]);
    }

    async function deactivate() {
        Alert.alert('Deactivate', `Deactivate ${initial?.name ?? 'this officer'}? They won't be able to log in.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Deactivate', style: 'destructive', onPress: async () => {
                    const { error } = await supabase.from('officers').update({ is_active: false }).eq('id', initial!.id);
                    if (error) { Alert.alert('Failed', error.message); return; }
                    await logAudit('deactivate_officer', 'officer', initial!.id);
                    router.back();
                }
            }
        ]);
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Field label="Name">
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.textMuted} />
            </Field>

            <Field label="Phone Number">
                <View style={styles.phoneRow}>
                    <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+91</Text></View>
                    <TextInput
                        style={styles.phoneInput}
                        value={localPhone}
                        onChangeText={setPhoneClean}
                        keyboardType="phone-pad"
                        maxLength={10}
                        placeholder="9876543210"
                        placeholderTextColor={colors.textMuted}
                        editable={!isEdit}
                    />
                </View>
                {isEdit && <Text style={styles.hint}>Phone cannot be changed once set.</Text>}
            </Field>

            <Field label="Role">
                <View style={styles.roleRow}>
                    {ROLES.map(r => (
                        <Pressable
                            key={r}
                            style={[styles.roleChip, role === r && styles.roleChipActive]}
                            onPress={() => setRole(r)}
                        >
                            <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>{r}</Text>
                        </Pressable>
                    ))}
                </View>
            </Field>

            <Field label="PIN (4 digits)">
                <TextInput
                    style={styles.input}
                    value={pin}
                    onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="0000"
                    placeholderTextColor={colors.textMuted}
                />
            </Field>

            <View style={styles.activeRow}>
                <Text style={styles.label}>Active</Text>
                <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
            </View>

            <Pressable style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Officer'}</Text>
            </Pressable>

            {isEdit && (
                <View style={{ marginTop: 24, gap: 8 }}>
                    <Pressable style={styles.dangerBtn} onPress={resetPin}>
                        <Text style={styles.dangerBtnText}>Reset PIN to 0000</Text>
                    </Pressable>
                    {initial?.is_active && (
                        <Pressable style={styles.dangerBtn} onPress={deactivate}>
                            <Text style={styles.dangerBtnText}>Deactivate Officer</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
    hint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, fontSize: 16, color: colors.textPrimary },
    phoneRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    phonePrefix: { paddingHorizontal: 14, paddingVertical: 14, backgroundColor: colors.border, justifyContent: 'center' },
    phonePrefixText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
    phoneInput: { flex: 1, padding: 14, fontSize: 16, color: colors.textPrimary },
    roleRow: { flexDirection: 'row', gap: 8 },
    roleChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
    roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    roleChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' },
    roleChipTextActive: { color: '#fff' },
    activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
    saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    dangerBtn: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center' },
    dangerBtnText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
