import {Toaster} from "@/shared/ui/toaster.tsx";
import {Toaster as Sonner} from "@/shared/ui/sonner.tsx";
import {TooltipProvider} from "@/shared/ui/tooltip.tsx";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {AuthProvider} from "../features/auth/context/AuthContext.tsx";
import ProtectedRoute from "../shared/components/ProtectedRoute.tsx";

// Pages
import Index from "../features/auth/pages/Index.tsx";
import NotFound from "../features/auth/pages/NotFound.tsx";
import Login from "../features/auth/pages/Login.tsx";
import Signup from "../features/auth/pages/Signup.tsx";
import SignupSuccess from "../features/auth/pages/SignupSuccess.tsx";
import ForgotPassword from "../features/auth/pages/ForgotPassword.tsx";
import ResetPassword from "../features/auth/pages/ResetPassword.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes - accessible without authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup-success" element={<SignupSuccess />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />

            {/* 404 - Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;