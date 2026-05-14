import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { logAudit } from '../lib/audit';
import { supabase } from '../lib/supabase';
import { CATEGORIES, ChecklistItem, SUBCATEGORIES, SUB_LABELS } from '../lib/checklist';
import { colors } from '../lib/theme';

type Props = { initial?: ChecklistItem | null };

const INPUT_TYPES = ['yes_no', 'single_select', 'negative_select', 'numerical'] as const;

export default function ChecklistItemForm({ initial }: Props) {
    const router = useRouter();
    const isEdit = !!initial;

    const [id, setId] = useState(initial?.id ?? '');
    const [category, setCategory] = useState<string>(initial?.category ?? 'A');
    const [subcategory, setSubcategory] = useState<string>(initial?.subcategory ?? 'infrastructure');
    const [label, setLabel] = useState(initial?.label ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [inputType, setInputType] = useState<string>(initial?.input_type ?? 'yes_no');
    const [minMarks, setMinMarks] = useState(String(initial?.min_marks ?? 0));
    const [maxMarks, setMaxMarks] = useState(String(initial?.max_marks ?? 0));
    const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
    const [options, setOptions] = useState<any[]>(initial?.options ?? []);
    const [conditionParent, setConditionParent] = useState<string>(initial?.visibility_condition?.dependsOn ?? '');
    const [conditionShowWhen, setConditionShowWhen] = useState<string>(initial?.visibility_condition?.showWhen ?? '');
    const [saving, setSaving] = useState(false);

    async function save() {
        if (!id.trim()) { Alert.alert('Invalid', 'ID is required.'); return; }
        if (!label.trim()) { Alert.alert('Invalid', 'Label is required.'); return; }
        const min = parseInt(minMarks) || 0;
        const max = parseInt(maxMarks) || 0;
        if (max < min) { Alert.alert('Invalid', 'Max marks cannot be less than min.'); return; }

        setSaving(true);
        const payload: any = {
            id: id.trim(),
            category,
            subcategory,
            label: label.trim(),
            description: description.trim() || null,
            input_type: inputType,
            min_marks: min,
            max_marks: max,
            sort_order: parseInt(sortOrder) || 0,
            options: needsOptions(inputType) ? options : null,
            visibility_condition: conditionParent.trim()
                ? { dependsOn: conditionParent.trim(), showWhen: conditionShowWhen.trim() || true }
                : null,
        };

        const { data, error } = isEdit
            ? await supabase.from('checklist_items').update(payload).eq('id', initial!.id).select().single()
            : await supabase.from('checklist_items').insert(payload).select().single();

        if (error) {
            const msg = error.code === '23505' ? 'A checklist item with this ID already exists.' : error.message;
            Alert.alert('Save Failed', msg);
            setSaving(false);
            return;
        }
        await logAudit(isEdit ? 'update_checklist_item' : 'create_checklist_item', 'checklist_item', data.id, { label: data.label });
        router.back();
    }

    async function remove() {
        Alert.alert('Delete', `Delete item "${initial?.label}"?\n\nThis cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    const { error } = await supabase.from('checklist_items').delete().eq('id', initial!.id);
                    if (error) { Alert.alert('Failed', error.message); return; }
                    await logAudit('delete_checklist_item', 'checklist_item', initial!.id);
                    router.back();
                }
            }
        ]);
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Field label="ID">
                <TextInput style={styles.input} value={id} onChangeText={setId} editable={!isEdit} placeholder="1, 2, 3_desludge..." placeholderTextColor={colors.textMuted} />
                {isEdit && <Text style={styles.hint}>ID is immutable after creation.</Text>}
            </Field>

            <Field label="Category">
                <Chips values={CATEGORIES} selected={category} onSelect={setCategory} />
            </Field>
            <Field label="Subcategory">
                <Chips values={SUBCATEGORIES} selected={subcategory} onSelect={setSubcategory} renderLabel={(v) => SUB_LABELS[v]} />
            </Field>

            <Field label="Question / Label">
                <TextInput style={[styles.input, { minHeight: 60 }]} value={label} onChangeText={setLabel} multiline placeholder="Short, scannable question" placeholderTextColor={colors.textMuted} />
            </Field>

            <Field label="Description (optional)">
                <TextInput style={[styles.input, { minHeight: 60 }]} value={description} onChangeText={setDescription} multiline placeholder="Inspection guidance, what to look for..." placeholderTextColor={colors.textMuted} />
            </Field>

            <Field label="Input Type">
                <Chips values={INPUT_TYPES as unknown as string[]} selected={inputType} onSelect={setInputType} />
            </Field>

            <Field label="Min / Max Marks">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={minMarks} onChangeText={setMinMarks} keyboardType="numbers-and-punctuation" placeholder="Min (often 0)" placeholderTextColor={colors.textMuted} />
                    <TextInput style={[styles.input, { flex: 1 }]} value={maxMarks} onChangeText={setMaxMarks} keyboardType="numbers-and-punctuation" placeholder="Max" placeholderTextColor={colors.textMuted} />
                </View>
            </Field>

            <Field label="Sort Order">
                <TextInput style={styles.input} value={sortOrder} onChangeText={(v) => setSortOrder(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="10, 20, 30..." placeholderTextColor={colors.textMuted} />
                <Text style={styles.hint}>Use gaps (10, 20, 30) so you can insert items later without renumbering.</Text>
            </Field>

            {needsOptions(inputType) && (
                <OptionsEditor type={inputType} options={options} onChange={setOptions} />
            )}

            <Field label="Conditional Visibility (optional)">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={conditionParent} onChangeText={setConditionParent} placeholder="Depends on item ID" placeholderTextColor={colors.textMuted} />
                    <TextInput style={[styles.input, { flex: 1 }]} value={conditionShowWhen} onChangeText={setConditionShowWhen} placeholder="Show when value =" placeholderTextColor={colors.textMuted} />
                </View>
                <Text style={styles.hint}>Leave blank for always-visible. Example: parent=3, value=septic_tank.</Text>
            </Field>

            <Pressable style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Item'}</Text>
            </Pressable>

            {isEdit && (
                <Pressable style={[styles.dangerBtn, { marginTop: 24 }]} onPress={remove}>
                    <Text style={styles.dangerBtnText}>Delete Item</Text>
                </Pressable>
            )}
        </ScrollView>
    );
}

function needsOptions(t: string) { return t === 'single_select' || t === 'negative_select'; }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
}

function Chips({ values, selected, onSelect, renderLabel }: {
    values: readonly string[] | string[];
    selected: string;
    onSelect: (v: string) => void;
    renderLabel?: (v: string) => string;
}) {
    return (
        <View style={styles.chipRow}>
            {values.map(v => (
                <Pressable key={v} style={[styles.chip, selected === v && styles.chipActive]} onPress={() => onSelect(v)}>
                    <Text style={[styles.chipText, selected === v && styles.chipTextActive]}>{renderLabel ? renderLabel(v) : v}</Text>
                </Pressable>
            ))}
        </View>
    );
}

function OptionsEditor({ type, options, onChange }: { type: string; options: any[]; onChange: (o: any[]) => void }) {
    function addOption() {
        if (type === 'single_select') {
            onChange([...options, { label: '', marks: 0 }]);
        } else if (type === 'negative_select') {
            onChange([...options, { label: '', subScoreMax: 0 }]);
        }
    }
    function updateOption(idx: number, patch: any) {
        onChange(options.map((o, i) => i === idx ? { ...o, ...patch } : o));
    }
    function removeOption(idx: number) {
        onChange(options.filter((_, i) => i !== idx));
    }

    return (
        <View style={styles.field}>
            <Text style={styles.label}>Options</Text>
            {options.map((opt, idx) => (
                <View key={idx} style={styles.optionRow}>
                    <TextInput
                        style={[styles.input, { flex: 2 }]}
                        value={opt.label ?? ''}
                        onChangeText={(v) => updateOption(idx, { label: v })}
                        placeholder="Option label"
                        placeholderTextColor={colors.textMuted}
                    />
                    {type === 'single_select' ? (
                        <TextInput
                            style={[styles.input, { width: 70 }]}
                            value={String(opt.marks ?? 0)}
                            onChangeText={(v) => updateOption(idx, { marks: parseInt(v) || 0 })}
                            keyboardType="numbers-and-punctuation"
                            placeholder="Marks"
                            placeholderTextColor={colors.textMuted}
                        />
                    ) : (
                        <TextInput
                            style={[styles.input, { width: 90 }]}
                            value={opt.marks != null ? String(opt.marks) : String(opt.subScoreMax ?? 0)}
                            onChangeText={(v) => {
                                const num = parseInt(v) || 0;
                                if (num < 0) updateOption(idx, { marks: num, subScoreMax: undefined });
                                else updateOption(idx, { subScoreMax: num, marks: undefined });
                            }}
                            keyboardType="numbers-and-punctuation"
                            placeholder="Max/-pts"
                            placeholderTextColor={colors.textMuted}
                        />
                    )}
                    <Pressable style={styles.removeBtn} onPress={() => removeOption(idx)}>
                        <Text style={styles.removeBtnText}>×</Text>
                    </Pressable>
                </View>
            ))}
            <Pressable style={styles.addOptionBtn} onPress={addOption}>
                <Text style={styles.addOptionText}>+ Add option</Text>
            </Pressable>
            {type === 'negative_select' && (
                <Text style={styles.hint}>Negative-select: use a negative value for penalty options, positive for sub-score max.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
    hint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.textPrimary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' },
    chipTextActive: { color: '#fff' },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    removeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.dangerTintLight, justifyContent: 'center', alignItems: 'center' },
    removeBtnText: { color: colors.danger, fontSize: 20, fontWeight: '700' },
    addOptionBtn: { padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center' },
    addOptionText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    dangerBtn: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center' },
    dangerBtnText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
