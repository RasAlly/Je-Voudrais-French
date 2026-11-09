import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AddToStudy, MakeFlashcard } from "../../components/MakeFlashcard";
import { ErrorState, Loading } from "../../components/States";
import { ScreenHeader } from "../../components/ui";
import { api, type Article, type ArticleBlock, type Gloss, localDay } from "../../lib/api";
import { speakFrench, stopSpeaking } from "../../lib/speech";
import { colors, fonts, radius, space } from "../../theme";

const isWord = (t: string) => /[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]/.test(t);
const sentenceText = (tokens: string[]) => tokens.join("").trim();
const paragraphText = (b: Extract<ArticleBlock, { type: "p" }>) => b.sentences.map(sentenceText).join(" ");

/** What's selected: one word, or a whole sentence (long-press). */
type Selection = { block: number; sentence: number; token: number | null };

type Lookup =
  | { kind: "word"; word: string; sentence: string; gloss?: Gloss; error?: string }
  | { kind: "sentence"; sentence: string; en?: string; error?: string };

function formatDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  try {
    return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return day;
  }
}

export default function ArticleScreen() {
  const { day = localDay() } = useLocalSearchParams<{ day?: string }>();
  const insets = useSafeAreaInsets();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const load = () => {
    api
      .article(day)
      .then(setArticle)
      .catch((e) => setError(e.message));
  };
  useEffect(load, [day]);
  useEffect(() => () => stopSpeaking(), []);

  const onWord = useCallback(
    (block: number, sentence: number, token: number) => {
      if (!article) return;
      const b = article.blocks[block];
      if (b.type !== "p") return;
      const tokens = b.sentences[sentence];
      const word = tokens[token].trim();
      const text = sentenceText(tokens);
      Haptics.selectionAsync().catch(() => {});
      setSelection({ block, sentence, token });
      setLookup({ kind: "word", word, sentence: text });
      speakFrench(word);
      api
        .gloss(word, text)
        .then((gloss) =>
          setLookup((l) => (l?.kind === "word" && l.word === word && l.sentence === text ? { ...l, gloss } : l)),
        )
        .catch((e) =>
          setLookup((l) => (l?.kind === "word" && l.word === word ? { ...l, error: (e as Error).message } : l)),
        );
    },
    [article],
  );

  const onSentence = useCallback(
    (block: number, sentence: number) => {
      if (!article) return;
      const b = article.blocks[block];
      if (b.type !== "p") return;
      const text = sentenceText(b.sentences[sentence]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setSelection({ block, sentence, token: null });
      setLookup({ kind: "sentence", sentence: text });
      api
        .translate(text)
        .then((t) => setLookup((l) => (l?.kind === "sentence" && l.sentence === text ? { ...l, en: t.en } : l)))
        .catch((e) =>
          setLookup((l) => (l?.kind === "sentence" && l.sentence === text ? { ...l, error: (e as Error).message } : l)),
        );
    },
    [article],
  );

  const closeLookup = () => {
    setSelection(null);
    setLookup(null);
  };

  if (error)
    return (
      <SafeAreaView style={s.screen} edges={["top"]}>
        <ScreenHeader title="Article du jour" />
        <ErrorState message={error} onRetry={() => (setError(null), load())} />
      </SafeAreaView>
    );
  if (!article) return <Loading />;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={{ paddingHorizontal: space.lg }}>
        <ScreenHeader
          title="Article du jour"
          right={
            <Pressable
              onPress={() => setArchiveOpen(true)}
              hitSlop={12}
              style={s.iconBtn}
              accessibilityLabel="Past articles"
            >
              <Ionicons name="calendar-outline" size={24} color={colors.textMuted} />
            </Pressable>
          }
        />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: (lookup ? 320 : space.xl) + insets.bottom }]}>
        <Text style={s.day}>{formatDay(article.day)}</Text>
        {article.thumbnail && <Image source={{ uri: article.thumbnail }} style={s.image} resizeMode="cover" />}
        <Text style={s.title}>{article.title}</Text>
        {!!article.description && <Text style={s.description}>{article.description}</Text>}
        <Text style={s.meta}>
          Most read on French Wikipedia · {article.views.toLocaleString("fr-FR")} views · ~
          {Math.max(1, Math.round(article.words / 200))} min
        </Text>

        <View style={s.hint}>
          <Ionicons name="hand-left-outline" size={16} color={colors.primaryDark} />
          <Text style={s.hintText}>Tap a word for its meaning · press and hold a sentence to translate it</Text>
        </View>

        {article.blocks.map((b, i) =>
          b.type === "h" ? (
            <Text key={i} style={s.heading}>
              {b.text}
            </Text>
          ) : (
            <Paragraph
              key={i}
              index={i}
              block={b}
              selected={selection?.block === i ? selection : null}
              onWord={onWord}
              onSentence={onSentence}
            />
          ),
        )}

        <Pressable onPress={() => Linking.openURL(article.url)} style={s.more}>
          <Text style={s.moreText}>{article.truncated ? "Continue reading on Wikipédia" : "Open on Wikipédia"}</Text>
          <Ionicons name="open-outline" size={16} color={colors.primary} />
        </Pressable>
        <Text style={s.credit}>Text from Wikipédia, available under CC BY-SA 4.0.</Text>
      </ScrollView>

      {lookup && <LookupPanel lookup={lookup} bottom={insets.bottom} onClose={closeLookup} />}

      <Archive
        open={archiveOpen}
        current={article.day}
        onClose={() => setArchiveOpen(false)}
        onPick={(d) => {
          setArchiveOpen(false);
          closeLookup();
          setArticle(null);
          router.setParams({ day: d });
        }}
      />
    </SafeAreaView>
  );
}

