import * as Speech from "expo-speech";

let voiceId: string | undefined;
let voiceLookup: Promise<void> | null = null;

/** Pick the best installed French voice (enhanced/premium if available). */
function findVoice() {
  if (!voiceLookup) {
    voiceLookup = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const fr = voices.filter((v) => v.language?.toLowerCase().startsWith("fr"));
        const ranked = fr.sort((a, b) => {
          const score = (v: Speech.Voice) =>
            (v.language === "fr-FR" ? 2 : 0) + (v.quality === Speech.VoiceQuality.Enhanced ? 3 : 0);
          return score(b) - score(a);
        });
        voiceId = ranked[0]?.identifier;
      })
      .catch(() => {});
  }
  return voiceLookup;
}

export async function speakFrench(text: string, opts: { slow?: boolean } = {}) {
  await findVoice();
  Speech.stop();
  Speech.speak(text, {
    language: "fr-FR",
    voice: voiceId,
    rate: opts.slow ? 0.55 : 0.9,
  });
}

export function stopSpeaking() {
  Speech.stop();
}
