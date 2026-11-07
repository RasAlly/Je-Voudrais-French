import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initAudio } from "../lib/speech";
import { colors } from "../theme";

export default function RootLayout() {
  useEffect(() => {
    initAudio();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[id]" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        <Stack.Screen name="review-session" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        <Stack.Screen name="study-session" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        <Stack.Screen name="flashcards" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
