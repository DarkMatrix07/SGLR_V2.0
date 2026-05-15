import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import OfficerForm from '../../../components/OfficerForm';
import Spinner from '../../../components/Spinner';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';

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
    if (!officer) return (
        <View style={styles.center}><Text style={styles.text}>Officer not found</Text></View>
    );
    return <OfficerForm initial={officer} />;
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    text: { color: colors.textMuted, fontSize: 16 },
});
