import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ChecklistItemForm from '../../../components/ChecklistItemForm';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { ChecklistItem } from '../../../lib/checklist';
import { colors } from '../../../lib/theme';

export default function EditChecklistItem() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [item, setItem] = useState<ChecklistItem | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from('checklist_items').select('*').eq('id', id).maybeSingle().then(({ data }) => {
            setItem(data as ChecklistItem | null);
            setLoading(false);
        });
    }, [id]);

    if (loading) return <Spinner />;
    if (!item) return (
        <View style={styles.center}><Text style={styles.text}>Checklist item not found</Text></View>
    );
    return <ChecklistItemForm initial={item} />;
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    text: { color: colors.textMuted, fontSize: 16 },
});
