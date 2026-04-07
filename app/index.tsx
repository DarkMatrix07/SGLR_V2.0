import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function RolePicker() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SGLR Rating</Text>
      <Text style={styles.subtitle}>Select Role (Dev Mode)</Text>

      <TouchableOpacity style={styles.btn} onPress={() => router.push('/(divisional)')}>
        <Text style={styles.btnText}>Divisional Officer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#0D7377' }]} onPress={() => router.push('/(district)')}>
        <Text style={styles.btnText}>District Officer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF4F5', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#0D7377', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8A9BAE', textAlign: 'center', marginBottom: 40 },
  btn: { backgroundColor: '#0D9DA8', padding: 18, borderRadius: 20, marginBottom: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});