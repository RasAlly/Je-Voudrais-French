import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, FrenchText, ScreenHeader, SpeakButtons } from "../../components/ui";
import { api, type Translation } from "../../lib/api";
import { speakFrench, stopSpeaking } from "../../lib/speech";
import { colors, fonts, radius, space } from "../../theme";

type Entry = Translation & { input: string; saved?: boolean; studying?: boolean };

export default function TranslateScreen() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"saved" | "study" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Newest first; the first entry is the one being shown.
  const [history, setHistory] = useState<Entry[]>([]);
  const current = history[0];

  useEffect(() => () => stopSpeaking(), []);

  const translate = async () => {
    const text = input.trim();
    if (!text || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const t = await api.translate(text);
      setHistory((h) => [{ ...t, input: text }, ...h.filter((e) => e.input !== text)].slice(0, 15));
      speakFrench(t.fr);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const keep = async (to: "saved" | "study") => {
    if (!current || saving) return;
    setSaving(to);
    setError(null);
    try {
      await api.saveWord({ fr: current.fr, en: current.en, note: current.note || undefined, to });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setHistory((h) =>
        h.map((e, i) => (i === 0 ? { ...e, ...(to === "saved" ? { saved: true } : { studying: true }) } : e)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const show = (entry: Entry) => {
    setHistory((h) => [entry, ...h.filter((e) => e !== entry)]);
    speakFrench(entry.fr);
  };

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader title="Traduire" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={s.inputBox}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type English or French…"
              placeholderTextColor={colors.textMuted}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={500}
              style={s.input}
              submitBehavior="blurAndSubmit"
              returnKeyType="go"
              onSubmitEditing={translate}
            />
            {!!input && (
              <Pressable onPress={() => setInput("")} hitSlop={10} style={s.clear} accessibilityLabel="Clear">
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Button title="Translate" icon="language" loading={loading} disabled={!input.trim()} onPress={translate} />

          {error && <Text style={s.error}>{error}</Text>}

          {current && (
            <View style={s.result}>
              <View style={s.side}>
                <Text style={s.label}>Français</Text>
                <FrenchText size={26}>{current.fr}</FrenchText>
                <SpeakButtons text={current.fr} />
              </View>
              <View style={s.divider} />
              <View style={s.side}>
                <Text style={s.label}>English</Text>
                <Text style={s.en}>{current.en}</Text>
              </View>

              {current.alternatives.length > 0 && (
                <View style={{ gap: space.xs }}>
                  <Text style={s.label}>Also</Text>
                  {current.alternatives.map((a) => (
                    <Pressable key={a} onPress={() => speakFrench(a)} style={s.alt}>
                      <Ionicons name="volume-medium-outline" size={18} color={colors.primary} />
                      <Text style={s.altText}>{a}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {!!current.note && (
                <View style={s.note}>
                  <Ionicons name="bulb-outline" size={16} color={colors.primaryDark} />
                  <Text style={s.noteText}>{current.note}</Text>
                </View>
              )}

              <View style={s.actions}>
                <Button
                  title={current.saved ? "Saved" : "Save"}
                  icon={current.saved ? "bookmark" : "bookmark-outline"}
                  variant="secondary"
                  loading={saving === "saved"}
                  disabled={current.saved}
                  onPress={() => keep("saved")}
                  style={{ flex: 1 }}
                />
                <Button
                  title={current.studying ? "Flashcard made" : "Make flashcard"}
                  icon={current.studying ? "checkmark" : "albums-outline"}
                  variant="secondary"
                  loading={saving === "study"}
                  disabled={current.studying}
                  onPress={() => keep("study")}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {history.length > 1 && (
            <View style={{ gap: space.xs }}>
              <Text style={s.label}>Recent</Text>
              {history.slice(1).map((e) => (
                <Pressable key={e.input} onPress={() => show(e)} style={s.recent}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recentFr} numberOfLines={1}>
                      {e.fr}
                    </Text>
                    <Text style={s.recentEn} numberOfLines={1}>
                      {e.en}
                    </Text>
                  </View>
                  {(e.saved || e.studying) && <Ionicons name="bookmark" size={16} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg },
  content: { gap: space.md, paddingTop: space.md, paddingBottom: space.xl },
  inputBox: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 110,
  },
  input: { flex: 1, padding: space.md, paddingRight: 40, fontSize: 19, color: colors.text, textAlignVertical: "top" },
  clear: { position: "absolute", top: space.sm, right: space.sm },
  error: { color: colors.error, textAlign: "center" },
  result: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  side: { alignItems: "center", gap: space.sm },
  label: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textMuted,
    fontWeight: "600",
  },
  divider: { height: 1, backgroundColor: colors.border },
  en: { fontSize: 20, color: colors.text, textAlign: "center" },
  alt: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: space.md,
  },
  altText: { flex: 1, fontFamily: fonts.serif, fontSize: 17, color: colors.text },
  note: {
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: space.md,
  },
  noteText: { flex: 1, fontSize: 14, color: colors.primaryDark },
  actions: { flexDirection: "row", gap: space.sm },
  recent: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  recentFr: { fontFamily: fonts.serif, fontSize: 16, color: colors.text },
  recentEn: { fontSize: 13, color: colors.textMuted },
});
