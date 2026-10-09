import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n";

const EMPTY = { texts: {}, contact: {}, announcement_enabled: false, about_enabled: true };
const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const { lang, t } = useLang();
  const [content, setContent] = useState(EMPTY);
  const reload = useCallback(() => api.get("/content").then((r) => setContent({ ...EMPTY, ...r.data })).catch(() => {}), []);
  useEffect(() => { reload(); }, [reload]);
  const c = useCallback((key) => {
    const v = content.texts[key];
    return (v && (v[lang] || v.en)) || t(key);
  }, [content, lang, t]);
  return <ContentContext.Provider value={{ content, c, contact: content.contact, reload }}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
