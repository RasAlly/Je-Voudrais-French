import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { speakFrench } from "../lib/speech";
import { colors, fonts, radius, space } from "../theme";

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof Ionicons>["name"];
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = "primary", disabled, loading, icon, style }: ButtonProps) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={18} color={v.fg} />}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.border },
  ghost: { bg: "transparent", fg: colors.textMuted, border: "transparent" },
};

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} />
    </View>
  );
}

/** Speaker + slow-speaker buttons for a French phrase. */
export function SpeakButtons({ text, size = "md" }: { text: string; size?: "md" | "lg" }) {
  const d = size === "lg" ? 72 : 48;
  return (
    <View style={[styles.row, { gap: space.md }]}>
      <Pressable
        onPress={() => speakFrench(text)}
        style={({ pressed }) => [styles.round, { width: d, height: d }, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Ionicons name="volume-high" size={d * 0.45} color={colors.onPrimary} />
      </Pressable>
      <Pressable
        onPress={() => speakFrench(text, { slow: true })}
        style={({ pressed }) => [styles.roundSoft, { width: d * 0.75, height: d * 0.75 }, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Text style={{ fontSize: d * 0.3 }}>🐢</Text>
      </Pressable>
    </View>
  );
}

export function FrenchText({ children, size = 28 }: { children: ReactNode; size?: number }) {
  return <Text style={[styles.french, { fontSize: size }]}>{children}</Text>;
}

export function Choice({
  label,
  onPress,
  state = "idle",
  french,
}: {
  label: string;
  onPress: () => void;
  state?: "idle" | "selected" | "correct" | "wrong";
  french?: boolean;
}) {
  const s = choiceStates[state];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.choice, { backgroundColor: s.bg, borderColor: s.border }, pressed && styles.pressed]}
    >
      <Text style={[styles.choiceText, french && { fontFamily: fonts.serif }, { color: s.fg }]}>{label}</Text>
    </Pressable>
  );
}

const choiceStates = {
  idle: { bg: colors.surface, border: colors.border, fg: colors.text },
  selected: { bg: colors.primarySoft, border: colors.primary, fg: colors.primaryDark },
  correct: { bg: colors.successSoft, border: colors.success, fg: colors.success },
  wrong: { bg: colors.errorSoft, border: colors.error, fg: colors.error },
};

/** Title row for pushed screens: back chevron + serif title + optional right content. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.screenHeader}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.backButton, pressed && { backgroundColor: colors.surfaceAlt }]}
      >
        <Ionicons name="chevron-back" size={26} color={colors.textMuted} />
      </Pressable>
      <Text style={styles.screenTitle} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Pill-style segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.segment, value === o.value && styles.segmentOn]}
        >
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Small selectable chip. */
export function Chip({ label, selected, onPress, disabled }: { label: string; selected?: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipOn, disabled && { opacity: 0.4 }]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Center({ children }: { children: ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  buttonText: { fontSize: 16, fontWeight: "600", letterSpacing: 0.3 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: "hidden", flex: 1 },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.pill },
  round: { borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  roundSoft: {
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  french: { fontFamily: fonts.serif, color: colors.text, textAlign: "center" },
  choice: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: space.md,
  },
  choiceText: { fontSize: 17, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, gap: space.md },
  screenHeader: { flexDirection: "row", alignItems: "center", gap: space.xs, marginLeft: -space.sm },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  screenTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 28, color: colors.text },
  segmented: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 3 },
  segment: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.pill, alignItems: "center" },
  segmentOn: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  segmentTextOn: { color: colors.primary },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  chipTextOn: { color: colors.onPrimary },
});
