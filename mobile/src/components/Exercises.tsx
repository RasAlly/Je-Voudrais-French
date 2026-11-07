import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Exercise } from "../lib/exercises";
import { gradeTyped, normalize, sameMeaning, similarity, wordMatches } from "../lib/compare";
import { speakFrench } from "../lib/speech";
import { useSpeechToText } from "../lib/useRecorder";
import { colors, fonts, radius, space } from "../theme";
import { Button, Choice, FrenchText, SpeakButtons } from "./ui";

export type Result = {
  correct: boolean;
  answer?: string;
  note?: string;
  /** User tapped "Don't know" — the session adds the word to the study list. */
  dontKnow?: boolean;
};

type Props<K extends Exercise["kind"]> = {
  ex: Extract<Exercise, { kind: K }>;
  locked: boolean;
  onResult: (r: Result) => void;
  onSkip?: () => void;
};

function Prompt({ children }: { children: string }) {
  return <Text style={s.prompt}>{children}</Text>;
}

function Footer({ children }: { children: React.ReactNode }) {
  return <View style={s.footer}>{children}</View>;
}

// ---------------------------------------------------------------------------

export function Intro({ ex, onContinue }: { ex: Extract<Exercise, { kind: "intro" }>; onContinue: () => void }) {
  useEffect(() => {
    speakFrench(ex.item.fr);
  }, [ex.item.fr]);
  return (
    <View style={s.fill}>
      <Text style={s.eyebrow}>Nouveau</Text>
      <View style={s.middle}>
        <FrenchText size={36}>{ex.item.fr}</FrenchText>
        <Text style={s.translation}>{ex.item.en}</Text>
        <SpeakButtons text={ex.item.fr} size="lg" />
        {ex.item.note && <Text style={s.note}>{ex.item.note}</Text>}
      </View>
      <Footer>
        <Button title="Continue" onPress={onContinue} />
      </Footer>
    </View>
  );
}

export function ChooseEn({ ex, locked, onResult }: Props<"choose_en">) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    speakFrench(ex.item.fr);
  }, [ex.item.fr]);
  return (
    <View style={s.fill}>
      <Prompt>What does this mean?</Prompt>
      <View style={s.promptBox}>
        <FrenchText size={30}>{ex.item.fr}</FrenchText>
        <SpeakButtons text={ex.item.fr} />
      </View>
      <View style={s.options}>
        {ex.options.map((o) => (
          <Choice
            key={o}
            label={o}
            onPress={() => !locked && setPicked(o)}
            state={
              locked && sameMeaning(o, ex.item.en)
                ? "correct"
                : locked && o === picked
                  ? "wrong"
                  : o === picked
                    ? "selected"
                    : "idle"
            }
          />
        ))}
      </View>
      {!locked && (
        <Footer>
          <Button
            title="Check"
            disabled={!picked}
            onPress={() => onResult({ correct: sameMeaning(picked!, ex.item.en), answer: ex.item.en })}
          />
        </Footer>
      )}
    </View>
  );
}

export function ListenChoose({ ex, locked, onResult }: Props<"listen_choose">) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    speakFrench(ex.item.fr);
  }, [ex.item.fr]);
  return (
    <View style={s.fill}>
      <Prompt>What do you hear?</Prompt>
      <View style={s.promptBox}>
        <SpeakButtons text={ex.item.fr} size="lg" />
      </View>
      <View style={s.options}>
        {ex.options.map((o) => (
          <Choice
            key={o}
            label={o}
            french
            onPress={() => !locked && setPicked(o)}
            state={
              locked && o === ex.item.fr
                ? "correct"
                : locked && o === picked
                  ? "wrong"
                  : o === picked
                    ? "selected"
                    : "idle"
            }
          />
        ))}
      </View>
      {!locked && (
        <Footer>
          <Button
            title="Check"
            disabled={!picked}
            onPress={() => onResult({ correct: picked === ex.item.fr, answer: `${ex.item.fr} — ${ex.item.en}` })}
          />
        </Footer>
      )}
    </View>
  );
}

