import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader, Panel, btn, inputCls } from "@/pages/admin/AdminLayout";

const EMPTY = { current_password: "", new_password: "", confirm_password: "" };

export default function AdminAccount() {
  const { t } = useLang();
  const { user } = useAuth();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f.new_password.length < 6) return toast.error("New password must be at least 6 characters");
    if (f.new_password !== f.confirm_password) return toast.error("New passwords do not match");
    setBusy(true);
    try {
      await api.post("/auth/change-password", { current_password: f.current_password, new_password: f.new_password });
      toast.success("Password changed successfully");
      setF(EMPTY);
    } catch (err) { toast.error(formatErr(err)); } finally { setBusy(false); }
  };

  const field = (label, key, testid) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-[#5A6567]">{label}</span>
      <input required type="password" autoComplete="off" data-testid={testid} className={inputCls} value={f[key]} onChange={set(key)} />
    </label>
  );

  return (
    <div data-testid="admin-account">
      <AdminHeader title={t("adm_account")} sub="Manage your admin login and password" />
      <div className="max-w-lg">
        <Panel title="Change password" testId="change-password-panel">
          <p className="mb-4 text-sm text-[#5A6567]">Signed in as <span className="font-semibold text-[#1C2526]">{user?.email}</span></p>
          <form onSubmit={submit} className="space-y-4" data-testid="change-password-form">
            {field("Current password", "current_password", "current-password-input")}
            {field("New password", "new_password", "new-password-input")}
            {field("Confirm new password", "confirm_password", "confirm-password-input")}
            <button data-testid="change-password-submit" disabled={busy} className={btn}>
              <KeyRound className="h-4 w-4" />{busy ? "Saving..." : "Update password"}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
