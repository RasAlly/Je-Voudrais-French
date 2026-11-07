import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Session } from "../../components/Session";
import { ErrorState, Loading } from "../../components/States";
import { api } from "../../lib/api";
import { buildLesson, type Exercise } from "../../lib/exercises";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .lesson(id)
      .then(({ lesson, pool }) => setExercises(buildLesson(lesson.items, pool)))
      .catch((e) => setError(e.message));
  };
  useEffect(load, [id]);

  if (error) return <ErrorState message={error} onRetry={() => (setError(null), load())} />;
  if (!exercises) return <Loading />;

  return (
    <Session
      exercises={exercises}
      onFinish={async ({ firstTry, score, xp }) => {
        await api
          .completeLesson(id, {
            score,
            xp,
            results: Object.entries(firstTry).map(([itemId, correct]) => ({ itemId, correct })),
          })
          .catch(() => {});
      }}
    />
  );
}
