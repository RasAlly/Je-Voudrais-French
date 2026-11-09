import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorState, Loading } from "../components/States";
import { Button, Center, ProgressBar } from "../components/ui";
import { api, type Item } from "../lib/api";
import { type Deck, type Direction, loadDeck } from "../lib/decks";
import { speakFrench, stopSpeaking } from "../lib/speech";
import { colors, fonts, radius, space } from "../theme";

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function exit() {
  stopSpeaking();
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function FlashcardsScreen() {
  const { deck = "saved", dir = "fr" } = useLocalSearchParams<{ deck?: Deck; dir?: Direction }>();
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [again, setAgain] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [flip] = useState(() => new Animated.Value(0));

  const load = () => {
    loadDeck(deck)
      .then((items) => {
        setQueue(shuffle(items));
        setStarred(new Set(items.filter((i) => i.starred).map((i) => i.id)));
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [deck]);

  const card = queue?.[index];
  const done = !!queue && index >= queue.length;

  // Play the French when it's showing.
  useEffect(() => {
    if (card && (dir === "fr") !== flipped) speakFrench(card.fr);
  }, [card, dir, flipped]);

  if (error) return <ErrorState message={error} onRetry={() => (setError(null), load())} />;
  if (!queue) return <Loading />;

  if (queue.length === 0)
    return (
      <Center>
        <Text style={s.doneTitle}>Pas de cartes</Text>
        <Text style={s.muted}>This deck is empty right now.</Text>
        <Button title="Back" variant="secondary" onPress={exit} />
      </Center>
    );

  const unique = [...new Set(queue.map((c) => c.id))];
  if (done) {
    const knew = unique.filter((id) => !again[id]).length;
    return (
      <SafeAreaView style={[s.screen, { justifyContent: "space-between" }]}>
        <View style={s.doneBox}>
          <Text style={{ fontSize: 56 }}>🃏</Text>
          <Text style={s.doneTitle}>C&apos;est fini !</Text>
          <Text style={s.muted}>
            {knew} of {unique.length} known first time
          </Text>
        </View>
        <Button
          title="Done"
          loading={saving}
          onPress={async () => {
            setSaving(true);
            await api.addXp(5 + knew).catch(() => {});
            exit();
          }}
        />
      </SafeAreaView>
    );
  }

  const doFlip = () => {
    Animated.spring(flip, { toValue: flipped ? 0 : 1, friction: 8, tension: 60, useNativeDriver: true }).start();
    setFlipped((f) => !f);
  };

  const toggleStar = () => {
    const id = card!.id;
    const on = !starred.has(id);
    Haptics.selectionAsync().catch(() => {});
    const set = (add: boolean) =>
      setStarred((prev) => {
        const next = new Set(prev);
        if (add) next.add(id);
        else next.delete(id);
        return next;
      });
    const apply = () => {
      set(on);
      (on ? api.star(id) : api.unstar(id)).catch(() => set(!on)); // undo if the server call fails
    };
    if (on) return apply();
    // Unstarring asks first, like removing a created card.
    Alert.alert("Remove from Starred?", `“${card!.fr}” will be removed from your Starred collection.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: apply },
    ]);
  };

  /** Created cards only: confirm, then remove it from Created and from this session. */
  const confirmRemove = () => {
    const target = card!;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert("Remove this flashcard?", `“${target.fr}” will be removed from Created.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          api
            .unsave(target.id)
            .then(() => {
              flip.setValue(0);
              setFlipped(false);
              // The next card slides into this position; if it was the last, the session ends.
              setQueue((q) => q!.filter((c) => c.id !== target.id));
              setAgain((a) => {
                const { [target.id]: _, ...rest } = a;
                return rest;
              });
            })
            .catch(() => Alert.alert("Couldn't remove it", "Check your connection and try again."));
        },
      },
    ]);
  };

  const trash = card?.saved ? (
    <Pressable onPress={confirmRemove} hitSlop={12} style={s.trash} accessibilityLabel="Remove flashcard">
      <Ionicons name="trash-outline" size={22} color={colors.error} />
    </Pressable>
  ) : null;

  const answer = (knewIt: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    if (!knewIt) {
      // Stay on this card: flip it back to the front so you can try again.
      setAgain((a) => ({ ...a, [card!.id]: true }));
      Animated.spring(flip, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
      setFlipped(false);
      return;
    }
    flip.setValue(0);
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  const front = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const back = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const frenchFirst = dir === "fr";

  return (
    <SafeAreaView style={s.screen} edges={["bottom", "left", "right"]}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 24) + space.md }]}>
        <Pressable onPress={exit} hitSlop={16} style={s.close} accessibilityLabel="Close flashcards">
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <ProgressBar value={index / queue.length} />
        <Text style={s.count}>
          {index + 1}/{queue.length}
        </Text>
        <Pressable
          onPress={toggleStar}
          hitSlop={12}
          style={s.close}
          accessibilityLabel={starred.has(card!.id) ? "Unstar card" : "Star card"}
        >
          <Ionicons name={starred.has(card!.id) ? "star" : "star-outline"} size={24} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable style={s.cardArea} onPress={doFlip} accessibilityHint="Flips the card">
        <Animated.View style={[s.card, { transform: [{ perspective: 1000 }, { rotateY: front }] }]}>
          {again[card!.id] && <Text style={s.retry}>Try again</Text>}
          <Face item={card!} french={frenchFirst} />
          {!flipped && trash}
        </Animated.View>
        <Animated.View style={[s.card, s.cardBack, { transform: [{ perspective: 1000 }, { rotateY: back }] }]}>
          <Face item={card!} french={!frenchFirst} />
          {flipped && trash}
        </Animated.View>
      </Pressable>

      {flipped ? (
        <View style={s.row}>
          <Button title="Again" variant="secondary" icon="refresh" onPress={() => answer(false)} style={{ flex: 1 }} />
          <Button title="Got it" icon="checkmark" onPress={() => answer(true)} style={{ flex: 1 }} />
        </View>
      ) : (
        <Button title="Flip" variant="secondary" icon="swap-horizontal" onPress={doFlip} />
      )}
    </SafeAreaView>
  );
}

