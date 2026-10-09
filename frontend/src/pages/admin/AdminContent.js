import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useContent } from "@/context/ContentContext";
import { Switch } from "@/components/ui/switch";
import { AdminHeader, Panel, btn, inputCls } from "@/pages/admin/AdminLayout";

const SECTIONS = [
  { title: "Announcement banner", toggle: "announcement_enabled", fields: [["announcement", "Banner text", true]] },
  { title: "Home hero", fields: [["hero_eyebrow", "Eyebrow"], ["hero_title", "Headline", true], ["hero_sub", "Subtitle", true], ["hero_cta", "Primary button"], ["hero_cta2", "Secondary button"], ["tagline", "Tagline"]] },
  { title: "Feature cards", fields: [["feat_fresh", "Card 1 title"], ["feat_fresh_d", "Card 1 text", true], ["feat_spawn", "Card 2 title"], ["feat_spawn_d", "Card 2 text", true], ["feat_cod", "Card 3 title"], ["feat_cod_d", "Card 3 text", true]] },
  { title: "About the farm", toggle: "about_enabled", fields: [["about_title", "Section title"], ["about_body", "Story / description", true]] },
  { title: "Footer text", fields: [["footer_about", "About blurb", true]] },
];
const CONTACT = [["address", "Farm address"], ["phone", "Phone"], ["whatsapp", "WhatsApp number"], ["email", "Email"], ["instagram", "Instagram URL"], ["facebook", "Facebook URL"]];

const Bilingual = ({ k, label, multi, texts, t, onChange }) => {
  const v = texts[k] || {};
  const Tag = multi ? "textarea" : "input";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {["en", "hi"].map((l) => (
        <label key={l} className="text-sm"><span className="mb-1 block text-[#5A6567]">{label} ({l === "en" ? "English" : "हिंदी"})</span>
          <Tag data-testid={`content-${k}-${l}`} rows={2} className={`${inputCls} ${multi ? "h-auto py-2" : ""}`} value={v[l] ?? ""} placeholder={l === "en" ? t(k) : ""} onChange={(e) => onChange(k, l, e.target.value)} />
        </label>
      ))}
    </div>
  );
};

export default function AdminContent() {
  const { t } = useLang();
  const { content, reload } = useContent();
  const [f, setF] = useState(content);
  const [busy, setBusy] = useState(false);
  const setText = (k, l, val) => setF({ ...f, texts: { ...f.texts, [k]: { ...(f.texts[k] || {}), [l]: val } } });

  const save = async () => {
    setBusy(true);
    try { await api.put("/admin/content", f); await reload(); toast.success("Website content saved"); }
    catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div data-testid="admin-content" className="space-y-5">
      <AdminHeader title={t("adm_content")} sub="Edit storefront text and business details — leave a field empty to use the default text">
        <button data-testid="content-save-btn" onClick={save} disabled={busy} className={btn}><Save className="h-4 w-4" />Save changes</button>
      </AdminHeader>
      {SECTIONS.map((s) => (
        <Panel key={s.title} title={s.title} testId={`content-section-${s.fields[0][0]}`} action={s.toggle && (
          <label className="flex items-center gap-2 text-sm"><Switch data-testid={`content-toggle-${s.toggle}`} checked={!!f[s.toggle]} onCheckedChange={(v) => setF({ ...f, [s.toggle]: v })} />Show on site</label>)}>
          <div className="space-y-3">{s.fields.map(([k, label, multi]) => <Bilingual key={k} k={k} label={label} multi={multi} texts={f.texts} t={t} onChange={setText} />)}</div>
        </Panel>
      ))}
      <Panel title="Business contact details" testId="content-section-contact">
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTACT.map(([k, label]) => (
            <label key={k} className="text-sm"><span className="mb-1 block text-[#5A6567]">{label}</span>
              <input data-testid={`content-contact-${k}`} className={inputCls} value={f.contact[k] ?? ""} onChange={(e) => setF({ ...f, contact: { ...f.contact, [k]: e.target.value } })} /></label>
          ))}
        </div>
      </Panel>
      <div className="flex justify-end"><button data-testid="content-save-btn-bottom" onClick={save} disabled={busy} className={btn}><Save className="h-4 w-4" />Save changes</button></div>
    </div>
  );
}
