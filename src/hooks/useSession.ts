import { useState } from "react";

export function displayNameFromEmail(email: string, preferredName?: string): string {
  if (preferredName?.trim()) return preferredName.trim();
  return email.split("@")[0] || "User";
}

export function useSession() {
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  function signIn(email: string): void {
    setSignedIn(true);
    setDisplayName(displayNameFromEmail(email));
  }

  function signUp(email: string, name: string): void {
    setSignedIn(true);
    setDisplayName(displayNameFromEmail(email, name));
  }

  function signOut(): void {
    setSignedIn(false);
    setDisplayName(null);
  }

  return { signedIn, displayName, signIn, signUp, signOut };
}
