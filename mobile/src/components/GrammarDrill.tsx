import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { normalize, stripAccents } from "../lib/compare";
import { answeredSentence, type GrammarQuestion, type GrammarTopic } from "../lib/grammar";
import { speakFrench, stopSpeaking } from "../lib/speech";
import { colors, fonts, radius, space } from "../theme";
import { Button, Choice, ProgressBar } from "./ui";

const ACCENTS = ["é", "è", "ê", "à", "â", "ç", "ù", "û", "ô", "î", "œ", "'"];

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

type Feedback = { correct: boolean; picked?: string; note?: string };

/**
 * Grade a typed answer. Grammar is about exact forms, so only accents are
 * forgiven (with a note) — "parle" for "parles" is wrong. Typing the whole
 * sentence instead of just the missing word also counts.
 */
function gradeTyped(q: Extract<GrammarQuestion, { kind: "type" }>, input: string): Feedback {
  const given = normalize(input);
  const accepted = [...q.answer, ...(q.sentence.includes("___") ? [answeredSentence(q)] : [])].map(normalize);
  if (accepted.includes(given)) return { correct: true };
  if (accepted.map(stripAccents).includes(stripAccents(given))) return { correct: true, note: "Watch the accents!" };
  return { correct: false };
}

export function GrammarDrill({
  topic,
  length,
  onExit,
  onRetry,
}: {
  topic: GrammarTopic;
  length: number;
  onExit: () => void;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<GrammarQuestion[]>(() => shuffle(topic.questions).slice(0, length));
  const [total] = useState(() => Math.min(length, topic.questions.length));
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [firstTry, setFirstTry] = useState<Map<GrammarQuestion, boolean>>(new Map());
  const [input, setInput] = useState("");

  const q = queue[index];
  const done = index >= queue.length;
  const right = [...firstTry.values()].filter(Boolean).length;
  const score = firstTry.size ? Math.round((right / firstTry.size) * 100) : 0;
  const xp = 10 + Math.round(score / 10);

  // Save once when the drill finishes.
  const saved = useRef(false);
  useEffect(() => {
    if (!done || saved.current) return;
    saved.current = true;
    api.completeGrammar(topic.id, { score, xp }).catch(() => {});
  }, [done, score, xp, topic.id]);

  const answer = (fb: Feedback) => {
    Keyboard.dismiss();
    setFeedback(fb);
    if (!firstTry.has(q)) setFirstTry((m) => new Map(m).set(q, fb.correct));
    if (!fb.correct) setQueue((list) => [...list, q]); // try it again at the end
    Haptics.notificationAsync(
      fb.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    speakFrench(answeredSentence(q));
  };

  const next = () => {
    stopSpeaking();
    setFeedback(null);
    setInput("");
    setIndex((i) => i + 1);
  };

  if (done)
    return (
      <SafeAreaView style={[s.screen, { justifyContent: "space-between" }]}>
        <View style={s.doneBox}>
          <Text style={{ fontSize: 56 }}>📚</Text>
          <Text style={s.doneTitle}>{score >= 80 ? "Excellent !" : score >= 50 ? "Pas mal !" : "Continue !"}</Text>
          <Text style={s.muted}>
            {right} of {firstTry.size} right first time · +{xp} XP
          </Text>
        </View>
        <View style={{ gap: space.sm }}>
          <Button title="Practice again" icon="refresh" variant="secondary" onPress={onRetry} />
          <Button title="Done" onPress={onExit} />
        </View>
      </SafeAreaView>
    );

  const parts = q.sentence.split("___");
  const correctText = q.kind === "choice" ? q.answer : q.answer[0];

  return (
    <SafeAreaView style={s.screen} edges={["bottom", "left", "right"]}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 24) + space.md }]}>
        <Pressable onPress={onExit} hitSlop={16} style={s.close} accessibilityLabel="Stop practice">
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <ProgressBar value={Math.min(firstTry.size, total) / total} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Text style={s.prompt}>{q.prompt}</Text>
          <Pressable onPress={Keyboard.dismiss} accessible={false} style={s.card}>
            <Text style={s.sentence}>
              {parts.length > 1 ? (
                <>
                  {parts[0]}
                  <Text style={[s.blank, feedback && (feedback.correct ? s.blankRight : s.blankWrong)]}>
                    {feedback ? correctText : "____"}
                  </Text>
                  {parts[1]}
                </>
              ) : (
                q.sentence
              )}
            </Text>
            {q.en && <Text style={s.en}>{q.en}</Text>}
          </Pressable>

          {q.kind === "choice" ? (
            <View style={{ gap: space.sm }}>
              {q.options.map((o) => (
                <Choice
                  key={o}
                  label={o}
                  french
                  state={!feedback ? "idle" : o === q.answer ? "correct" : o === feedback.picked ? "wrong" : "idle"}
                  onPress={() => !feedback && answer({ correct: o === q.answer, picked: o })}
                />
              ))}
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                editable={!feedback}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={parts.length > 1 ? "Missing word…" : "Type the sentence…"}
                placeholderTextColor={colors.textMuted}
                style={s.input}
                returnKeyType="done"
                onSubmitEditing={() => (feedback ? next() : input.trim() && answer(gradeTyped(q, input)))}
              />
              {!feedback && (
                <ScrollView horizontal keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6 }}>
                  {ACCENTS.map((a) => (
                    <Pressable key={a} onPress={() => setInput((v) => v + a)} style={s.key}>
                      <Text style={s.keyText}>{a}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {feedback && (
            <View style={[s.feedback, { backgroundColor: feedback.correct ? colors.successSoft : colors.errorSoft }]}>
              <View style={s.feedbackTop}>
                <Text style={[s.feedbackTitle, { color: feedback.correct ? colors.success : colors.error }]}>
                  {feedback.correct ? "Correct !" : "Pas tout à fait"}
                </Text>
                <Pressable onPress={() => speakFrench(answeredSentence(q))} hitSlop={8}>
                  <Ionicons name="volume-high" size={22} color={colors.primary} />
                </Pressable>
              </View>
              {!feedback.correct && <Text style={s.answer}>{answeredSentence(q)}</Text>}
              {feedback.note && <Text style={s.explain}>{feedback.note}</Text>}
              <Text style={s.explain}>{q.explain}</Text>
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          {feedback ? (
            <Button title="Continue" icon="arrow-forward" onPress={next} />
          ) : q.kind === "type" ? (
            <Button title="Check" disabled={!input.trim()} onPress={() => answer(gradeTyped(q, input))} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingBottom: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingBottom: space.md },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  content: { gap: space.md, paddingBottom: space.lg },
  prompt: { fontSize: 15, color: colors.textMuted, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  sentence: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 36, color: colors.text, textAlign: "center" },
  blank: { color: colors.primary, textDecorationLine: "underline" },
  blankRight: { color: colors.success },
  blankWrong: { color: colors.error },
  en: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 20,
    fontFamily: fonts.serif,
    color: colors.text,
  },
  key: {
    minWidth: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontSize: 17, color: colors.text },
  feedback: { borderRadius: radius.lg, padding: space.md, gap: space.xs },
  feedbackTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  feedbackTitle: { fontSize: 18, fontWeight: "700" },
  answer: { fontFamily: fonts.serif, fontSize: 19, color: colors.text },
  explain: { fontSize: 14, color: colors.text },
  footer: { paddingTop: space.sm },
  doneBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  doneTitle: { fontSize: 32, fontFamily: fonts.serif, color: colors.text },
  muted: { color: colors.textMuted, fontSize: 16 },
});
