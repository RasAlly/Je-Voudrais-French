import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Loading } from "../../components/States";
import { Button, Card } from "../../components/ui";
import { api } from "../../lib/api";
import { speakFrench } from "../../lib/speech";
import { useLoad } from "../../lib/useLoad";
import { colors, fonts, space } from "../../theme";

export default function ReviewScreen() {
  const { data, error, loading, reload } = useLoad(async () => {
    const [stats, { items }] = await Promise.all([api.stats(), api.items()]);
    return { stats, learned: items.filter((i) => i.learned) };
  });

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data && loading) return <Loading />;
  if (!data) return null;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <FlatList
        data={data.learned}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.md }}>
            <Text style={s.title}>Révision</Text>
            <Card style={{ gap: space.md, alignItems: "center" }}>
              <Text style={s.big}>{data.stats.due}</Text>
              <Text style={s.muted}>{data.stats.due === 1 ? "card due" : "cards due"} today</Text>
              <Button
                title={data.stats.due ? "Start review" : "All caught up"}
                disabled={!data.stats.due}
                onPress={() => router.push("/review-session")}
                style={{ alignSelf: "stretch" }}
              />
            </Card>
            <Text style={s.section}>Your words · {data.learned.length}</Text>
          </View>
        }
        ListEmptyComponent={<Text style={s.muted}>Finish a lesson to start building your deck.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => speakFrench(item.fr)} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
            <Text style={s.fr}>{item.fr}</Text>
            <Text style={s.en}>{item.en}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