const ACCENTS = ["é", "è", "ê", "à", "â", "ç", "ù", "û", "ô", "î", "ï", "œ", "'"];

export function TypeFr({ ex, locked, onResult }: Props<"type_fr" | "dictation">) {
  const dictation = ex.kind === "dictation";
  const [text, setText] = useState("");
  useEffect(() => {
    if (dictation) speakFrench(ex.item.fr);
  }, [dictation, ex.item.fr]);
  const check = () => {
    const g = gradeTyped(text, ex.item.fr);
    speakFrench(ex.item.fr);
    onResult({
      correct: g !== "wrong",
      answer: ex.item.fr,
      note: g === "accents" ? "Watch the accents!" : g === "typo" ? "Close — mind the spelling." : undefined,
    });
  };
  return (
    <View style={s.fill}>
      <Prompt>{dictation ? "Type what you hear" : "Write this in French"}</Prompt>
      <View style={s.promptBox}>
        {dictation ? <SpeakButtons text={ex.item.fr} size="lg" /> : <Text style={s.english}>{ex.item.en}</Text>}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        editable={!locked}
        placeholder="Type in French…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        style={s.input}
        onSubmitEditing={() => text.trim() && !locked && check()}
        returnKeyType="done"
      />
      {!locked && (
        <View style={s.accentRow}>
          {ACCENTS.map((a) => (
            <Pressable key={a} onPress={() => setText((t) => t + a)} style={s.accentKey}>
              <Text style={s.accentText}>{a}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!locked && (
        <Footer>
          <Button title="Check" disabled={!text.trim()} onPress={check} />
          <DontKnow item={ex.item} onResult={onResult} />
        </Footer>
      )}
    </View>
  );
}

export function Arrange({ ex, locked, onResult }: Props<"arrange">) {
  // Track tile indexes so duplicate words work.
  const [chosen, setChosen] = useState<number[]>([]);
  const sentence = chosen.map((i) => ex.bank[i]).join(" ");
  return (
    <View style={s.fill}>
      <Prompt>Translate this sentence</Prompt>
      <View style={s.promptBox}>
        <Text style={s.english}>{ex.item.en}</Text>
      </View>
      <View style={s.answerLine}>
        {chosen.map((i) => (
          <Tile key={i} word={ex.bank[i]} onPress={() => !locked && setChosen((c) => c.filter((x) => x !== i))} />
        ))}
      </View>
      <View style={s.bank}>
        {ex.bank.map((w, i) =>
          chosen.includes(i) ? (
            <View key={i} style={[s.tile, s.tileGhost]}>
              <Text style={[s.tileText, { opacity: 0 }]}>{w}</Text>
            </View>
          ) : (
            <Tile key={i} word={w} onPress={() => !locked && setChosen((c) => [...c, i])} />
          ),
        )}
      </View>
      {!locked && (
        <Footer>
          <Button
            title="Check"
            disabled={chosen.length === 0}
            onPress={() => {
              speakFrench(ex.item.fr);
              onResult({ correct: normalize(sentence) === normalize(ex.item.fr), answer: ex.item.fr });
            }}
          />
          <DontKnow item={ex.item} onResult={onResult} />
        </Footer>
      )}
    </View>
  );
}

/** Reveal the answer, count it as a miss, and save the word for a deep dive. */
function DontKnow({ item, onResult }: { item: Exercise["item"]; onResult: (r: Result) => void }) {
  return (
    <Button
      title="Don't know"
      variant="ghost"
      icon="help-circle-outline"
      onPress={() => {
        speakFrench(item.fr);
        onResult({
          correct: false,
          dontKnow: true,
          answer: `${item.fr} — ${item.en}`,
          note: "Saved to your study list for a deep dive.",
        });
      }}
    />
  );
}

function Tile({ word, onPress }: { word: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, pressed && { opacity: 0.7 }]}>
      <Text style={s.tileText}>{word}</Text>
    </Pressable>
  );
}

export const SPEAK_PASS = 0.75;

export function Speak({ ex, locked, onResult, onSkip }: Props<"speak">) {
  const stt = useSpeechToText();
  const [heard, setHeard] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const score = heard != null ? similarity(heard, ex.item.fr) : 0;

  const toggle = async () => {
    if (stt.state === "recording") {
      const text = await stt.stop();
      if (text == null) return;
      setHeard(text);
      setAttempts((a) => a + 1);
      if (similarity(text, ex.item.fr) >= SPEAK_PASS) {
        onResult({ correct: true, answer: ex.item.fr, note: `Heard: “${text}”` });
      }
    } else if (stt.state === "idle") {
      setHeard(null);
      await stt.start();
    }
  };

  return (
    <View style={s.fill}>
      <Prompt>Say this out loud</Prompt>
      <View style={s.promptBox}>
        {heard != null ? (
          <Text style={s.wordsLine}>
            {wordMatches(ex.item.fr, heard).map((w, i) => (
              <Text key={i} style={{ color: w.ok ? colors.success : colors.error }}>
                {w.word}{" "}
              </Text>
            ))}
          </Text>
        ) : (
          <FrenchText size={30}>{ex.item.fr}</FrenchText>
        )}
        <Text style={s.translation}>{ex.item.en}</Text>
        <SpeakButtons text={ex.item.fr} />
      </View>

      <View style={s.middle}>
        {!locked && (
          <Pressable
            onPress={toggle}
            disabled={stt.state === "transcribing"}
            style={({ pressed }) => [s.mic, stt.state === "recording" && s.micActive, pressed && { opacity: 0.85 }]}
          >
            {stt.state === "transcribing" ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Ionicons name={stt.state === "recording" ? "stop" : "mic"} size={36} color={colors.onPrimary} />
            )}
          </Pressable>
        )}
        <Text style={s.hint}>
          {stt.state === "recording"
            ? "Listening… tap to stop"
            : stt.state === "transcribing"
              ? "Checking…"
              : heard != null && score < SPEAK_PASS
                ? `I heard “${heard || "…"}” — try again`
                : "Tap the mic and speak"}
        </Text>
        {stt.error && <Text style={[s.hint, { color: colors.error }]}>{stt.error}</Text>}
      </View>

      {!locked && (
        <Footer>
          {attempts >= 2 && score < SPEAK_PASS ? (
            <Button
              title="Continue"
              variant="secondary"
              onPress={() => onResult({ correct: false, answer: ex.item.fr, note: `Heard: “${heard}”` })}
            />
          ) : null}
          {onSkip && <Button title="Can't speak now" variant="ghost" onPress={onSkip} />}
        </Footer>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, gap: space.md },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  eyebrow: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  prompt: { fontSize: 20, fontWeight: "600", color: colors.text },
  promptBox: {
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  translation: { fontSize: 18, color: colors.textMuted, textAlign: "center" },
  english: { fontSize: 24, color: colors.text, textAlign: "center" },
  note: {
    fontSize: 15,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    padding: space.md,
    borderRadius: radius.md,
    textAlign: "center",
    overflow: "hidden",
  },
  options: { gap: space.sm },
  footer: { marginTop: "auto", gap: space.sm },
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
  accentRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  accentKey: {
    minWidth: 36,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
  },
  accentText: { fontSize: 17, color: colors.text, fontFamily: fonts.serif },
  answerLine: {
    minHeight: 64,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    alignItems: "flex-end",
  },
  bank: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center", marginTop: space.md },
  tile: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 3,
  },
  tileGhost: { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt },
  tileText: { fontSize: 17, fontFamily: fonts.serif, color: colors.text },
  mic: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  micActive: { backgroundColor: colors.error },
  hint: { color: colors.textMuted, fontSize: 15, textAlign: "center" },
  wordsLine: { fontSize: 30, fontFamily: fonts.serif, textAlign: "center" },
});
