import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Loading } from "../../components/States";
import { Button, Card, Chip, Segmented } from "../../components/ui";
import { api, type StudyItem } from "../../lib/api";
import { speakFrench } from "../../lib/speech";
import { type Deck, type Direction, filterDeck } from "../../lib/decks";
import { useLoad } from "../../lib/useLoad";
import { colors, fonts, radius, space } from "../../theme";

export default function CardsScreen() {
  const { data, error, loading, reload } = useLoad(async () => {
    const [stats, { items }, study, { units }] = await Promise.all([
      api.stats(),
      api.items(),
      api.study(),
      api.course(),
    ]);
    return { stats, items, study, units };
  });

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data && loading) return <Loading />;
  if (!data) return null;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={{ gap: space.md, marginBottom: space.md }}>
          <Text style={s.title}>Cartes</Text>
          <Flashcards
            decks={[
              { id: "saved", label: "Created" },
              { id: "starred", label: "Starred" },
              ...data.units.map((u) => ({ id: `unit:${u.id}` as Deck, label: u.en ?? u.title })),
            ].map((d) => ({ ...d, count: filterDeck(d.id as Deck, data.items, data.study.items).length }))}
            onCreated={reload}
          />

          <StudyList items={data.study.items} graduateAt={data.study.graduateAt} onChange={reload} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Deck + direction picker that launches a flashcard session. */
function Flashcards({
  decks,
  onCreated,
}: {
  decks: { id: string; label: string; count: number }[];
  onCreated: () => void;
}) {
  const [deck, setDeck] = useState<string>(() => decks.find((d) => d.count > 0)?.id ?? "saved");
  const [dir, setDir] = useState<Direction>("fr");
  const [creating, setCreating] = useState(false);
  const selected = decks.find((d) => d.id === deck);
  return (
    <Card style={{ gap: space.md }}>
      <View style={s.studyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>Flashcards</Text>
          <Text style={s.muted}>Select collection, tap to flip</Text>
        </View>
        <Ionicons name="albums" size={22} color={colors.primary} />
      </View>
      <View style={s.chips}>
        {decks.map((d) => (
          <Chip
            key={d.id}
            label={`${d.label} · ${d.count}`}
            selected={deck === d.id}
            disabled={d.count === 0}
            onPress={() => setDeck(d.id)}
          />
        ))}
      </View>
      <Segmented
        options={[
          { value: "fr", label: "Français → English" },
          { value: "en", label: "English → Français" },
        ]}
        value={dir}
        onChange={setDir}
      />
      <View style={s.startRow}>
        <Button
          title={selected?.count ? `Start · ${selected.count} cards` : "No cards in this deck"}
          disabled={!selected?.count}
          onPress={() => router.push({ pathname: "/flashcards", params: { deck, dir } })}
          style={{ flex: 2 }}
        />
        <Button title="Add" icon="add" variant="secondary" onPress={() => setCreating(true)} style={s.addButton} />
      </View>
      <CreateCard
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setDeck("saved");
          onCreated();
        }}
      />
    </Card>
  );
}

type Created = { id: string; fr: string; en: string; existed: boolean };

/** Type an English or French word/phrase → translated → new card in the Created deck. */
function CreateCard({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<Created[]>([]);

  const create = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const t = await api.translate(text);
      const r = await api.saveWord({ fr: t.fr, en: t.en, note: t.note || undefined, to: "saved" });
      setMade((m) => [{ id: r.item.id, fr: r.item.fr, en: r.item.en, existed: r.existed }, ...m]);
      setInput("");
      speakFrench(r.item.fr);
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const undo = async (c: Created) => {
    await api.unsave(c.id).catch(() => {});
    setMade((m) => m.filter((x) => x !== c));
    onCreated();
  };

  const close = () => {
    setMade([]);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={s.modal} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.modalTop}>
          <Text style={s.modalTitle}>New flashcard</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={s.muted}>Type a word or phrase in English or French. It’s translated and added to Created.</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="e.g. the library, or la bibliothèque"
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={create}
          style={s.input}
        />
        {error && <Text style={{ color: colors.error }}>{error}</Text>}
        <Button title="Create flashcard" icon="add" loading={busy} disabled={!input.trim()} onPress={create} />

        <ScrollView contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
          {made.map((c) => (
            <View key={c.id} style={s.madeRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Pressable style={{ flex: 1 }} onPress={() => speakFrench(c.fr)}>
                <Text style={s.fr}>{c.fr}</Text>
                <Text style={[s.en, { textAlign: "left" }]}>
                  {c.en}
                  {c.existed ? " · already existed, added to Created" : ""}
                </Text>
              </Pressable>
              <Pressable onPress={() => undo(c)} hitSlop={10}>
                <Text style={s.undo}>Undo</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Words marked "don't know", with progress toward graduating off the list. */
function StudyList({ items, graduateAt, onChange }: { items: StudyItem[]; graduateAt: number; onChange: () => void }) {
  return (
    <Card style={{ gap: space.md }}>
      <View style={s.studyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>Study list</Text>
          <Text style={s.muted}>
            {items.length
              ? `${items.length} ${items.length === 1 ? "word" : "words"} to dig into`
              : "Tap “Don't know” in a lesson to save tricky words here."}
          </Text>
        </View>
        <Ionicons name="bookmark" size={22} color={colors.primary} />
      </View>

      {items.map((it) => (
        <View key={it.id} style={s.studyRow}>
          <Pressable style={{ flex: 1 }} onPress={() => speakFrench(it.fr)}>
            <Text style={s.fr}>{it.fr}</Text>
            <Text style={s.studyEn}>{it.en}</Text>
          </Pressable>
          <View style={s.dots}>
            {Array.from({ length: graduateAt }, (_, i) => (
              <View key={i} style={[s.dot, i < it.cleanRuns && s.dotOn]} />
            ))}
          </View>
          <Pressable
            hitSlop={8}
            accessibilityLabel={`Deep dive ${it.fr}`}
            onPress={() => router.push({ pathname: "/study-session", params: { item: it.id } })}
          >
            <Ionicons name="play-circle-outline" size={26} color={colors.primary} />
          </Pressable>
          <Pressable
            hitSlop={8}
            accessibilityLabel={`Remove ${it.fr}`}
            onPress={() =>
              api
                .removeFromStudy(it.id)
                .then(onChange)
                .catch(() => {})
            }
          >
            <Ionicons name="close-circle-outline" size={24} color={colors.locked} />
          </Pressable>
        </View>
      ))}

      {items.length > 0 && (
        <Button title="Start deep dive" icon="layers-outline" onPress={() => router.push("/study-session")} />
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  startRow: { flexDirection: "row", gap: space.sm },
  addButton: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: space.md },
  modal: { flex: 1, backgroundColor: colors.bg, padding: space.lg, gap: space.md },
  modalTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontFamily: fonts.serif, fontSize: 28, color: colors.text },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 19,
    color: colors.text,
  },
  madeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  undo: { fontSize: 14, fontWeight: "600", color: colors.primary },
  cardTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  studyHeader: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  studyRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  studyEn: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  dots: { flexDirection: "row", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  dotOn: { backgroundColor: colors.success },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.text },
  big: { fontSize: 48, fontWeight: "700", color: colors.primary },
  muted: { color: colors.textMuted, fontSize: 15 },
  section: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: space.sm,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  fr: { fontFamily: fonts.serif, fontSize: 18, color: colors.text, flexShrink: 1 },
  en: { fontSize: 15, color: colors.textMuted, flexShrink: 1, textAlign: "right" },
});
