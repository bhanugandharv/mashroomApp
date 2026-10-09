import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Loading = () => (
  <div className="grid min-h-[50vh] place-items-center" data-testid="page-loading">
    <Loader2 className="h-7 w-7 animate-spin text-[#1B4D3E]" />
  </div>
);

export default function ProtectedRoute({ children, admin = false }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) return <Loading />;
  if (user === false) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
