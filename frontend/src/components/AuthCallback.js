import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "@/components/ProtectedRoute";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const sessionId = new URLSearchParams(window.location.hash.slice(1)).get("session_id");
    const next = sessionStorage.getItem("cgm_next") || "/account";
    sessionStorage.removeItem("cgm_next");
    api.post("/auth/google/session", { session_id: sessionId })
      .then(({ data }) => {
        setUser(data);
        navigate(data.role === "admin" ? "/admin" : next, { replace: true });
      })
      .catch((e) => {
        toast.error(formatErr(e));
        setUser(false);
        navigate("/login", { replace: true });
      });
  }, [navigate, setUser]);

  return <Loading />;
}
