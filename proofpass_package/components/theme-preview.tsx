"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "proofpass-theme-preview";

export function ThemePreviewController() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const requestedTheme = searchParams.get("theme");
    const root = document.documentElement;

    if (requestedTheme === "legacy") {
      root.dataset.theme = "legacy";
      window.sessionStorage.setItem(STORAGE_KEY, "legacy");
      return;
    }

    if (requestedTheme === "default") {
      delete root.dataset.theme;
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const persistedTheme = window.sessionStorage.getItem(STORAGE_KEY);
    if (persistedTheme === "legacy") {
      root.dataset.theme = "legacy";
      return;
    }

    delete root.dataset.theme;
  }, [searchParams]);

  return null;
}
