import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import ChecklistItemForm from '../../../components/ChecklistItemForm';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { ChecklistItem } from '../../../lib/checklist';

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
    if (!item) return null;
    return <ChecklistItemForm initial={item} />;
}
