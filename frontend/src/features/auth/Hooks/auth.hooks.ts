import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearSession, readSession, writeSession } from "@/lib/authStorage";
import { setSessionLostHandler, toErrorMessage } from "@/services/apiClient";
import { getMeAPI, logoutAPI, updateMeAPI, type ProfilePatch, type AuthUser } from "../service/auth.api";
import { setAuthError, setAuthLoading, setAuthReady, setAuthUser } from "../slice/auth.slice";
import { saveStoredUser, clearStoredUser, getStoredUser, formatNameFromEmail, type CandidateUser } from "@/lib/auth";

function syncCandidateUser(authUser: AuthUser): void {
  const name = authUser.name || formatNameFromEmail(authUser.email);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CU";

  const candidate: CandidateUser = {
    id: authUser.candidateProfileId || authUser.id,
    name,
    role: authUser.branch ? `${authUser.branch} (${authUser.college || "Campus"})` : "Campus Candidate",
    avatarText: initials,
    email: authUser.email,
  };
  saveStoredUser(candidate);
}

/** Reads the signed-in user. Call `useAuthBootstrap` once near the app root. */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, ready, loading, error } = useAppSelector((s) => s.auth);

  /** Called by /auth/callback with the tokens the auth service put in the URL fragment. */
  const completeSignIn = useCallback(
    async (accessToken: string, refreshToken: string): Promise<boolean> => {
      dispatch(setAuthLoading(true));
      writeSession({ accessToken, refreshToken });
      try {
        const authUser = await getMeAPI();
        dispatch(setAuthUser(authUser));
        syncCandidateUser(authUser);
        return true;
      } catch (err) {
        clearSession();
        clearStoredUser();
        dispatch(setAuthError(toErrorMessage(err, "Sign-in failed")));
        return false;
      }
    },
    [dispatch],
  );

  const signOut = useCallback(async () => {
    const session = readSession();
    clearSession();
    clearStoredUser();
    dispatch(setAuthUser(null));
    if (session) await logoutAPI(session.refreshToken).catch(() => {});
  }, [dispatch]);

  const updateProfile = useCallback(
    async (patch: ProfilePatch): Promise<boolean> => {
      dispatch(setAuthLoading(true));
      try {
        const updated = await updateMeAPI(patch);
        dispatch(setAuthUser(updated));
        syncCandidateUser(updated);
        return true;
      } catch (err) {
        dispatch(setAuthError(toErrorMessage(err, "Could not save profile")));
        return false;
      }
    },
    [dispatch],
  );

  return { user, ready, loading, error, completeSignIn, signOut, updateProfile };
}

/** On first mount, restores the user from a saved session. */
export function useAuthBootstrap() {
  const dispatch = useAppDispatch();
  const ready = useAppSelector((s) => s.auth.ready);

  // A refresh that fails for good (expired/revoked) signs the user out everywhere.
  useEffect(() => {
    setSessionLostHandler(() => {
      clearStoredUser();
      dispatch(setAuthUser(null));
    });
  }, [dispatch]);

  useEffect(() => {
    if (ready) return;
    if (!readSession()) {
      dispatch(setAuthReady());
      return;
    }
    getMeAPI()
      .then((authUser) => {
        dispatch(setAuthUser(authUser));
        const stored = getStoredUser();
        if (!stored || !stored.email) {
          syncCandidateUser(authUser);
        }
      })
      .catch(() => {
        clearStoredUser();
        dispatch(setAuthUser(null));
      });
  }, [dispatch, ready]);
}
