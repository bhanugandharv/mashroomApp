import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { formatErr } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";

const HERO = "https://images.unsplash.com/photo-1621455799534-deab8a1c1d89?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export const GoogleButton = ({ next }) => {
  const { t } = useLang();
  const go = () => {
    sessionStorage.setItem("cgm_next", next || "/account");
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/account";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button type="button" data-testid="auth-google-btn" onClick={go}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#E5E0D8] bg-white font-semibold transition-colors hover:border-[#1B4D3E]">
      <svg className="h-5 w-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      {t("google")}
    </button>
  );
};

export const AuthShell = ({ title, sub, children }) => (
  <div className="mx-auto grid max-w-6xl gap-0 overflow-hidden px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
    <div className="relative hidden overflow-hidden rounded-l-3xl lg:block">
      <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#0F2E23]/55" />
      <div className="bastar-strip-light absolute inset-x-0 bottom-0" />
    </div>
    <div className="bastar-card-top rounded-3xl border border-[#E5E0D8] bg-white p-8 sm:p-12 lg:rounded-l-none">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#1B4D3E] sm:text-4xl">{title}</h1>
      <p className="mt-2 text-[#5A6567]">{sub}</p>
      <div className="mt-8">{children}</div>
    </div>
  </div>
);

export const Field = ({ label, testId, ...props }) => (
  <label className="block text-sm">
    <span className="mb-1.5 block font-medium text-[#5A6567]">{label}</span>
    <input data-testid={testId} required {...props}
      className="h-12 w-full rounded-lg border border-[#E5E0D8] bg-[#FDFBF7] px-4 outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15" />
  </label>
);

export default function Login() {
  const { t } = useLang();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === "admin" ? "/admin" : next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const u = await login(form.email, form.password);
      navigate(u.role === "admin" && next === "/account" ? "/admin" : next);
    } catch (err) { setError(formatErr(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell title={t("login_title")} sub={t("login_sub")}>
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <Field label={t("email")} testId="login-email-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label={t("password")} testId="login-password-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p data-testid="login-error" className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm text-[#DC2626]">{error}</p>}
        <button data-testid="login-submit-btn" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1B4D3E] font-semibold text-white hover:bg-[#143C30] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("sign_in")}
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-[#5A6567]"><span className="h-px flex-1 bg-[#E5E0D8]" />{t("or")}<span className="h-px flex-1 bg-[#E5E0D8]" /></div>
      <GoogleButton next={next} />
      <p className="mt-8 text-sm text-[#5A6567]">{t("no_account")} <Link data-testid="login-register-link" to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-[#8B4513] hover:underline">{t("create_account")}</Link></p>
    </AuthShell>
  );
}
