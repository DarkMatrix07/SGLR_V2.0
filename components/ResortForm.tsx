import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { logAudit } from '../lib/audit';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Resort } from '../lib/types';

type Props = {
    initial?: Resort | null;
};

export default function ResortForm({ initial }: Props) {
    const router = useRouter();
    const isEdit = !!initial;
    const [serialNo, setSerialNo] = useState(initial ? String(initial.serial_no) : '');
    const [name, setName] = useState(initial?.name ?? '');
    const [area, setArea] = useState(initial?.area ?? '');
    const [ownerName, setOwnerName] = useState(initial?.owner_name ?? '');
    const [ownerPhone, setOwnerPhone] = useState(initial?.owner_phone ?? '');
    const [roomCount, setRoomCount] = useState(initial?.room_count != null ? String(initial.room_count) : '');
    const [active, setActive] = useState(initial?.is_active ?? true);
    const [saving, setSaving] = useState(false);

    async function save() {
        const sn = parseInt(serialNo);
        if (!Number.isFinite(sn) || sn < 1) { Alert.alert('Invalid', 'Serial number must be a positive integer.'); return; }
        if (!name.trim()) { Alert.alert('Invalid', 'Name is required.'); return; }
        if (!area.trim()) { Alert.alert('Invalid', 'Area is required.'); return; }

        setSaving(true);
        const payload = {
            serial_no: sn,
            name: name.trim(),
            area: area.trim(),
            owner_name: ownerName.trim() || null,
            owner_phone: ownerPhone.trim() || null,
            room_count: roomCount ? parseInt(roomCount) || null : null,
            is_active: active,
        };

        const { data, error } = isEdit
            ? await supabase.from('resorts').update(payload).eq('id', initial!.id).select().single()
            : await supabase.from('resorts').insert(payload).select().single();

        if (error) {
            console.error('Resort save failed:', error);
            const msg = error.code === '23505'
                ? 'A resort with this serial number already exists.'
                : error.code === '42501'
                    ? 'Permission denied. RLS policy is blocking this write.'
                    : (error.message || 'Could not save resort.');
            Alert.alert('Save Failed', msg);
            setSaving(false);
            return;
        }

        await logAudit(isEdit ? 'update_resort' : 'create_resort', 'resort', data.id, { name: data.name, serial_no: data.serial_no });
        router.back();
    }

    async function deactivate() {
        Alert.alert('Deactivate', `Hide ${initial?.name ?? 'this resort'} from inspectors?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Deactivate', style: 'destructive', onPress: async () => {
                    const { error } = await supabase.from('resorts').update({ is_active: false }).eq('id', initial!.id);
                    if (error) { Alert.alert('Failed', error.message); return; }
                    await logAudit('deactivate_resort', 'resort', initial!.id);
                    router.back();
                }
            }
        ]);
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Field label="Serial Number">
                <TextInput style={styles.input} value={serialNo} onChangeText={(v) => setSerialNo(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="1, 2, 3 ..." placeholderTextColor={colors.textMuted} />
            </Field>
            <Field label="Resort Name">
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Backwater Resort" placeholderTextColor={colors.textMuted} />
            </Field>
            <Field label="Area">
                <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="Town / locality" placeholderTextColor={colors.textMuted} />
            </Field>
            <Field label="Owner Name (optional)">
                <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} placeholder="Owner full name" placeholderTextColor={colors.textMuted} />
            </Field>
            <Field label="Owner Phone (optional)">
                <TextInput style={styles.input} value={ownerPhone} onChangeText={setOwnerPhone} keyboardType="phone-pad" placeholder="+91..." placeholderTextColor={colors.textMuted} />
            </Field>
            <Field label="Rooms (optional)">
                <TextInput style={styles.input} value={roomCount} onChangeText={(v) => setRoomCount(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Number of rooms" placeholderTextColor={colors.textMuted} />
            </Field>

            <View style={styles.activeRow}>
                <Text style={styles.label}>Active</Text>
                <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
            </View>

            <Pressable style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Resort'}</Text>
            </Pressable>

            {isEdit && initial?.is_active && (
                <Pressable style={[styles.dangerBtn, { marginTop: 24 }]} onPress={deactivate}>
                    <Text style={styles.dangerBtnText}>Deactivate Resort</Text>
                </Pressable>
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
    input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, fontSize: 16, color: colors.textPrimary },
    activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
    saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    dangerBtn: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center' },
    dangerBtnText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
