import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ResortForm from '../../../components/ResortForm';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';
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
    if (!resort) return (
        <View style={styles.center}><Text style={styles.text}>Resort not found</Text></View>
    );
    return <ResortForm initial={resort} />;
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    text: { color: colors.textMuted, fontSize: 16 },
});