/** One paragraph; every word is tappable. Memoised so a tap only re-renders this paragraph. */
const Paragraph = memo(function Paragraph({
  index,
  block,
  selected,
  onWord,
  onSentence,
}: {
  index: number;
  block: Extract<ArticleBlock, { type: "p" }>;
  selected: Selection | null;
  onWord: (block: number, sentence: number, token: number) => void;
  onSentence: (block: number, sentence: number) => void;
}) {
  return (
    <View style={s.paragraph}>
      <Text style={s.body}>
        {block.sentences.map((tokens, si) => {
          const sentenceOn = selected?.sentence === si && selected.token === null;
          return (
            <Text key={si} style={sentenceOn && s.sentenceOn} onLongPress={() => onSentence(index, si)}>
              {tokens.map((t, ti) =>
                isWord(t) ? (
                  <Text
                    key={ti}
                    onPress={() => onWord(index, si, ti)}
                    onLongPress={() => onSentence(index, si)}
                    style={selected?.sentence === si && selected.token === ti && s.wordOn}
                  >
                    {t}
                  </Text>
                ) : (
                  t
                ),
              )}
              {si < block.sentences.length - 1 && !/\s$/.test(tokens[tokens.length - 1] ?? "") ? " " : ""}
            </Text>
          );
        })}
      </Text>
      <Pressable
        onPress={() => speakFrench(paragraphText(block))}
        hitSlop={8}
        style={s.paraSpeak}
        accessibilityLabel="Read paragraph aloud"
      >
        <Ionicons name="volume-medium-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
});

/** Bottom sheet with the word's meaning (or the sentence's translation) and save buttons. */
function LookupPanel({ lookup, bottom, onClose }: { lookup: Lookup; bottom: number; onClose: () => void }) {
  const isWordLookup = lookup.kind === "word";
  const fr = isWordLookup ? (lookup.gloss?.lemma ?? lookup.word) : lookup.sentence;
  const en = isWordLookup ? lookup.gloss?.flashcardEn : lookup.en;
  const ready = isWordLookup ? !!lookup.gloss : !!lookup.en;
  const card = ready && en ? { fr, en, note: isWordLookup ? lookup.gloss?.note || undefined : undefined } : null;

  return (
    <View style={[s.panel, { paddingBottom: bottom + space.md }]}>
      <View style={s.panelTop}>
        <Text style={s.panelLabel}>{isWordLookup ? "Word" : "Sentence"}</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ gap: space.xs }}>
        <View style={s.panelRow}>
          <Text style={[s.panelFr, !isWordLookup && { fontSize: 18 }]}>{fr}</Text>
          <Pressable onPress={() => speakFrench(fr)} hitSlop={10}>
            <Ionicons name="volume-high" size={22} color={colors.primary} />
          </Pressable>
        </View>
        {isWordLookup && lookup.gloss && lookup.gloss.lemma.toLowerCase() !== lookup.word.toLowerCase() && (
          <Text style={s.panelMuted}>as written: {lookup.word}</Text>
        )}
        {lookup.error ? (
          <Text style={{ color: colors.error }}>{lookup.error}</Text>
        ) : !ready ? (
          <ActivityIndicator color={colors.primary} style={{ alignSelf: "flex-start", marginVertical: space.sm }} />
        ) : isWordLookup && lookup.gloss ? (
          <>
            <Text style={s.panelEn}>{lookup.gloss.en}</Text>
            <Text style={s.panelMuted}>{[lookup.gloss.pos, lookup.gloss.note].filter(Boolean).join(" · ")}</Text>
          </>
        ) : (
          <Text style={s.panelEn}>{en}</Text>
        )}
      </ScrollView>

      {card && (
        <View style={s.panelActions}>
          <MakeFlashcard variant="button" word={card} style={{ flex: 1 }} />
          <AddToStudy word={card} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

/** Past articles, newest first. */
function Archive({
  open,
  current,
  onClose,
  onPick,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onPick: (day: string) => void;
}) {
  const [list, setList] = useState<Awaited<ReturnType<typeof api.articles>>["articles"] | null>(null);
  useEffect(() => {
    if (open)
      api
        .articles()
        .then((r) => setList(r.articles))
        .catch(() => setList([]));
  }, [open]);

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.archive}>
        <View style={s.panelTop}>
          <Text style={s.archiveTitle}>Articles</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.textMuted} />
          </Pressable>
        </View>
        {!list ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <ScrollView contentContainerStyle={{ gap: space.sm }}>
            {list.map((a) => (
              <Pressable
                key={a.day}
                onPress={() => onPick(a.day)}
                style={({ pressed }) => [
                  s.archiveRow,
                  a.day === current && s.archiveRowOn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {a.thumbnail ? (
                  <Image source={{ uri: a.thumbnail }} style={s.archiveThumb} />
                ) : (
                  <View style={[s.archiveThumb, { alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="newspaper-outline" size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.archiveDay}>{formatDay(a.day)}</Text>
                  <Text style={s.archiveName} numberOfLines={1}>
                    {a.title}
                  </Text>
                  {!!a.description && (
                    <Text style={s.panelMuted} numberOfLines={1}>
                      {a.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  day: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, fontWeight: "600" },
  image: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  title: { fontFamily: fonts.serif, fontSize: 32, color: colors.text, lineHeight: 38 },
  description: { fontSize: 16, color: colors.textMuted, fontStyle: "italic", marginTop: -space.sm },
  meta: { fontSize: 13, color: colors.textMuted },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: space.md,
  },
  hintText: { flex: 1, fontSize: 13, color: colors.primaryDark },
  heading: { fontFamily: fonts.serif, fontSize: 22, color: colors.primaryDark, marginTop: space.sm },
  paragraph: { gap: 4 },
  body: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 30, color: colors.text },
  wordOn: { backgroundColor: colors.primarySoft, color: colors.primaryDark },
  sentenceOn: { backgroundColor: colors.surfaceAlt },
  paraSpeak: { alignSelf: "flex-end", padding: 2 },
  more: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingVertical: space.md,
  },
  moreText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  credit: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  panelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelLabel: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textMuted,
    fontWeight: "600",
  },
  panelRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  panelFr: { flex: 1, fontFamily: fonts.serif, fontSize: 26, color: colors.text },
  panelEn: { fontSize: 18, color: colors.text },
  panelMuted: { fontSize: 13, color: colors.textMuted },
  panelActions: { flexDirection: "row", gap: space.sm, marginTop: space.xs },
  archive: { flex: 1, backgroundColor: colors.bg, padding: space.lg, gap: space.md },
  archiveTitle: { fontFamily: fonts.serif, fontSize: 28, color: colors.text },
  archiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.sm,
  },
  archiveRowOn: { borderColor: colors.primary },
  archiveThumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  archiveDay: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
    fontWeight: "600",
  },
  archiveName: { fontFamily: fonts.serif, fontSize: 17, color: colors.text },
});
