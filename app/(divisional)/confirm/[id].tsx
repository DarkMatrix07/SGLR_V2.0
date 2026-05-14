import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export default function Confirmation() {
    const router = useRouter();

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (router.canGoBack()) router.back();
            else router.replace('/(divisional)');
            return true;
        });
        return () => backHandler.remove();
    }, [router]);

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.title}>Inspection Submitted</Text>
                <Text style={styles.subtitle}>Your inspection has been submitted successfully and is now pending review by the District Committee.</Text>
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
    subtitle: { fontSize: 14, color: '#8A9BAE', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    button: { backgroundColor: '#0D9DA8', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});