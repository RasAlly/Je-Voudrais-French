import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { api, type Item } from "../lib/api";
import { colors, radius } from "../theme";
import { Button } from "./ui";

type Word = { fr: string; en: string; note?: string };

type Props = {
  /** An existing word (course item or one you already kept)… */
  item?: Item;
  /** …or a new word/phrase that isn't an item yet (numbers, translations). */
  word?: Word;
  /** "icon" = compact round button, "button" = full labelled button. */
  variant?: "icon" | "button";
  style?: ViewStyle;
};

/** "Make flashcard": adds the word to your Saved flashcard deck. */
export function MakeFlashcard({ item, word, variant = "icon", style }: Props) {
  const key = item?.id ?? word?.fr ?? "";
  // Remember which word was added, so the button resets when the word changes.
  const [addedKey, setAddedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const added = addedKey === key;

  const make = async () => {
    if (added || busy || !key) return;
    setBusy(true);
    setFailed(false);
    try {
      if (item) await api.save(item.id);
      else if (word) await api.saveWord({ ...word, to: "saved" });
      setAddedKey(key);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (variant === "button")
    return (
      <Button
        title={added ? "Flashcard made" : failed ? "Try again" : "Make flashcard"}
        icon={added ? "checkmark" : "albums-outline"}
        variant="secondary"
        loading={busy}
        disabled={added}
        onPress={make}
        style={style}
      />
    );

  return (
    <Pressable
      onPress={make}
      disabled={added || busy}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={added ? "Flashcard made" : "Make flashcard"}
      style={({ pressed }) => [s.icon, added && s.iconOn, pressed && { opacity: 0.7 }, style]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={added ? "checkmark" : failed ? "alert" : "albums-outline"}
          size={20}
          color={added ? colors.onPrimary : failed ? colors.error : colors.primary}
        />
      )}
    </Pressable>
  );
}

/** "Study list" button for a new word/phrase (adds it to the deep-dive study list). */
export function AddToStudy({ word, style }: { word: Word; style?: ViewStyle }) {
  const [addedKey, setAddedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const added = addedKey === word.fr;
  return (
    <Button
      title={added ? "On study list" : failed ? "Try again" : "Study list"}
      icon={added ? "checkmark" : "school-outline"}
      variant="secondary"
      loading={busy}
      disabled={added}
      style={style}
      onPress={async () => {
        setBusy(true);
        setFailed(false);
        try {
          await api.saveWord({ ...word, to: "study" });
          setAddedKey(word.fr);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch {
          setFailed(true);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

const s = StyleSheet.create({
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOn: { backgroundColor: colors.success },
});
