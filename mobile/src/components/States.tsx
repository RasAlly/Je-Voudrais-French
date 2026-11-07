import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { BASE_URL } from "../lib/api";
import { colors, space } from "../theme";
import { Button, Center } from "./ui";

export function Loading() {
  return (
    <Center>
      <ActivityIndicator color={colors.primary} />
    </Center>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Center>
      <Text style={s.title}>Can&apos;t reach the server</Text>
      <Text style={s.body}>
        {message}
        {"\n"}
        {BASE_URL}
      </Text>
      <Button title="Try again" variant="secondary" onPress={onRetry} />
    </Center>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "600", color: colors.text },
  body: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginBottom: space.sm },
});
