import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddToStudy, MakeFlashcard } from "../components/MakeFlashcard";
import { ErrorState, Loading } from "../components/States";
import { SpeakButtons } from "../components/ui";
import { api, type DailyWord } from "../lib/api";
import { speakFrench, stopSpeaking } from "../lib/speech";
import { colors, fonts, radius, space } from "../theme";

function close() {
  stopSpeaking();
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function DailyWordScreen() {
  const [word, setWord] = useState<DailyWord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .dailyWord()
      .then((w) => {
        setWord(w);
        speakFrench(w.fr);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  useEffect(() => () => stopSpeaking(), []);

  if (error) return <ErrorState message={error} onRetry={() => (setError(null), load())} />;
  if (!word) return <Loading />;

  const details = [word.pos, word.gender].filter(Boolean).join(" · ");
  const card = { fr: word.fr, en: word.en, note: word.note || undefined };

  return (
    <SafeAreaView style={s.screen} edges={["bottom"]}>
      <View style={s.top}>
        <Text style={s.label}>Mot du jour · {word.theme}</Text>
        <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <Text style={s.word}>{word.fr}</Text>
          {!!details && <Text style={s.details}>{details}</Text>}
          <SpeakButtons text={word.fr} size="lg" />
          <Text style={s.en}>{word.en}</Text>
        </View>

        {!!word.definitionFr && (
          <View style={s.card}>
            <Text style={s.cardLabel}>Définition</Text>
            <Text style={s.definition}>{word.definitionFr}</Text>
          </View>
        )}

        {!!word.exampleFr && (
          <Pressable style={s.card} onPress={() => speakFrench(word.exampleFr)}>
            <View style={s.cardTop}>
              <Text style={s.cardLabel}>Exemple</Text>
              <Ionicons name="volume-medium-outline" size={18} color={colors.primary} />
            </View>
            <Text style={s.example}>{word.exampleFr}</Text>
            <Text style={s.exampleEn}>{word.exampleEn}</Text>
          </Pressable>
        )}

        {!!word.note && (
          <View style={s.tip}>
            <Ionicons name="bulb-outline" size={16} color={colors.primaryDark} />
            <Text style={s.tipText}>{word.note}</Text>
          </View>
        )}

        {word.wiktionary && (
          <Pressable onPress={() => Linking.openURL(word.wiktionary!)} style={s.link}>
            <Text style={s.linkText}>See it in the Wiktionnaire</Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </Pressable>
        )}
      </ScrollView>

      <View style={s.actions}>
        <MakeFlashcard variant="button" word={card} style={{ flex: 1 }} />
        <AddToStudy word={card} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.md },
  label: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, fontWeight: "600" },
  content: { gap: space.md, paddingBottom: space.lg },
  hero: { alignItems: "center", gap: space.md, paddingVertical: space.lg },
  word: { fontFamily: fonts.serif, fontSize: 44, color: colors.text, textAlign: "center" },
  details: { fontSize: 14, color: colors.textMuted, marginTop: -space.sm },
  en: { fontSize: 22, color: colors.primaryDark, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.xs,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, fontWeight: "600" },
  definition: { fontFamily: fonts.serif, fontSize: 18, color: colors.text, lineHeight: 26 },
  example: { fontFamily: fonts.serif, fontSize: 18, color: colors.text, lineHeight: 26 },
  exampleEn: { fontSize: 15, color: colors.textMuted },
  tip: {
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: space.md,
  },
  tipText: { flex: 1, fontSize: 14, color: colors.primaryDark },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingVertical: space.sm,
  },
  linkText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  actions: { flexDirection: "row", gap: space.sm, paddingVertical: space.sm },
});