/** One side of a flashcard. */
function Face({ item, french }: { item: Item; french: boolean }) {
  return (
    <View style={s.faceInner}>
      <Text style={s.faceLabel}>{french ? "Français" : "English"}</Text>
      <Text style={[s.faceText, french && { fontFamily: fonts.serif }]}>{french ? item.fr : item.en}</Text>
      {french && (
        <Pressable onPress={() => speakFrench(item.fr)} hitSlop={10} style={s.speaker}>
          <Ionicons name="volume-high" size={22} color={colors.primary} />
        </Pressable>
      )}
      {french && item.note && <Text style={s.note}>{item.note}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  count: { fontSize: 13, color: colors.textMuted, minWidth: 44, textAlign: "right", fontVariant: ["tabular-nums"] },
  cardArea: { flex: 1, marginVertical: space.md },
  card: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backfaceVisibility: "hidden",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardBack: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  faceInner: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, gap: space.md },
  faceLabel: {
    position: "absolute",
    top: space.lg,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textMuted,
    fontWeight: "600",
  },
  faceText: { fontSize: 34, color: colors.text, textAlign: "center" },
  speaker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { fontSize: 14, color: colors.primaryDark, textAlign: "center" },
  trash: {
    position: "absolute",
    top: space.md,
    right: space.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  retry: {
    position: "absolute",
    bottom: space.lg,
    alignSelf: "center",
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  row: { flexDirection: "row", gap: space.sm },
  doneBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  doneTitle: { fontSize: 32, fontFamily: fonts.serif, color: colors.text },
  muted: { color: colors.textMuted, fontSize: 16 },
});
