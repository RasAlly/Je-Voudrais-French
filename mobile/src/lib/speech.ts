import { setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";

let voiceId: string | undefined;
let voiceLookup: Promise<void> | null = null;
let audioReady: Promise<void> | null = null;

/**
 * Without this, iOS mutes all app audio (including text-to-speech) when the
 * ring/silent switch is set to silent. Call once at startup.
 */
export function initAudio() {
  if (!audioReady) {
    audioReady = setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch((e) =>
      console.warn("audio mode", e),
    );
  }
  return audioReady;
}

/** Pick the best installed French voice (enhanced/premium if available). */
function findVoice() {
  if (!voiceLookup) {
    voiceLookup = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const fr = voices.filter((v) => v.language?.toLowerCase().replace("_", "-").startsWith("fr"));
        const score = (v: Speech.Voice) =>
          (v.language === "fr-FR" ? 2 : 0) + (v.quality === Speech.VoiceQuality.Enhanced ? 3 : 0);
        voiceId = fr.sort((a, b) => score(b) - score(a))[0]?.identifier;
        if (!voiceId) console.warn("No French voice installed — using the system default.");
      })
      .catch(() => {});
  }
  return voiceLookup;
}

export async function speakFrench(text: string, opts: { slow?: boolean } = {}) {
  await Promise.all([initAudio(), findVoice()]);
  // Starting a new utterance while stop() is still in flight can cancel it on iOS.
  if (await Speech.isSpeakingAsync()) await Speech.stop();

  const base = { language: "fr-FR", rate: opts.slow ? 0.55 : 0.9 };
  Speech.speak(text, {
    ...base,
    voice: voiceId,
    onError: (e) => {
      console.warn("speech error, retrying with default voice", e);
      voiceId = undefined;
      Speech.speak(text, base);
    },
  });
}

export function stopSpeaking() {
  Speech.stop();
}
