import { useEffect, useState, useCallback } from "react";
import { Mail, MessageSquare, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, fmtDate } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { Loading } from "@/components/ProtectedRoute";
import { AdminHeader, Panel, btn, btnGhost, th, td } from "@/pages/admin/AdminLayout";

const STATUS = {
  sent: ["bg-[#E7F6EC] text-[#16A34A]", CheckCircle2],
  queued: ["bg-[#FFF4D6] text-[#B7791F]", Clock],
  failed: ["bg-[#FDE8E8] text-[#C0392B]", XCircle],
};

const StatusPill = ({ s }) => {
  const [cls, Icon] = STATUS[s] || STATUS.queued;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cls}`} data-testid={`notif-status-${s}`}><Icon className="h-3 w-3" />{s}</span>;
};

const ChannelCard = ({ icon: Icon, label, enabled, hint, testId }) => (
  <div data-testid={testId} className="flex items-start gap-3 rounded-xl border border-[#E5E0D8] bg-white px-5 py-4">
    <span className={`rounded-lg p-2 ${enabled ? "bg-[#E7F6EC] text-[#16A34A]" : "bg-[#FFF4D6] text-[#B7791F]"}`}><Icon className="h-5 w-5" /></span>
    <div>
      <p className="font-semibold">{label} <span className="ml-1 text-xs font-medium">{enabled ? "• Live" : "• Not configured"}</span></p>
      <p className="text-xs text-[#5A6567]">{hint}</p>
    </div>
  </div>
);

export default function AdminNotifications() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [cfg, list] = await Promise.all([api.get("/admin/notifications/config"), api.get("/admin/notifications")]);
    setData({ cfg: cfg.data, list: list.data });
  }, []);
  useEffect(() => { load(); }, [load]);

  const retry = async () => {
    setBusy(true);
    try {
      const r = await api.post("/admin/notifications/retry");
      toast.success(`Retried ${r.data.retried} pending notification(s)`);
      load();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  if (!data) return <Loading />;
  const rows = data.list.filter((n) => filter === "all" || n.status === filter);
  const counts = data.list.reduce((a, n) => ({ ...a, [n.status]: (a[n.status] || 0) + 1 }), {});

  return (
    <div data-testid="admin-notifications">
      <AdminHeader title={t("adm_notifications")} sub="Email & SMS sent to customers when orders are received, confirmed, shipped and delivered">
        <button data-testid="notif-refresh-btn" onClick={load} className={btnGhost}><RefreshCw className="h-4 w-4" />Refresh</button>
        <button data-testid="notif-retry-btn" onClick={retry} disabled={busy} className={btn}>Retry pending</button>
      </AdminHeader>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <ChannelCard icon={Mail} label="Email" enabled={data.cfg.email_enabled} testId="notif-channel-email"
          hint={data.cfg.email_enabled ? `Sending as "${data.cfg.from_name}"` : "Add EMERGENT_EMAIL_KEY to backend/.env"} />
        <ChannelCard icon={MessageSquare} label="SMS" enabled={data.cfg.sms_enabled} testId="notif-channel-sms"
          hint={data.cfg.sms_enabled ? `From ${data.cfg.sms_from}` : "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to backend/.env — queued SMS go out automatically"} />
      </div>
      <Panel testId="notif-log-panel" title="Notification log" action={
        <div className="flex gap-1">
          {["all", "sent", "queued", "failed"].map((s) => (
            <button key={s} data-testid={`notif-filter-${s}`} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-[#1B4D3E] text-white" : "bg-[#F6F3EE] text-[#5A6567]"}`}>
              {s}{s !== "all" && counts[s] ? ` (${counts[s]})` : ""}
            </button>
          ))}
        </div>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm" data-testid="notif-table">
            <thead className="border-b border-[#E5E0D8]"><tr>{["Time", "Order", "Event", "Channel", "To", "Status", "Detail"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#EEE9E1]">
              {rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-[#5A6567]">No notifications yet.</td></tr>}
              {rows.map((n) => (
                <tr key={n.notification_id} data-testid={`notif-row-${n.notification_id}`}>
                  <td className={`${td} whitespace-nowrap text-[#5A6567]`}>{fmtDate(n.updated_at)}</td>
                  <td className={`${td} font-semibold`}>{n.order_number}</td>
                  <td className={`${td} capitalize`}>{n.event}{n.recipient === "admin" && <span className="ml-1 text-xs text-[#8B4513]">(admin)</span>}</td>
                  <td className={`${td} capitalize`}>{n.channel}</td>
                  <td className={td}>{n.to}</td>
                  <td className={td}><StatusPill s={n.status} /></td>
                  <td className={`${td} max-w-xs truncate text-xs text-[#5A6567]`} title={n.error || n.subject || n.body}>{n.error || n.subject || n.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
