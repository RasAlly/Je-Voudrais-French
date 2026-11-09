import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
              { id: "saved", label: "Saved" },
              { id: "starred", label: "Starred" },
              ...data.units.map((u) => ({ id: `unit:${u.id}` as Deck, label: u.en ?? u.title })),
            ].map((d) => ({ ...d, count: filterDeck(d.id as Deck, data.items, data.study.items).length }))}
          />

          <StudyList items={data.study.items} graduateAt={data.study.graduateAt} onChange={reload} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Deck + direction picker that launches a flashcard session. */
function Flashcards({ decks }: { decks: { id: string; label: string; count: number }[] }) {
  const [deck, setDeck] = useState<string>(() => decks.find((d) => d.count > 0)?.id ?? "saved");
  const [dir, setDir] = useState<Direction>("fr");
  const selected = decks.find((d) => d.id === deck);
  return (
    <Card style={{ gap: space.md }}>
      <View style={s.studyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>Flashcards</Text>
          <Text style={s.muted}>Tap to flip, then rate yourself</Text>
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
      <Button
        title={selected?.count ? `Start · ${selected.count} cards` : "No cards in this deck"}
        disabled={!selected?.count}
        onPress={() => router.push({ pathname: "/flashcards", params: { deck, dir } })}
      />
    </Card>
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
