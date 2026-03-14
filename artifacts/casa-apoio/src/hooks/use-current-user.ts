import { useQuery } from "@tanstack/react-query";

interface CurrentUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  isActive: boolean;
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });
}
