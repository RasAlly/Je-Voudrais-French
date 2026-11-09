import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KIND_ICONS, Session } from "../../components/Session";
import { ErrorState, Loading } from "../../components/States";
import { Button, Chip, Segmented } from "../../components/ui";
import { api, type Item } from "../../lib/api";
import { buildCustom, type Exercise, type GradedKind } from "../../lib/exercises";
import { colors, fonts, radius, space } from "../../theme";

const TYPES: { kind: GradedKind; label: string; description: string }[] = [
  { kind: "choose_en", label: "Multiple choice", description: "See the French, pick the English" },
  { kind: "listen_choose", label: "Listen & pick", description: "Hear it, pick the French" },
  { kind: "type_fr", label: "Type it", description: "See the English, type the French" },
  { kind: "dictation", label: "Dictation", description: "Hear it, type what you heard" },
  { kind: "arrange", label: "Build the sentence", description: "Tap the words into order" },
  { kind: "speak", label: "Speak", description: "Say it out loud" },
];

type Length = "10" | "20" | "all";
const LENGTHS: { value: Length; label: string }[] = [
  { value: "10", label: "Quick · 10" },
  { value: "20", label: "Standard · 20" },
  { value: "all", label: "Everything" },
];

type UnitData = {
  title: string;
  en?: string;
  lessons: { id: string; title: string; items: Item[] }[];
  pool: Item[];
};

function close() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function CustomScreen() {
  const { unit: unitId } = useLocalSearchParams<{ unit: string }>();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<UnitData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kinds, setKinds] = useState<GradedKind[]>(["choose_en", "type_fr"]);
  const [lessonIds, setLessonIds] = useState<string[] | null>(null); // null = all lessons
  const [length, setLength] = useState<Length>("20");
  const [exercises, setExercises] = useState<Exercise[] | null>(null);

  const load = () => {
    (async () => {
      const { units } = await api.course();
      const unit = units.find((u) => u.id === unitId);
      if (!unit) throw new Error("Unit not found");
      const lessons = await Promise.all(unit.lessons.map((l) => api.lesson(l.id)));
      setData({
        title: unit.title,
        en: unit.en,
        lessons: lessons.map((l) => l.lesson),
        pool: lessons[0]?.pool ?? [],
      });
    })().catch((e) => setError(e.message));
  };
  useEffect(load, [unitId]);

  if (error) return <ErrorState message={error} onRetry={() => (setError(null), load())} />;
  if (!data) return <Loading />;

  if (exercises)
    return (
      <Session
        title={`Custom · ${data.title}`}
        exercises={exercises}
        onFinish={async ({ xp }) => {
          await api.addXp(xp).catch(() => {});
        }}
      />
    );

  const chosenLessons = data.lessons.filter((l) => !lessonIds || lessonIds.includes(l.id));
  const items = chosenLessons.flatMap((l) => l.items);
  const possible = buildCustom(items, data.pool, kinds).length;
  const count = length === "all" ? possible : Math.min(Number(length), possible);
  const canStart = kinds.length > 0 && items.length > 0;

  const toggleKind = (k: GradedKind) => {
    Haptics.selectionAsync().catch(() => {});
    setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));
  };
  const toggleLesson = (id: string) => {
    const current = lessonIds ?? data.lessons.map((l) => l.id);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setLessonIds(next);
  };

  return (
    <SafeAreaView style={s.screen} edges={["bottom", "left", "right"]}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 24) + space.md }]}>
        <Pressable onPress={close} hitSlop={16} style={s.close} accessibilityLabel="Close">
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Custom practice</Text>
          <Text style={s.subtitle}>
            {data.title}
            {data.en ? ` · ${data.en}` : ""}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.section}>Exercise types</Text>
        <View style={{ gap: space.sm }}>
          {TYPES.map((t) => {
            const on = kinds.includes(t.kind);
            return (
              <Pressable
                key={t.kind}
                onPress={() => toggleKind(t.kind)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={({ pressed }) => [s.type, on && s.typeOn, pressed && { opacity: 0.85 }]}
              >
                <View style={[s.typeIcon, on && { backgroundColor: colors.primary }]}>
                  <Ionicons
                    name={KIND_ICONS[t.kind] as ComponentProps<typeof Ionicons>["name"]}
                    size={20}
                    color={on ? colors.onPrimary : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.typeLabel}>{t.label}</Text>
                  <Text style={s.typeDesc}>{t.description}</Text>
                </View>
                <Ionicons
                  name={on ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={on ? colors.primary : colors.border}
                />
              </Pressable>
            );
          })}
        </View>

        {data.lessons.length > 1 && (
          <>
            <Text style={s.section}>Words from</Text>
            <View style={s.chips}>
              {data.lessons.map((l) => (
                <Chip
                  key={l.id}
                  label={`${l.title} · ${l.items.length}`}
                  selected={!lessonIds || lessonIds.includes(l.id)}
                  onPress={() => toggleLesson(l.id)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={s.section}>Length</Text>
        <Segmented options={LENGTHS} value={length} onChange={setLength} />
      </ScrollView>

      <Button
        title={
          !kinds.length
            ? "Pick at least one type"
            : !items.length
              ? "Pick at least one lesson"
              : `Start · ${count} exercises`
        }
        icon={canStart ? "play" : undefined}
        disabled={!canStart}
        onPress={() =>
          setExercises(buildCustom(items, data.pool, kinds, length === "all" ? undefined : Number(length)))
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingBottom: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingBottom: space.sm },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  content: { gap: space.sm, paddingVertical: space.md },
  section: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: space.md,
  },
  type: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  typeOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  typeDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
