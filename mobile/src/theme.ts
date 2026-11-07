import { Platform } from "react-native";

/** Warm, minimal palette: paper, coffee and espresso. */
export const colors = {
  bg: "#F4EDE3",
  surface: "#FBF7F1",
  surfaceAlt: "#EDE3D6",
  border: "#E2D5C4",
  text: "#2B2118",
  textMuted: "#8A7967",
  primary: "#7A5235",
  primaryDark: "#5C3D27",
  primarySoft: "#E8D9C7",
  onPrimary: "#FBF7F1",
  success: "#6B7B4C",
  successSoft: "#E4E6D3",
  error: "#A8503A",
  errorSoft: "#F1DCD3",
  locked: "#CBBBA8",
};

export const fonts = {
  /** Serif for French text — gives it a bookish feel. */
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
