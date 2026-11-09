import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { MakeFlashcard } from "../../components/MakeFlashcard";
import { Button, Chip, FrenchText, ScreenHeader, Segmented, SpeakButtons } from "../../components/ui";
import { api } from "../../lib/api";
import { gradeTyped, similarity } from "../../lib/compare";
import {
  canonicalAnswer,
  makeNumberPrompt,
  type NumberKind,
  type NumberPrompt,
  type NumberRange,
  spokenMatches,
} from "../../lib/numbers";
import { speakFrench, stopSpeaking } from "../../lib/speech";
import { useSpeechToText } from "../../lib/useRecorder";
import { colors, fonts, radius, space } from "../../theme";

type Mode = "listen" | "speak" | "write";

const MODES: { value: Mode; label: string }[] = [
  { value: "listen", label: "Listen" },
  { value: "speak", label: "Speak" },
  { value: "write", label: "Write" },
];
const KINDS: { value: NumberKind; label: string }[] = [
  { value: "number", label: "Numbers" },
  { value: "price", label: "Prices" },
  { value: "time", label: "Times" },
  { value: "phone", label: "Phone" },
];
const RANGES: { value: NumberRange; label: string }[] = [
  { value: "0-20", label: "0–20" },
  { value: "0-100", label: "0–100" },
  { value: "70-99", label: "70–99 ✶" },
  { value: "0-1000", label: "0–1000" },
  { value: "big", label: "1000+" },
];

const PROMPTS: Record<Mode, string> = {
  listen: "Type what you hear",
  speak: "Say this in French",
  write: "Write it out in French",
};

type Result = { correct: boolean; heard?: string; revealed?: boolean };

