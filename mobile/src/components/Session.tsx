import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { type ComponentProps, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { type Exercise, KIND_LABELS } from "../lib/exercises";
import { stopSpeaking } from "../lib/speech";
import { colors, fonts, radius, space } from "../theme";
import { Arrange, ChooseEn, Intro, ListenChoose, type Result, Speak, TypeFr } from "./Exercises";
import { Button, ProgressBar } from "./ui";

export type SessionSummary = {
  /** itemId → answered correctly on the first try */
  firstTry: Record<string, boolean>;
  /** itemId → missed at least once anywhere in the session */
  missed: Record<string, boolean>;
  score: number; // 0..100
  xp: number;
};

type Props = {
  title: string;
  exercises: Exercise[];
  onFinish: (summary: SessionSummary) => Promise<void>;
};

type StepStatus = "seen" | "correct" | "wrong";

const KIND_ICONS: Record<Exercise["kind"], ComponentProps<typeof Ionicons>["name"]> = {
  intro: "sparkles-outline",
  choose_en: "list-outline",
  listen_choose: "ear-outline",
  type_fr: "create-outline",
  dictation: "headset-outline",
  arrange: "apps-outline",
  speak: "mic-outline",
};

/** Leave the session; falls back to home if there's no screen to go back to (e.g. after a reload). */
function exit() {
  stopSpeaking();
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export function Session({ title, exercises, onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Result | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});
  const [missed, setMissed] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Record<number, StepStatus>>({});

  const ex = queue[index];
  const progress = index / queue.length;

  const vals = Object.values(firstTry);
  const score = vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 100;
  const summary: SessionSummary = { firstTry, missed, score, xp: 10 + Math.round(score / 10) };

  const advance = () => {
    stopSpeaking();
    if (ex.kind === "intro") setStatus((st) => ({ ...st, [index]: st[index] ?? "seen" }));
    setFeedback(null);
    const next = index + 1;
    if (next >= queue.length) setDone(true);
    else setIndex(next);
  };

  const jumpTo = (i: number) => {
    stopSpeaking();
    setFeedback(null);
    setIndex(i);
    setTocOpen(false);
  };

  const handleResult = (r: Result) => {
    const id = ex.item.id;
    setFirstTry((f) => (id in f ? f : { ...f, [id]: r.correct }));
    setStatus((st) => ({ ...st, [index]: r.correct ? "correct" : "wrong" }));
    if (!r.correct) setMissed((m) => ({ ...m, [id]: true }));
    if (r.dontKnow) api.addToStudy(id).catch(() => {});
    Haptics.notificationAsync(
      r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    // Missed items come back at the end of the session.
    if (!r.correct) setQueue((q) => [...q, { ...ex }]);
    setFeedback(r);
  };

  if (done) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.doneBox}>
          <Text style={s.doneEmoji}>☕️</Text>
          <Text style={s.doneTitle}>Bien joué !</Text>
          <Text style={s.doneSub}>{title} complete</Text>
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
            exit();
          }}
        />
      </SafeAreaView>
    );
  }

  const common = { locked: !!feedback, onResult: handleResult };

  return (
    <SafeAreaView style={s.screen} edges={["bottom", "left", "right"]}>
      {/* Explicit top inset: keeps the header buttons clear of the notch / Dynamic Island. */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 24) + space.md }]}>
        <IconButton icon="close" label="Close lesson" onPress={exit} />
        <ProgressBar value={progress} />
        <IconButton icon="menu" label="Lesson contents" onPress={() => setTocOpen(true)} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.body}>
          {ex.kind === "intro" && <Intro key={index} ex={ex} onContinue={() => advance()} />}
          {ex.kind === "choose_en" && <ChooseEn key={index} {...common} ex={ex} />}
          {ex.kind === "listen_choose" && <ListenChoose key={index} {...common} ex={ex} />}
          {(ex.kind === "type_fr" || ex.kind === "dictation") && <TypeFr key={index} {...common} ex={ex} />}
          {ex.kind === "arrange" && <Arrange key={index} {...common} ex={ex} />}
          {ex.kind === "speak" && <Speak key={index} {...common} ex={ex} onSkip={() => advance()} />}
        </View>
      </KeyboardAvoidingView>

      {feedback && (
        <View style={[s.feedback, { backgroundColor: feedback.correct ? colors.successSoft : colors.errorSoft }]}>
          <Text style={[s.feedbackTitle, { color: feedback.correct ? colors.success : colors.error }]}>
            {feedback.correct ? "Très bien !" : feedback.dontKnow ? "Pas de souci" : "Pas tout à fait"}
          </Text>
          {!feedback.correct && feedback.answer && (
            <Text style={s.feedbackAnswer}>
              {feedback.dontKnow ? "" : "Correct answer: "}
              {feedback.answer}
            </Text>
          )}
          {feedback.note && <Text style={s.feedbackNote}>{feedback.note}</Text>}
          <Button
            title="Continue"
            onPress={() => advance()}
            style={{ backgroundColor: feedback.correct ? colors.success : colors.error, borderColor: "transparent" }}
          />
        </View>
      )}

      <Contents
        visible={tocOpen}
        title={title}
        queue={queue}
        originalLength={exercises.length}
        current={index}
        status={status}
        onJump={jumpTo}
        onClose={() => setTocOpen(false)}
      />
    </SafeAreaView>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={16}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.iconButton, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <Ionicons name={icon} size={28} color={colors.textMuted} />
    </Pressable>
  );
}

