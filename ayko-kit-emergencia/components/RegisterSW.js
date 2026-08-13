"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // se falhar, o site continua funcionando normalmente,
        // só não fica instalável/offline
      });
    }
  }, []);

  return null;
}
