import { Ionicons } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, space } from "../../theme";

type Drill = {
  title: string;
  en: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  href?: Href;
};

const DRILLS: Drill[] = [
  {
    title: "Traduire",
    en: "Translate",
    description: "Type English or French, then save it or study it",
    icon: "language-outline",
    href: "/practice/translate",
  },
  {
    title: "Article du jour",
    en: "Daily article",
    description: "Today's most-read French Wikipedia article — tap any word",
    icon: "newspaper-outline",
    href: "/practice/article",
  },
  {
    title: "Les nombres",
    en: "Numbers",
    description: "Count to a million, plus prices, times and phone numbers",
    icon: "calculator-outline",
    href: "/practice/numbers",
  },
  {
    title: "Prononciation",
    en: "Pronunciation",
    description: "Say any phrase and get word-by-word feedback",
    icon: "mic-outline",
    href: "/practice/speak",
  },
  {
    title: "Grammaire",
    en: "Grammar",
    description: "Articles, verb conjugation, negation and more",
    icon: "school-outline",
  },
];

export default function PracticeScreen() {
  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Pratique</Text>
        {DRILLS.map((d) => (
          <Pressable
            key={d.title}
            disabled={!d.href}
            onPress={() => d.href && router.push(d.href)}
            style={({ pressed }) => [s.tile, !d.href && s.tileDisabled, pressed && { opacity: 0.85 }]}
          >
            <View style={[s.icon, !d.href && { backgroundColor: colors.locked }]}>
              <Ionicons name={d.icon} size={24} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={s.titleRow}>
                <Text style={s.tileTitle}>{d.title}</Text>
                <Text style={s.tileEn}>{d.en}</Text>
              </View>
              <Text style={s.tileDesc}>{d.description}</Text>
            </View>
            {d.href ? (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            ) : (
              <Text style={s.soon}>Bientôt</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.text, marginBottom: space.xs },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
  },
  tileDisabled: { backgroundColor: "transparent" },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: space.sm },
  tileTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.text },
  tileEn: { fontSize: 13, color: colors.textMuted },
  tileDesc: { fontSize: 14, color: colors.textMuted },
  soon: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
});
