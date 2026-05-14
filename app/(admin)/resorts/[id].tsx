import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import ResortForm from '../../../components/ResortForm';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { Resort } from '../../../lib/types';

export default function EditResort() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [resort, setResort] = useState<Resort | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from('resorts').select('*').eq('id', id).maybeSingle().then(({ data }) => {
            setResort(data as Resort | null);
            setLoading(false);
        });
    }, [id]);

    if (loading) return <Spinner />;
    if (!resort) return null;
    return <ResortForm initial={resort} />;
}
