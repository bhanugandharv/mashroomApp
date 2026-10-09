import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { formatErr } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { AuthShell, Field, GoogleButton } from "@/pages/Login";

export default function Register() {
  const { t } = useLang();
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await register(form.name, form.email, form.password); navigate(next); }
    catch (err) { setError(formatErr(err)); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell title={t("register_title")} sub={t("register_sub")}>
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <Field label={t("full_name")} testId="register-name-input" value={form.name} onChange={set("name")} />
        <Field label={t("email")} testId="register-email-input" type="email" value={form.email} onChange={set("email")} />
        <Field label={t("password")} testId="register-password-input" type="password" minLength={6} value={form.password} onChange={set("password")} />
        {error && <p data-testid="register-error" className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm text-[#DC2626]">{error}</p>}
        <button data-testid="register-submit-btn" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1B4D3E] font-semibold text-white hover:bg-[#143C30] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("create_account")}
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-[#5A6567]"><span className="h-px flex-1 bg-[#E5E0D8]" />{t("or")}<span className="h-px flex-1 bg-[#E5E0D8]" /></div>
      <GoogleButton next={next} />
      <p className="mt-8 text-sm text-[#5A6567]">{t("have_account")} <Link data-testid="register-login-link" to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[#8B4513] hover:underline">{t("sign_in")}</Link></p>
    </AuthShell>
  );
}
