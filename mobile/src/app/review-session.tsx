import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Session } from "../components/Session";
import { ErrorState, Loading } from "../components/States";
import { Button, Center } from "../components/ui";
import { api } from "../lib/api";
import { buildReview, type Exercise } from "../lib/exercises";
import { colors, fonts } from "../theme";

export default function ReviewSession() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .review()
      .then(({ items, pool }) => setExercises(buildReview(items, pool)))
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={() => (setError(null), load())} />;
  if (!exercises) return <Loading />;
  if (exercises.length === 0)
    return (
      <Center>
        <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: colors.text }}>Rien à réviser</Text>
        <Text style={{ color: colors.textMuted }}>Nothing is due. Come back later!</Text>
        <Button title="Back" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </Center>
    );

  return (
    <Session
      exercises={exercises}
      onFinish={async ({ firstTry, xp }) => {
        await api
          .submitReview({
            xp,
            // first-try correct → "good", otherwise "again"
            results: Object.entries(firstTry).map(([itemId, ok]) => ({ itemId, grade: ok ? 2 : 0 })),
          })
          .catch(() => {});
      }}
    />
  );
}
