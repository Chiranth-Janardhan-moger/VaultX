import Screen from "@/components/Screen";
import { useTheme } from "@/context/ThemeProvider";
import { vaultExists } from "@/lib/vault";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();

  const fade = React.useRef(new Animated.Value(0)).current;
  const rise = React.useRef(new Animated.Value(14)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;

  // Check if vault exists on mount and redirect accordingly
  React.useEffect(() => {
    (async () => {
      const exists = await vaultExists();
      if (exists) {
        // Vault exists, go directly to login
        router.replace("/login");
      } else {
        // No vault, show welcome screen
        Animated.parallel([
          Animated.timing(fade, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(rise, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ])
        ).start();
      }
    })();
  }, [router, fade, rise, pulse]);

  const onContinue = React.useCallback(async () => {
    router.push("/setup");
  }, [router]);

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View
          style={{
            opacity: fade,
            transform: [
              { translateY: rise },
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05],
                }),
              },
            ],
          }}
        >
          <View style={[styles.logoWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed" size={28} color={colors.primary} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to Password Manager</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>It's completely offline</Text>
          <Text style={[styles.note, { color: colors.mutedText }]}>Your data never leaves this device.</Text>
        </Animated.View>

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onContinue}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
  },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 16, marginBottom: 6, textAlign: "center" },
  note: { fontSize: 14, marginBottom: 26, textAlign: "center" },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 4,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
