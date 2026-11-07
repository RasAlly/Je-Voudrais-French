import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Exercise } from "../lib/exercises";
import { stopSpeaking } from "../lib/speech";
import { colors, fonts, radius, space } from "../theme";
import { Arrange, ChooseEn, Intro, ListenChoose, type Result, Speak, TypeFr } from "./Exercises";
import { Button, ProgressBar } from "./ui";

export type SessionSummary = {
  /** itemId → answered correctly on the first try */
  firstTry: Record<string, boolean>;
  score: number; // 0..100
  xp: number;
};

type Props = {
  exercises: Exercise[];
  onFinish: (summary: SessionSummary) => Promise<void>;
};

export function Session({ exercises, onFinish }: Props) {
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Result | null>(null);
  const [speakingOff, setSpeakingOff] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});

  const ex = queue[index];
  const progress = index / queue.length;

  const vals = Object.values(firstTry);
  const score = vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 100;
  const summary: SessionSummary = { firstTry, score, xp: 10 + Math.round(score / 10) };

  const advance = (skipSpeak = speakingOff) => {
    stopSpeaking();
    setFeedback(null);
    let next = index + 1;
    // Skip remaining speaking exercises once the user says they can't speak.
    while (skipSpeak && queue[next]?.kind === "speak") next++;
    if (next >= queue.length) setDone(true);
    else setIndex(next);
  };

  const handleResult = (r: Result) => {
    setFirstTry((f) => (ex.item.id in f ? f : { ...f, [ex.item.id]: r.correct }));
    Haptics.notificationAsync(
      r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    // Missed items come back at the end of the session.
    if (!r.correct) setQueue((q) => [...q, { ...ex }]);
    setFeedback(r);
  };

  const skipSpeaking = () => {
    setSpeakingOff(true);
    advance(true);
  };

  if (done) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.doneBox}>
          <Text style={s.doneEmoji}>☕️</Text>
          <Text style={s.doneTitle}>Bien joué !</Text>
          <Text style={s.doneSub}>Lesson complete</Text>
          <View style={s.statsRow}>
            <Stat label="Accuracy" value={`${summary.score}%`} />
            <Stat label="XP" value={`+${summary.xp}`} />
          </View>
        </View>
        <Button
          title="Continue"
          loading={saving}
          onPress={async () => {
            setSaving(true);
            try {
              await onFinish(summary);
            } finally {
              setSaving(false);
            }
            router.back();
          }}
        />
      </SafeAreaView>
    );
  }

  const common = { locked: !!feedback, onResult: handleResult };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => (stopSpeaking(), router.back())} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <ProgressBar value={progress} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.body}>
          {ex.kind === "intro" && <Intro key={index} ex={ex} onContinue={() => advance()} />}
          {ex.kind === "choose_en" && <ChooseEn key={index} {...common} ex={ex} />}
          {ex.kind === "listen_choose" && <ListenChoose key={index} {...common} ex={ex} />}
          {ex.kind === "type_fr" && <TypeFr key={index} {...common} ex={ex} />}
          {ex.kind === "arrange" && <Arrange key={index} {...common} ex={ex} />}
          {ex.kind === "speak" && <Speak key={index} {...common} ex={ex} onSkip={skipSpeaking} />}
        </View>
      </KeyboardAvoidingView>

      {feedback && (
        <View style={[s.feedback, { backgroundColor: feedback.correct ? colors.successSoft : colors.errorSoft }]}>
          <Text style={[s.feedbackTitle, { color: feedback.correct ? colors.success : colors.error }]}>
            {feedback.correct ? "Très bien !" : "Pas tout à fait"}
          </Text>
          {!feedback.correct && feedback.answer && (
            <Text style={s.feedbackAnswer}>Correct answer: {feedback.answer}</Text>
          )}
          {feedback.note && <Text style={s.feedbackNote}>{feedback.note}</Text>}
          <Button
            title="Continue"
            onPress={() => advance()}
            style={{ backgroundColor: feedback.correct ? colors.success : colors.error, borderColor: "transparent" }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingBottom: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  body: { flex: 1, paddingTop: space.md },
  feedback: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  feedbackTitle: { fontSize: 20, fontWeight: "700" },
  feedbackAnswer: { fontSize: 17, color: colors.text, fontFamily: fonts.serif },
  feedbackNote: { fontSize: 15, color: colors.textMuted, marginBottom: space.xs },
  doneBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  doneEmoji: { fontSize: 56 },
  doneTitle: { fontSize: 34, fontFamily: fonts.serif, color: colors.text },
  doneSub: { fontSize: 16, color: colors.textMuted },
  statsRow: { flexDirection: "row", gap: space.md, marginTop: space.lg },
  stat: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
  },
  statValue: { fontSize: 24, fontWeight: "700", color: colors.primary },
  statLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
