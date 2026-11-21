import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Profile } from "../lib/api";
import { useProfile } from "../lib/profile";
import { colors, fonts, radius, space } from "../theme";
import { Button } from "./ui";

/** "Qui apprend ?" — shown until this device has chosen a learner. */
export function ProfilePicker() {
  const { choose } = useProfile();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    api
      .profiles()
      .then((r) => setProfiles(r.profiles))
      .catch((e) => setError((e as Error).message));
  };
  useEffect(load, []);

  const create = async () => {
    const n = name.trim();
    if (!n || creating) return;
    setCreating(true);
    try {
      const { profile } = await api.createProfile(n);
      await choose(profile);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.brand}>Je voudrais…</Text>
          <Text style={s.title}>Qui apprend ?</Text>
          <Text style={s.muted}>Pick your profile. Each person keeps their own streak, XP and cards.</Text>

          {error && (
            <Pressable onPress={() => (setError(null), load())}>
              <Text style={s.error}>{error} · tap to retry</Text>
            </Pressable>
          )}
          {!profiles && !error && <ActivityIndicator color={colors.primary} />}

          {profiles?.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => choose(p)}
              style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={s.name}>{p.name}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          ))}

          {profiles && (
            <View style={s.newBox}>
              <Text style={s.section}>{profiles.length ? "Or add someone new" : "Create your profile"}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={create}
                style={s.input}
              />
              <Button
                title="Start learning"
                icon="arrow-forward"
                loading={creating}
                disabled={!name.trim()}
                onPress={create}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingTop: space.xl },
  brand: { fontFamily: fonts.serif, fontSize: 22, color: colors.primaryDark, fontStyle: "italic" },
  title: { fontFamily: fonts.serif, fontSize: 36, color: colors.text },
  muted: { fontSize: 15, color: colors.textMuted, marginBottom: space.sm },
  error: { color: colors.error },
  row: {
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
  name: { flex: 1, fontSize: 18, fontWeight: "600", color: colors.text },
  newBox: { gap: space.sm, marginTop: space.md },
  section: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, fontWeight: "600" },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 18,
    color: colors.text,
  },
});
