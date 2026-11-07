import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { colors } from "../../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.locked,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Learn", tabBarIcon: icon("book-outline") }} />
      <Tabs.Screen name="review" options={{ title: "Review", tabBarIcon: icon("layers-outline") }} />
      <Tabs.Screen name="speak" options={{ title: "Speak", tabBarIcon: icon("mic-outline") }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: icon("stats-chart-outline") }} />
    </Tabs>
  );
}
