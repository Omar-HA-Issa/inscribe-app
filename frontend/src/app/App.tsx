import {Toaster} from "@/shared/ui/toaster.tsx";
import {Toaster as Sonner} from "@/shared/ui/sonner.tsx";
import {TooltipProvider} from "@/shared/ui/tooltip.tsx";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {BrowserRouter, Route, Routes, Navigate} from "react-router-dom";
import {AuthProvider} from "../features/auth/context/AuthContext.tsx";
import ProtectedRoute from "../shared/components/ProtectedRoute.tsx";

// Auth Pages
import Index from "../features/index/Index.tsx";
import NotFound from "../features/auth/pages/NotFound.tsx";
import Login from "../features/auth/pages/Login.tsx";
import Signup from "../features/auth/pages/Signup.tsx";
import SignupSuccess from "../features/auth/pages/SignupSuccess.tsx";
import ForgotPassword from "../features/auth/pages/ForgotPassword.tsx";
import ResetPassword from "../features/auth/pages/ResetPassword.tsx";
import AuthConfirm from '../features/auth/pages/AuthConfirm.tsx';

// Legal Pages
import Terms from '../features/pages/legal/Terms.tsx';
import Privacy from '../features/pages/legal/Privacy.tsx';
import Contact from '../features/pages/legal/Contact.tsx';

// Document Layout & Pages
import DocumentLayout from '../features/pages/documents/DocumentLayout.tsx';
import { Summary } from '../features/pages/documents/Summary.tsx';
import { Insights } from '../features/pages/documents/Insights.tsx';
import { Validator } from '../features/pages/documents/Validation.tsx';
import { Visuals } from '../features/pages/documents/Visuals.tsx';
import { Report } from '../features/pages/documents/Report.tsx';
// Import Chat if you have it, otherwise create a placeholder:
// import { Chat } from '../features/pages/chat/Chat.tsx';

// Placeholder Chat component (remove this if you have a real Chat component)
const Chat = () => (
  <div className="space-y-8">
    <div>
      <h2 className="text-3xl font-semibold mb-2 lowercase">chat</h2>
      <p className="text-muted-foreground">Ask questions about your document</p>
    </div>
    <div className="bg-card rounded-xl p-8 shadow-card">
      <p className="text-muted-foreground text-center">Chat feature coming soon...</p>
    </div>
  </div>
);

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
            <Route path="/auth/confirm" element={<AuthConfirm />} />

            {/* Legal Pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />

            {/* Document routes with nested layout */}
            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute>
                  <DocumentLayout />
                </ProtectedRoute>
              }
            >
              {/* Default redirect to summary tab */}
              <Route index element={<Navigate to="summary" replace />} />

              {/* All document tab routes */}
              <Route path="summary" element={<Summary />} />
              <Route path="insights" element={<Insights />} />
              <Route path="contradictions" element={<Validator />} />
              <Route path="visuals" element={<Visuals />} />
              <Route path="report" element={<Report />} />
              <Route path="chat" element={<Chat />} />
            </Route>

            {/* 404 - Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;