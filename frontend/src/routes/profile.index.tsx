import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileBuilder from "@/features/profile/components/ProfileBuilder";
import { getStoredUser, saveStoredUser } from "@/lib/auth";
import { apiClient } from "@/services/apiClient";
import { useAppDispatch, useAppSelector } from "@/store";
import { updateMeAPI } from "@/features/auth/service/auth.api";
import { setAuthUser } from "@/features/auth/slice/auth.slice";

export const Route = createFileRoute("/profile/")({
  validateSearch: (search: Record<string, unknown>): { extraction?: string } =>
    typeof search["extraction"] === "string" && search["extraction"]
      ? { extraction: search["extraction"] }
      : {},
  component: MainUserProfilePage,
});

function MainUserProfilePage() {
  const dispatch = useAppDispatch();
  const { extraction } = Route.useSearch();
  const authUser = useAppSelector((s) => s.auth.user);
  const storedUser = getStoredUser();

  const initialProfileId =
    authUser?.candidateProfileId ||
    (storedUser?.id && storedUser.id !== "3a000000-0000-4000-8000-000000000001"
      ? storedUser.id
      : undefined);

  const [resolvedProfileId, setResolvedProfileId] = useState<string | undefined>(
    initialProfileId,
  );
  const [checking, setChecking] = useState<boolean>(!initialProfileId);

  useEffect(() => {
    if (resolvedProfileId) {
      setChecking(false);
      return;
    }

    const email = authUser?.email || storedUser?.email;
    if (!email) {
      setChecking(false);
      return;
    }

    let isMounted = true;
    apiClient
      .get<{ items: Array<{ id: string; email: string }> }>("/profiles", {
        params: { email, limit: 1 },
      })
      .then((res) => {
        if (!isMounted) return;
        const matched = res.data?.items?.[0];
        if (matched?.id) {
          setResolvedProfileId(matched.id);
          const currentCandidate = getStoredUser();
          if (currentCandidate) {
            saveStoredUser({ ...currentCandidate, id: matched.id });
          }
          if (authUser && authUser.candidateProfileId !== matched.id) {
            void updateMeAPI({ candidateProfileId: matched.id }).catch(() => {});
            dispatch(setAuthUser({ ...authUser, candidateProfileId: matched.id }));
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedProfileId, authUser, storedUser, dispatch]);

  if (checking) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <ProfileBuilder
      key={resolvedProfileId ?? "current-user-profile"}
      profileId={resolvedProfileId}
      {...(extraction ? { extractionId: extraction } : {})}
      onSaved={(res) => {
        setResolvedProfileId(res.profile_id);
      }}
    />
  );
}
