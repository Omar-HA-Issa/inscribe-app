import {ReactNode} from "react";
import {Navigate} from "react-router-dom";
import {useAuth} from "@/features/auth/context/AuthContext.tsx";
import {LoadingSpinner} from "./LoadingSpinner.tsx";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}