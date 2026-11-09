import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GrammarDrill } from "../../../components/GrammarDrill";
import { Button, Center, ScreenHeader } from "../../../components/ui";
import { grammarById, type GrammarSection } from "../../../lib/grammar";
import { speakFrench, stopSpeaking } from "../../../lib/speech";
import { colors, fonts, radius, space } from "../../../theme";

const DRILL_LENGTH = 10;

export default function GrammarTopicScreen() {
  const { topic: id } = useLocalSearchParams<{ topic: string }>();
  const topic = grammarById.get(id);
  // Bumping the key restarts the drill with a fresh set of questions.
  const [drill, setDrill] = useState<number | null>(null);
  useEffect(() => () => stopSpeaking(), []);

  if (!topic)
    return (
      <Center>
        <Text style={s.body}>Topic not found.</Text>
      </Center>
    );

  if (drill !== null)
    return (
      <GrammarDrill
        key={drill}
        topic={topic}
        length={DRILL_LENGTH}
        onExit={() => setDrill(null)}
        onRetry={() => setDrill((d) => (d ?? 0) + 1)}
      />
    );

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <View style={{ paddingHorizontal: space.lg }}>
        <ScreenHeader title={topic.title} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.en}>{topic.en}</Text>
        {topic.sections.map((sec) => (
          <Section key={sec.heading} section={sec} />
        ))}
      </ScrollView>
      <View style={s.footer}>
        <Button
          title={`Practice · ${Math.min(DRILL_LENGTH, topic.questions.length)} questions`}
          icon="play"
          onPress={() => setDrill(0)}
        />
      </View>
    </SafeAreaView>
  );
}

function Section({ section }: { section: GrammarSection }) {
  return (
    <View style={s.section}>
      <Text style={s.heading}>{section.heading}</Text>
      {section.body && <Text style={s.body}>{section.body}</Text>}
      {section.table && (
        <View style={s.table}>
          {section.table.map((row, ri) => (
            <View
              key={ri}
              style={[s.tr, ri === 0 && s.th, ri === section.table!.length - 1 && { borderBottomWidth: 0 }]}
            >
              {row.map((cell, ci) => (
                <Text key={ci} style={[s.td, ri === 0 ? s.thText : ci > 0 && s.tdFr]}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
      {section.examples?.map((ex) => (
        <Pressable key={ex.fr} onPress={() => speakFrench(ex.fr)} style={s.example}>
          <Ionicons name="volume-medium-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.exFr}>{ex.fr}</Text>
            <Text style={s.exEn}>{ex.en}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.lg },
  en: { fontSize: 15, color: colors.textMuted, marginTop: -space.xs },
  section: { gap: space.sm },
  heading: { fontFamily: fonts.serif, fontSize: 21, color: colors.primaryDark },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  table: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  tr: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  th: { backgroundColor: colors.surfaceAlt },
  td: { flex: 1, paddingVertical: 9, paddingHorizontal: 10, fontSize: 14, color: colors.text },
  thText: { fontWeight: "700", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  tdFr: { fontFamily: fonts.serif, fontSize: 15 },
  example: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  exFr: { fontFamily: fonts.serif, fontSize: 17, color: colors.text },
  exEn: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  footer: { paddingHorizontal: space.lg, paddingVertical: space.sm },
});
