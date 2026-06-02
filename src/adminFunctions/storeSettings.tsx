import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { stripMarketingTerms } from "@/adminFunctions/plainCopy";

export interface StoreSettings {
  companyName: string;
  companyNameEn: string;
  companyPhone: string;
  companyWhatsApp: string;
  companyAddress: string;
  companyTagline: string;
}

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  companyName: "سنين",
  companyNameEn: "SANEEN",
  companyPhone: "+213 550 12 34 56",
  companyWhatsApp: "+213 550 12 34 56",
  companyAddress: "مستغانم، الجزائر",
  companyTagline: "عباءات للصلاة",
};

function normalizeSettings(raw: Partial<StoreSettings>): StoreSettings {
  const merged = { ...DEFAULT_STORE_SETTINGS, ...raw };
  const phone = merged.companyPhone?.trim() || DEFAULT_STORE_SETTINGS.companyPhone;
  const whatsapp =
    merged.companyWhatsApp?.trim() || phone;
  return {
    ...merged,
    companyPhone: phone,
    companyWhatsApp: whatsapp,
    companyTagline: stripMarketingTerms(merged.companyTagline),
  };
}

interface StoreSettingsContextType {
  settings: StoreSettings;
  updateSettings: (partial: Partial<StoreSettings>) => void;
  resetSettings: () => void;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);


  useEffect(() => {
    document.title = `${settings.companyName} | ${settings.companyNameEn} - ${settings.companyTagline}`;
  }, [settings.companyName, settings.companyNameEn, settings.companyTagline]);

  const persist = useCallback((next: StoreSettings) => {
    setSettings(next);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<StoreSettings>) => {
      persist(normalizeSettings({ ...settings, ...partial }));
    },
    [settings, persist]
  );

  const resetSettings = useCallback(() => {
    persist(DEFAULT_STORE_SETTINGS);
  }, [persist]);

  return (
    <StoreSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx) throw new Error("useStoreSettings must be used within StoreSettingsProvider");
  return ctx;
}
