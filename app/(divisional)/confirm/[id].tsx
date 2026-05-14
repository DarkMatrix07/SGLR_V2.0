import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function Confirmation() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [inspectionRef, setInspectionRef] = useState<string | null>(null);
    const [submittedAt, setSubmittedAt] = useState<string | null>(null);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (router.canGoBack()) router.back();
            else router.replace('/(divisional)');
            return true;
        });
        return () => backHandler.remove();
    }, [router]);

    useEffect(() => {
        supabase
            .from('inspections')
            .select('id, created_at')
            .eq('resort_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (data) {
                    setInspectionRef(data.id.slice(0, 8).toUpperCase());
                    setSubmittedAt(data.created_at);
                }
            });
    }, [id]);

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.title}>Inspection Submitted</Text>
                <Text style={styles.subtitle}>Your inspection has been submitted successfully and is now pending review by the District Committee.</Text>

                {inspectionRef && (
                    <View style={styles.refBox}>
                        <Text style={styles.refLabel}>Reference</Text>
                        <Text style={styles.refValue}>{inspectionRef}</Text>
                    </View>
                )}
                {submittedAt && (
                    <Text style={styles.timestamp}>
                        {new Date(submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}

                <TouchableOpacity style={styles.button} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(divisional)'); }}>
                    <Text style={styles.buttonText}>Back to Resorts</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF4F5', justifyContent: 'center', padding: 24 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E0E8EA' },
    checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2ECC7120', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    checkMark: { fontSize: 36, color: '#2ECC71' },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#8A9BAE', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    refBox: { backgroundColor: '#EEF4F5', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, marginBottom: 8, alignItems: 'center' },
    refLabel: { fontSize: 11, color: '#8A9BAE', textTransform: 'uppercase', letterSpacing: 0.8 },
    refValue: { fontSize: 18, fontWeight: '700', color: '#0D7377', letterSpacing: 2, marginTop: 2, fontFamily: 'monospace' },
    timestamp: { fontSize: 12, color: '#8A9BAE', marginBottom: 24 },
    button: { backgroundColor: '#0D9DA8', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
