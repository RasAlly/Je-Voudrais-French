import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SPEAK_PASS } from "../../components/Exercises";
import { MakeFlashcard } from "../../components/MakeFlashcard";
import { ErrorState, Loading } from "../../components/States";
import { Button, FrenchText, ScreenHeader, SpeakButtons } from "../../components/ui";
import type { Item } from "../../lib/api";
import { api } from "../../lib/api";
import { similarity, wordMatches } from "../../lib/compare";
import { useLoad } from "../../lib/useLoad";
import { useSpeechToText } from "../../lib/useRecorder";
import { colors, fonts, radius, space } from "../../theme";

/** Free pronunciation practice: hear a phrase, say it, get word-by-word feedback. */
export default function SpeakScreen() {
  const { data, error, loading, reload } = useLoad(() => api.items());
  const [scope, setScope] = useState<"learned" | "all">("learned");
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const stt = useSpeechToText();

  const deck = useMemo(() => {
    const all = data?.items ?? [];
    const learned = all.filter((i) => i.learned);
    const list = scope === "learned" && learned.length ? learned : all;
    // Phrases first — they're the best speaking practice.
    return [...list].sort((a, b) => b.fr.split(" ").length - a.fr.split(" ").length);
  }, [data, scope]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data && loading) return <Loading />;
  if (!deck.length) return null;

  const item: Item = deck[index % deck.length];
  const score = heard != null ? similarity(heard, item.fr) : null;

  const next = () => {
    setHeard(null);
    setIndex(Math.floor(Math.random() * deck.length));
  };

  const toggle = async () => {
    if (stt.state === "recording") {
      const text = await stt.stop();
      if (text == null) return;
      setHeard(text);
      const ok = similarity(text, item.fr) >= SPEAK_PASS;
      Haptics.notificationAsync(
        ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    } else if (stt.state === "idle") {
      setHeard(null);
      await stt.start();
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScreenHeader title="Prononciation" />
      <View style={s.header}>
        <Text style={s.muted}>Say a phrase, get word-by-word feedback</Text>
        <View style={s.toggle}>
          {(["learned", "all"] as const).map((k) => (
            <Pressable key={k} onPress={() => (setScope(k), setIndex(0), setHeard(null))} style={[s.seg, scope === k && s.segOn]}>
              <Text style={[s.segText, scope === k && s.segTextOn]}>{k === "learned" ? "My words" : "All"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.card}>
        {heard != null ? (
          <Text style={s.words}>
            {wordMatches(item.fr, heard).map((w, i) => (
              <Text key={i} style={{ color: w.ok ? colors.success : colors.error }}>
                {w.word}{" "}
              </Text>
            ))}
          </Text>
        ) : (
          <FrenchText size={32}>{item.fr}</FrenchText>
        )}
        <Text style={s.en}>{item.en}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <SpeakButtons text={item.fr} />
          <MakeFlashcard item={item} />
        </View>
      </View>

      <View style={s.center}>
        {score != null && (
          <View style={[s.scoreChip, { backgroundColor: score >= SPEAK_PASS ? colors.successSoft : colors.errorSoft }]}>
            <Text style={{ color: score >= SPEAK_PASS ? colors.success : colors.error, fontWeight: "700" }}>
              {Math.round(score * 100)}% match
            </Text>
          </View>
        )}
        {heard != null && <Text style={s.hint}>Heard: “{heard || "…"}”</Text>}
        <Pressable
          onPress={toggle}
          disabled={stt.state === "transcribing"}
          style={({ pressed }) => [s.mic, stt.state === "recording" && { backgroundColor: colors.error }, pressed && { opacity: 0.85 }]}
        >
          {stt.state === "transcribing" ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Ionicons name={stt.state === "recording" ? "stop" : "mic"} size={40} color={colors.onPrimary} />
          )}
        </Pressable>
        <Text style={s.hint}>{stt.state === "recording" ? "Listening… tap to stop" : "Tap to record"}</Text>
        {stt.error && <Text style={[s.hint, { color: colors.error }]}>{stt.error}</Text>}
      </View>

      <Button title="Next phrase" variant="secondary" icon="shuffle" onPress={next} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: space.lg, gap: space.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muted: { flex: 1, color: colors.textMuted, fontSize: 13 },
  toggle: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 3 },
  seg: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.surface },
  segText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  segTextOn: { color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    alignItems: "center",
    gap: space.md,
  },
  words: { fontSize: 32, fontFamily: fonts.serif, textAlign: "center" },
  en: { color: colors.textMuted, fontSize: 17, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  mic: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { color: colors.textMuted, fontSize: 15, textAlign: "center" },
  scoreChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill },
});
