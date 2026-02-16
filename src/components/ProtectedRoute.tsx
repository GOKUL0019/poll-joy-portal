import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
