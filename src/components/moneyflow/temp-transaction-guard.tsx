"use client";

import { useEffect } from "react";

export function TempTransactionGuard({
  message = "This temporary transaction view will be lost if you refresh or close the tab.",
}: {
  message?: string;
}) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message]);

  return null;
}
