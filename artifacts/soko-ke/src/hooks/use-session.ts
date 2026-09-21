import { useEffect, useState } from "react";

const SESSION_KEY = "soko-session-id";

function createSessionId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem(SESSION_KEY);

    if (!id) {
      id = createSessionId();
      localStorage.setItem(SESSION_KEY, id);
    }

    setSessionId(id);
  }, []);

  return sessionId;
}
