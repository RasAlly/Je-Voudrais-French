import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/ui";
import { api } from "../../../lib/api";
import { GRAMMAR } from "../../../lib/grammar";
import { useLoad } from "../../../lib/useLoad";
import { colors, fonts, radius, space } from "../../../theme";

export default function GrammarScreen() {
  // Progress is optional: the topics are built into the app, so they show even offline.
  const { data } = useLoad(() => api.grammarProgress());
  const progress = data?.progress ?? {};

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={{ paddingHorizontal: space.lg }}>
        <ScreenHeader title="Grammaire" />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {GRAMMAR.map((t, i) => {
          const p = progress[t.id];
          return (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/practice/grammar/${t.id}`)}
              style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
            >
              <View style={[s.badge, p && s.badgeDone]}>
                {p ? (
                  <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                ) : (
                  <Text style={s.badgeText}>{i + 1}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.title}>{t.title}</Text>
                  <Text style={s.en}>{t.en}</Text>
                </View>
                <Text style={s.summary}>{t.summary}</Text>
              </View>
              {p ? (
                <Text style={s.best}>{p.bestScore}%</Text>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDone: { backgroundColor: colors.success },
  badgeText: { fontSize: 16, fontWeight: "700", color: colors.primary },
  titleRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: space.sm },
  title: { fontFamily: fonts.serif, fontSize: 19, color: colors.text },
  en: { fontSize: 13, color: colors.textMuted },
  summary: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  best: { fontSize: 13, color: colors.success, fontWeight: "600" },
});
