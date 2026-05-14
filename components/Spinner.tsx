import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

type Props = {
    text?: string;
};

export default function Spinner({ text }: Props) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            {text ? <Text style={styles.text}>{text}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    text: { color: colors.textMuted, fontSize: 14 },
});
