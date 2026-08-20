"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Flash message that clears itself after `duration` ms.
 * Returns [message, show, clear].
 */
export function useFlashMessage(duration = 4000) {
  const [message, setMessage] = useState("");

  const clear = useCallback(() => setMessage(""), []);

  const show = useCallback((next) => {
    setMessage(next || "");
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), duration);
    return () => window.clearTimeout(timer);
  }, [message, duration]);

  return [message, show, clear];
}
