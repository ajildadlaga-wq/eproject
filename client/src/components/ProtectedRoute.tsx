import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../lib/types";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { session, role, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }
  if (!session) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
