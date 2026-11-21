import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, type Profile, setProfileId } from "./api";

const STORAGE_KEY = "je-voudrais/profile";

type ProfileState = {
  profile: Profile | null;
  /** Still reading the saved choice from the device. */
  loading: boolean;
  choose: (p: Profile) => Promise<void>;
  /** Forget this device's choice and show the picker again. */
  switchProfile: () => Promise<void>;
  rename: (name: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileState | null>(null);

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile outside ProfileProvider");
  return ctx;
}

/** Remembers which learner uses this device and sends it with every request. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const p = JSON.parse(saved) as Profile;
          setProfileId(p.id);
          setProfile(p);
          // Pick up a rename made on another device (and drop a profile that no longer exists).
          api
            .profiles()
            .then(({ profiles }) => {
              const fresh = profiles.find((x) => x.id === p.id);
              if (!fresh) {
                setProfileId(null);
                setProfile(null);
                AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
              } else if (fresh.name !== p.name) {
                setProfile(fresh);
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => {});
              }
            })
            .catch(() => {}); // offline: keep the saved choice
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const choose = useCallback(async (p: Profile) => {
    setProfileId(p.id);
    setProfile(p);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p)).catch(() => {});
  }, []);

  const switchProfile = useCallback(async () => {
    setProfileId(null);
    setProfile(null);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const rename = useCallback(
    async (name: string) => {
      if (!profile) return;
      const { profile: p } = await api.renameProfile(profile.id, name);
      await choose(p);
    },
    [profile, choose],
  );

  return (
    <ProfileContext.Provider value={{ profile, loading, choose, switchProfile, rename }}>
      {children}
    </ProfileContext.Provider>
  );
}
