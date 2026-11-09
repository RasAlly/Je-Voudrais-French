import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Loading } from "../../components/States";
import { Card } from "../../components/ui";
import { api, BASE_URL } from "../../lib/api";
import { useLoad } from "../../lib/useLoad";
import { colors, fonts, radius, space } from "../../theme";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function ProgressScreen() {
  const { data, error, loading, reload } = useLoad(() => api.stats());

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data && loading) return <Loading />;
  if (!data) return null;

  const max = Math.max(20, ...data.week.map((d) => d.xp));

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Progrès</Text>

        <View style={s.grid}>
          <Tile value={`🔥 ${data.streak}`} label="day streak" />
          <Tile value={`${data.totalXp}`} label="total XP" />
          <Tile value={`${data.learned}`} label="words learned" />
          <Tile value={`${data.study}`} label="on study list" />
        </View>

        <Card style={{ gap: space.md }}>
          <Text style={s.cardTitle}>This week</Text>
          <View style={s.chart}>
            {data.week.map((d) => {
              const date = new Date(d.day + "T12:00:00");
              return (
                <View key={d.day} style={s.barCol}>
                  <Text style={s.barValue}>{d.xp || ""}</Text>
                  <View style={s.barTrack}>
                    <View style={[s.bar, { height: `${(d.xp / max) * 100}%` }]} />
                  </View>
                  <Text style={s.barLabel}>{DAY_LETTERS[date.getDay()]}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Text style={s.footer}>Server: {BASE_URL}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileValue}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tile: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  tileValue: { fontSize: 26, fontWeight: "700", color: colors.primary },
  tileLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  chart: { flexDirection: "row", height: 140, gap: space.sm },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontSize: 11, color: colors.textMuted, height: 14 },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  bar: { width: "100%", backgroundColor: colors.primary, borderRadius: radius.sm },
  barLabel: { fontSize: 12, color: colors.textMuted },
  footer: { fontSize: 12, color: colors.locked, textAlign: "center" },
});
