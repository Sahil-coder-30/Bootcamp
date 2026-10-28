import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearSession, readSession, writeSession } from "@/lib/authStorage";
import { setSessionLostHandler, toErrorMessage } from "@/services/apiClient";
import {
  getMeAPI,
  googleLoginAPI,
  logoutAPI,
  updateMeAPI,
  type ProfilePatch,
} from "../service/auth.api";
import { setAuthError, setAuthLoading, setAuthReady, setAuthUser } from "../slice/auth.slice";

/** Reads the signed-in user. Call `useAuthBootstrap` once near the app root. */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, ready, loading, error } = useAppSelector((s) => s.auth);

  const signInWithGoogle = useCallback(
    async (credential: string): Promise<boolean> => {
      dispatch(setAuthLoading(true));
      try {
        const session = await googleLoginAPI(credential);
        writeSession({ accessToken: session.accessToken, refreshToken: session.refreshToken });
        dispatch(setAuthUser(session.user));
        return true;
      } catch (err) {
        dispatch(setAuthError(toErrorMessage(err, "Google sign-in failed")));
        return false;
      }
    },
    [dispatch],
  );

  const signOut = useCallback(async () => {
    const session = readSession();
    clearSession();
    dispatch(setAuthUser(null));
    if (session) await logoutAPI(session.refreshToken).catch(() => {});
  }, [dispatch]);

  const updateProfile = useCallback(
    async (patch: ProfilePatch): Promise<boolean> => {
      dispatch(setAuthLoading(true));
      try {
        dispatch(setAuthUser(await updateMeAPI(patch)));
        return true;
      } catch (err) {
        dispatch(setAuthError(toErrorMessage(err, "Could not save profile")));
        return false;
      }
    },
    [dispatch],
  );

  return { user, ready, loading, error, signInWithGoogle, signOut, updateProfile };
}

/** On first mount, restores the user from a saved session. */
export function useAuthBootstrap() {
  const dispatch = useAppDispatch();
  const ready = useAppSelector((s) => s.auth.ready);

  // A refresh that fails for good (expired/revoked) signs the user out everywhere.
  useEffect(() => {
    setSessionLostHandler(() => dispatch(setAuthUser(null)));
  }, [dispatch]);

  useEffect(() => {
    if (ready) return;
    if (!readSession()) {
      dispatch(setAuthReady());
      return;
    }
    getMeAPI()
      .then((user) => dispatch(setAuthUser(user)))
      .catch(() => dispatch(setAuthUser(null)));
  }, [dispatch, ready]);
}
