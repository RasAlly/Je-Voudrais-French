import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Loading } from "../../components/States";
import { api, type LessonSummary } from "../../lib/api";
import { useLoad } from "../../lib/useLoad";
import { colors, fonts, radius, space } from "../../theme";

export default function LearnScreen() {
  const { data, error, loading, reload } = useLoad(async () => {
    const [course, stats] = await Promise.all([api.course(), api.stats()]);
    return { ...course, stats };
  });

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data && loading) return <Loading />;
  if (!data) return null;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.topBar}>
          <Text style={s.brand}>Je voudrais…</Text>
          <View style={s.pills}>
            <View style={s.pill}>
              <Text style={s.pillText}>🔥 {data.stats.streak}</Text>
            </View>
            <View style={s.pill}>
              <Text style={s.pillText}>{data.stats.xpToday} XP</Text>
            </View>
          </View>
        </View>

        {data.stats.due > 0 && (
          <Pressable style={s.dueBanner} onPress={() => router.push("/review-session")}>
            <Ionicons name="layers" size={20} color={colors.onPrimary} />
            <Text style={s.dueText}>
              {data.stats.due} {data.stats.due === 1 ? "word" : "words"} ready to review
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} />
          </Pressable>
        )}

        {data.stats.study > 0 && (
          <Pressable style={s.studyBanner} onPress={() => router.push("/study-session")}>
            <Ionicons name="bookmark" size={18} color={colors.primary} />
            <Text style={s.studyText}>
              Deep dive · {data.stats.study} {data.stats.study === 1 ? "word" : "words"} on your study list
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        )}

        {data.units.map((unit, ui) => (
          <View key={unit.id} style={s.unit}>
            <Text style={s.unitLabel}>Unité {ui + 1}</Text>
            <View style={s.unitTitleRow}>
              <Text style={s.unitTitle}>{unit.title}</Text>
              {unit.en && <Text style={s.unitEn}>{unit.en}</Text>}
            </View>
            <View style={s.lessons}>
              {unit.lessons.map((l) => (
                <LessonRow key={l.id} lesson={l} />
              ))}
              <Pressable
                onPress={() => router.push(`/custom/${unit.id}`)}
                style={({ pressed }) => [s.lesson, s.custom, pressed && { opacity: 0.85 }]}
              >
                <View style={[s.badge, s.badgeCustom]}>
                  <Ionicons name="options-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lessonTitle}>Custom practice</Text>
                  <Text style={s.lessonSub}>Pick your exercise types</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function LessonRow({ lesson }: { lesson: LessonSummary }) {
  const done = lesson.completions > 0;
  return (
    <Pressable
      disabled={!lesson.unlocked}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      style={({ pressed }) => [s.lesson, !lesson.unlocked && s.lessonLocked, pressed && { opacity: 0.85 }]}
    >
      <View style={[s.badge, done && s.badgeDone, !lesson.unlocked && s.badgeLocked]}>
        <Ionicons
          name={!lesson.unlocked ? "lock-closed" : done ? "checkmark" : "play"}
          size={18}
          color={!lesson.unlocked ? colors.surface : colors.onPrimary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.lessonTitle, !lesson.unlocked && { color: colors.locked }]}>{lesson.title}</Text>
        <Text style={s.lessonSub}>
          {lesson.subtitle} · {lesson.itemCount} words
        </Text>
      </View>
      {done && <Text style={s.best}>{lesson.bestScore}%</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: fonts.serif, fontSize: 28, color: colors.primaryDark, fontStyle: "italic" },
  pills: { flexDirection: "row", gap: space.sm },
  pill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillText: { fontSize: 14, fontWeight: "600", color: colors.text },
  dueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.primary,
    padding: space.md,
    borderRadius: radius.md,
  },
  studyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.primarySoft,
    padding: space.md,
    borderRadius: radius.md,
    marginTop: -space.sm,
  },
  studyText: { flex: 1, color: colors.primaryDark, fontSize: 15, fontWeight: "600" },
  dueText: { flex: 1, color: colors.onPrimary, fontSize: 16, fontWeight: "600" },
  unit: { gap: 2 },
  unitLabel: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, fontWeight: "600" },
  unitTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: space.sm,
    marginBottom: space.sm,
  },
  unitTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.text },
  unitEn: { fontSize: 14, color: colors.textMuted },
  lessons: { gap: space.sm },
  lesson: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  lessonLocked: { backgroundColor: "transparent" },
  custom: { backgroundColor: "transparent", borderStyle: "dashed", borderColor: colors.primary },
  badgeCustom: { backgroundColor: colors.primarySoft },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDone: { backgroundColor: colors.success },
  badgeLocked: { backgroundColor: colors.locked },
  lessonTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  lessonSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  best: { fontSize: 13, color: colors.success, fontWeight: "600" },
});
