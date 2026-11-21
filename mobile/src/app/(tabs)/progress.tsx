import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Loading } from "../../components/States";
import { Card } from "../../components/ui";
import { api, BASE_URL } from "../../lib/api";
import { useProfile } from "../../lib/profile";
import { useLoad } from "../../lib/useLoad";
import { colors, fonts, radius, space } from "../../theme";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function ProgressScreen() {
  const { data, error, loading, reload } = useLoad(() => api.stats());
  const { profile, switchProfile, rename } = useProfile();

  const askRename = () =>
    Alert.prompt(
      "Rename profile",
      undefined,
      (name) => {
        if (name?.trim()) rename(name.trim()).catch((e) => Alert.alert("Couldn't rename", (e as Error).message));
      },
      "plain-text",
      profile?.name,
    );

  const askSwitch = () =>
    Alert.alert("Switch profile?", "You'll pick who's learning on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Switch", onPress: () => switchProfile() },
    ]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data && loading) return <Loading />;
  if (!data) return null;

  const max = Math.max(20, ...data.week.map((d) => d.xp));

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Progrès</Text>

        <View style={s.profile}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile?.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Pressable onPress={askRename} style={{ flex: 1 }} accessibilityLabel="Rename profile">
            <Text style={s.profileName}>{profile?.name}</Text>
            <Text style={s.profileHint}>Tap to rename</Text>
          </Pressable>
          <Pressable onPress={askSwitch} hitSlop={8} style={s.switch}>
            <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
            <Text style={s.switchText}>Switch</Text>
          </Pressable>
        </View>

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
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.serif, fontSize: 20, color: colors.onPrimary },
  profileName: { fontSize: 18, fontWeight: "600", color: colors.text },
  profileHint: { fontSize: 12, color: colors.textMuted },
  switch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  switchText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  footer: { fontSize: 12, color: colors.locked, textAlign: "center" },
});
