import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Session } from "../components/Session";
import { ErrorState, Loading } from "../components/States";
import { Button, Center } from "../components/ui";
import { api } from "../lib/api";
import { buildDeepDive, type Exercise } from "../lib/exercises";
import { colors, fonts } from "../theme";

/** How many study-list words go into one deep dive (each gets ~6 exercises). */
const WORDS_PER_SESSION = 5;

export default function StudySession() {
  // Optional ?item=<id> to deep-dive a single word from the list.
  const { item } = useLocalSearchParams<{ item?: string }>();
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .study()
      .then(({ items, pool }) => {
        // Words with the least progress first.
        const picked = item
          ? items.filter((i) => i.id === item)
          : [...items].sort((a, b) => a.cleanRuns - b.cleanRuns).slice(0, WORDS_PER_SESSION);
        setExercises(buildDeepDive(picked, pool));
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [item]);

  if (error) return <ErrorState message={error} onRetry={() => (setError(null), load())} />;
  if (!exercises) return <Loading />;
  if (exercises.length === 0)
    return (
      <Center>
        <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: colors.text }}>Liste vide</Text>
        <Text style={{ color: colors.textMuted, textAlign: "center" }}>
          Tap “Don&apos;t know” on a typing exercise to save words here.
        </Text>
        <Button title="Back" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </Center>
    );

  return (
    <Session
      title="Deep dive"
      exercises={exercises}
      onFinish={async ({ firstTry, missed }) => {
        // A word counts as "clean" only if every exercise on it was right first time.
        const results = Object.keys(firstTry).map((itemId) => ({ itemId, clean: !missed[itemId] }));
        const xp = 10 + results.filter((r) => r.clean).length * 3;
        await api.submitStudy({ xp, results }).catch(() => {});
      }}
    />
  );
}