export default function NumbersScreen() {
  const [mode, setMode] = useState<Mode>("listen");
  const [kind, setKind] = useState<NumberKind>("number");
  const [range, setRange] = useState<NumberRange>("0-100");
  const [prompt, setPrompt] = useState<NumberPrompt>(() => makeNumberPrompt("number", "0-100"));
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [streak, setStreak] = useState(0);
  const stt = useSpeechToText();

  // XP is batched and sent when you leave (or every 10 correct answers).
  const pendingXp = useRef(0);
  useEffect(
    () => () => {
      if (pendingXp.current) api.addXp(pendingXp.current).catch(() => {});
      stopSpeaking();
    },
    [],
  );

  // Auto-play the audio for listening prompts.
  useEffect(() => {
    if (mode === "listen") speakFrench(prompt.spoken);
  }, [mode, prompt]);

  const next = (k = kind, r = range) => {
    setPrompt(makeNumberPrompt(k, r));
    setInput("");
    setResult(null);
  };

  const finish = (r: Result) => {
    Keyboard.dismiss();
    setResult(r);
    setStreak((st) => (r.correct ? st + 1 : 0));
    Haptics.notificationAsync(
      r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    if (r.correct) {
      pendingXp.current += 1;
      if (pendingXp.current >= 10) {
        api.addXp(pendingXp.current).catch(() => {});
        pendingXp.current = 0;
      }
    }
    if (mode !== "listen") speakFrench(prompt.spoken);
  };

  const check = () => {
    if (mode === "listen") finish({ correct: canonicalAnswer(kind, input) === prompt.digits });
    else finish({ correct: gradeTyped(input, prompt.spoken) !== "wrong" });
  };

  const toggleMic = async () => {
    if (stt.state === "recording") {
      const text = await stt.stop();
      if (text != null) finish({ correct: spokenMatches(prompt, text, similarity), heard: text });
    } else if (stt.state === "idle") {
      await stt.start();
    }
  };

  const keyboardType =
    mode === "write"
      ? "default"
      : kind === "number" || kind === "phone"
        ? "number-pad"
        : "numbers-and-punctuation";

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader
          title="Les nombres"
          right={
            <View style={s.pill}>
              <Text style={s.pillText}>🔥 {streak}</Text>
            </View>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Segmented
            options={MODES}
            value={mode}
            onChange={(m) => {
              setMode(m);
              next();
            }}
          />
          <View style={s.chips}>
            {KINDS.map((k) => (
              <Chip
                key={k.value}
                label={k.label}
                selected={kind === k.value}
                onPress={() => {
                  setKind(k.value);
                  next(k.value);
                }}
              />
            ))}
          </View>
          {kind === "number" && (
            <View style={s.chips}>
              {RANGES.map((r) => (
                <Chip
                  key={r.value}
                  label={r.label}
                  selected={range === r.value}
                  onPress={() => {
                    setRange(r.value);
                    next(kind, r.value);
                  }}
                />
              ))}
            </View>
          )}

          <Pressable onPress={Keyboard.dismiss} accessible={false} style={s.card}>
            <Text style={s.prompt}>{PROMPTS[mode]}</Text>
            {mode === "listen" ? (
              <SpeakButtons text={prompt.spoken} size="lg" />
            ) : (
              <Text style={s.display}>{prompt.display}</Text>
            )}
          </Pressable>

          {mode !== "speak" && (
            <TextInput
              key={`${mode}-${prompt.display}`}
              value={input}
              onChangeText={setInput}
              editable={!result}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={keyboardType}
              placeholder={
                mode === "write"
                  ? "En toutes lettres…"
                  : kind === "price"
                    ? "e.g. 3,50"
                    : kind === "time"
                      ? "e.g. 14h30"
                      : "Digits…"
              }
              placeholderTextColor={colors.textMuted}
              style={[s.input, mode === "write" && { fontFamily: fonts.serif }]}
              onSubmitEditing={() => (result ? next() : input.trim() && check())}
              returnKeyType="done"
            />
          )}

          {mode === "speak" && !result && (
            <View style={s.micArea}>
              <Pressable
                onPress={toggleMic}
                disabled={stt.state === "transcribing"}
                style={({ pressed }) => [
                  s.mic,
                  stt.state === "recording" && { backgroundColor: colors.error },
                  pressed && { opacity: 0.85 },
                ]}
              >
                {stt.state === "transcribing" ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Ionicons name={stt.state === "recording" ? "stop" : "mic"} size={36} color={colors.onPrimary} />
                )}
              </Pressable>
              <Text style={s.hint}>
                {stt.state === "recording" ? "Listening… tap to stop" : "Tap the mic and say it"}
              </Text>
              {stt.error && <Text style={[s.hint, { color: colors.error }]}>{stt.error}</Text>}
            </View>
          )}

          {result && (
            <View style={[s.result, { backgroundColor: result.correct ? colors.successSoft : colors.errorSoft }]}>
              <View style={s.resultTop}>
                <Text style={[s.resultTitle, { color: result.correct ? colors.success : colors.error }]}>
                  {result.correct ? "Très bien !" : result.revealed ? "La réponse" : "Pas tout à fait"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Pressable onPress={() => speakFrench(prompt.spoken)} hitSlop={8}>
                    <Ionicons name="volume-high" size={22} color={colors.primary} />
                  </Pressable>
                  <MakeFlashcard word={{ fr: prompt.spoken, en: prompt.display }} />
                </View>
              </View>
              <Text style={s.resultDisplay}>{prompt.display}</Text>
              <FrenchText size={20}>{prompt.spoken}</FrenchText>
              {result.heard != null && <Text style={s.hint}>Heard: “{result.heard}”</Text>}
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          {result ? (
            <Button title="Next" icon="arrow-forward" onPress={() => next()} style={{ flex: 1 }} />
          ) : (
            <>
              <Button
                title="Show answer"
                variant="secondary"
                onPress={() => finish({ correct: false, revealed: true })}
                style={{ flex: 1 }}
              />
              {mode !== "speak" && (
                <Button title="Check" disabled={!input.trim()} onPress={check} style={{ flex: 1.3 }} />
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg },
  content: { gap: space.md, paddingTop: space.md, paddingBottom: space.lg },
  pill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  pillText: { fontSize: 14, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  card: {
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prompt: { fontSize: 15, color: colors.textMuted, fontWeight: "600" },
  display: { fontSize: 44, fontWeight: "700", color: colors.text, textAlign: "center", fontVariant: ["tabular-nums"] },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 22,
    color: colors.text,
  },
  micArea: { alignItems: "center", gap: space.sm, paddingVertical: space.md },
  mic: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  result: { borderRadius: radius.lg, padding: space.md, gap: space.xs },
  resultTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultTitle: { fontSize: 18, fontWeight: "700" },
  resultDisplay: { fontSize: 26, fontWeight: "700", color: colors.text, textAlign: "center" },
  footer: { flexDirection: "row", gap: space.sm, paddingVertical: space.sm },
});
