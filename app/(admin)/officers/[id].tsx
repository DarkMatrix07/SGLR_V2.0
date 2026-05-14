import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import OfficerForm from '../../../components/OfficerForm';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';

export default function EditOfficer() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [officer, setOfficer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from('officers').select('*').eq('id', id).maybeSingle().then(({ data }) => {
            setOfficer(data);
            setLoading(false);
        });
    }, [id]);

    if (loading) return <Spinner />;
    if (!officer) return null;
    return <OfficerForm initial={officer} />;
}
