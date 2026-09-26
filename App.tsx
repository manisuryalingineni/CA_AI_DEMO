import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors } from './src/theme/colors';

export default function App() {
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 360;
  const horizontalPadding = isSmallScreen ? 16 : width < 600 ? 20 : 24;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>CA AI</Text>
        <Text style={styles.headerSubtitle}>Retail</Text>
      </View>

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.title}>CA AI Retail</Text>

          <Text style={styles.description}>
            Business management made simple.
          </Text>

          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              Responsive layout is working
            </Text>
          </View>
        </View>

        <Text style={styles.deviceInfo}>
          Screen width: {Math.round(width)} px
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 18,
  },

  headerTitle: {
    color: colors.card,
    fontSize: 24,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  content: {
    flex: 1,
    paddingTop: 24,
  },

  card: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',

    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,

    borderWidth: 1,
    borderColor: colors.border,
  },

  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },

  description: {
    color: colors.mutedText,
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },

  statusBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#E8F6F3',
  },

  statusText: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: '600',
  },

  deviceInfo: {
    marginTop: 12,
    color: colors.mutedText,
    fontSize: 12,
    textAlign: 'center',
  },
});