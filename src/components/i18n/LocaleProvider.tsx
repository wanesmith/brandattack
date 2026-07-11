"use client";
import { createContext, useContext, useMemo } from "react";
import type { Messages } from "@/lib/i18n/messages";

type Ctx = { locale: string; t: (key: string) => string };

const LocaleContext = createContext<Ctx>({ locale: "en", t: (k) => k });

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Messages;
  children: React.ReactNode;
}) {
  // messages already include the English fallback for every key (from the
  // server), so a plain lookup is enough here.
  const value = useMemo<Ctx>(
    () => ({ locale, t: (key: string) => messages[key] ?? key }),
    [locale, messages]
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Client hook: `const { t, locale } = useT()`. */
export function useT(): Ctx {
  return useContext(LocaleContext);
}
