import { useCallback, useState } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { api } from "./api";

export type RecState = "idle" | "recording" | "transcribing";

/** Record from the mic, then send to the server for French transcription. */
export function useSpeechToText() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<RecState>("idle");
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError("Microphone permission is needed to practice speaking.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setState("recording");
  }, [recorder]);

  /** Stops recording and resolves with the transcript (or null on failure). */
  const stop = useCallback(async (): Promise<string | null> => {
    await recorder.stop();
    // Switch back to playback mode so text-to-speech isn't routed to the earpiece.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const uri = recorder.uri;
    if (!uri) {
      setState("idle");
      return null;
    }
    setState("transcribing");
    try {
      return await api.transcribe(uri);
    } catch (e: any) {
      setError(e.message ?? "Couldn't transcribe that.");
      return null;
    } finally {
      setState("idle");
    }
  }, [recorder]);

  return { state, error, start, stop };
}