/** Table of contents: every step in the session; tap one to jump to it. */
function Contents({
  visible,
  title,
  queue,
  originalLength,
  current,
  status,
  onJump,
  onClose,
}: {
  visible: boolean;
  title: string;
  queue: Exercise[];
  originalLength: number;
  current: number;
  status: Record<number, StepStatus>;
  onJump: (i: number) => void;
  onClose: () => void;
}) {
  const answered = Object.values(status).filter((v) => v !== "seen").length;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.toc}>
        <View style={s.tocHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.tocEyebrow}>Contents</Text>
            <Text style={s.tocTitle}>{title}</Text>
            <Text style={s.tocMeta}>
              Step {current + 1} of {queue.length} · {answered} answered
            </Text>
          </View>
          <IconButton icon="close" label="Close contents" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
          {queue.map((e, i) => {
            const st = status[i];
            const isCurrent = i === current;
            return (
              <View key={i}>
                {i === originalLength && <Text style={s.tocSection}>Retry</Text>}
                <Pressable
                  onPress={() => onJump(i)}
                  style={({ pressed }) => [s.tocRow, isCurrent && s.tocRowCurrent, pressed && { opacity: 0.7 }]}
                >
                  <Text style={s.tocNum}>{i + 1}</Text>
                  <Ionicons name={KIND_ICONS[e.kind]} size={20} color={isCurrent ? colors.primary : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.tocKind}>{KIND_LABELS[e.kind]}</Text>
                    <Text style={s.tocItem} numberOfLines={1}>
                      {e.item.fr}
                    </Text>
                  </View>
                  {st === "correct" && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                  {st === "wrong" && <Ionicons name="close-circle" size={22} color={colors.error} />}
                  {st === "seen" && <Ionicons name="eye-outline" size={20} color={colors.locked} />}
                  {isCurrent && !st && <Text style={s.tocHere}>Here</Text>}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
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
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingBottom: space.md },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
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
  toc: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingTop: space.lg },
  tocHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.md },
  tocEyebrow: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, fontWeight: "600" },
  tocTitle: { fontFamily: fonts.serif, fontSize: 26, color: colors.text },
  tocMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  tocSection: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  tocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 12,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tocRowCurrent: { backgroundColor: colors.primarySoft, borderBottomColor: "transparent" },
  tocNum: { width: 22, fontSize: 13, color: colors.textMuted, textAlign: "right" },
  tocKind: { fontSize: 12, color: colors.textMuted },
  tocItem: { fontSize: 16, color: colors.text, fontFamily: fonts.serif },
  tocHere: { fontSize: 12, fontWeight: "700", color: colors.primary },
});
