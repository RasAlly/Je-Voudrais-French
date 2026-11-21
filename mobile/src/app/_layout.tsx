import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfilePicker } from "../components/ProfilePicker";
import { ProfileProvider, useProfile } from "../lib/profile";
import { initAudio } from "../lib/speech";
import { colors } from "../theme";

export default function RootLayout() {
  useEffect(() => {
    initAudio();
  }, []);

  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <StatusBar style="dark" />
        <App />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

function App() {
  const { profile, loading } = useProfile();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Keyed by profile: switching learners remounts every screen so it reloads their progress. */}
      <Stack
        key={profile?.id ?? "none"}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[id]" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        <Stack.Screen name="study-session" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        <Stack.Screen name="custom/[unit]" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        <Stack.Screen name="daily-word" options={{ presentation: "modal" }} />
        <Stack.Screen name="flashcards" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
      </Stack>
      {/* Cover the app until a learner is chosen (blank while reading the saved choice). */}
      {!profile && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>{!loading && <ProfilePicker />}</View>
      )}
    </View>
  );
}
