import React, { useState, useCallback, useEffect, ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppUser, Invoice } from './types';
import { Sidebar } from './components/Sidebar';
import { CreateInvoice } from './components/pages/CreateInvoice';
import { InvoiceHistory } from './components/pages/InvoiceHistory';
import { Settings } from './components/pages/Settings';
import { Dashboard } from './components/pages/Dashboard';
import { LoginPage } from './components/pages/Login';
import { SignUpPage } from './components/pages/SignUp';
import { TermsOfService } from './components/pages/TermsOfService';
import { PrivacyPolicy } from './components/pages/PrivacyPolicy';
import { FAQPage } from './components/pages/FAQ';
import { ContactPage } from './components/pages/Contact';
import { AdminPanel } from './components/pages/AdminPanel';
import { ForgotPasswordPage } from './components/pages/ForgotPassword';
import { UpdatePasswordPage } from './components/pages/UpdatePassword';
import { BuyCreditsPage } from './components/pages/BuyCredits';
import { supabase } from './services/db';
import * as supa from './services/supabase';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { SettingsProvider } from './contexts/SettingsContext';
import { ProfileRow } from './types/supabase';
import './index.css';

// 🔐 Protected route wrapper
const ProtectedRoute: React.FC<{ user: AppUser | null, children: ReactNode }> = ({ user, children }) => {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

// 📐 Layout for authenticated area
const AppLayout: React.FC<{
  currentUser: AppUser;
  handleLogout: () => void;
  handleCreateNewInvoice: () => void;
  children: ReactNode;
}> = ({ currentUser, handleLogout, handleCreateNewInvoice, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const getTitle = (path: string): string => {
    const route = path.split('/')[1] || 'Dashboard';
    return route.charAt(0).toUpperCase() + route.slice(1).replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <SettingsProvider currentUser={currentUser}>
      <div className="flex flex-col md:flex-row h-screen text-gray-800 dark:text-gray-100 bg-transparent">
        <Sidebar
          currentUser={currentUser}
          onCreateNew={handleCreateNewInvoice}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        <div className="flex-1 flex flex-col">
          {/* 📱 Mobile header */}
          <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2">
              <HamburgerMenuIcon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{getTitle(location.pathname)}</h1>
            <div className="w-8" /> {/* Spacer */}
          </header>

          <main className="flex-1 p-4 sm:p-6 md:p-10 md:overflow-y-auto bg-[#efe9e7] dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
};

// 🚀 App Entry Point
export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'PASSWORD_RECOVERY') {
            navigate('/update-password');
            setCurrentUser(null);
            return;
          }

          if (!session?.user) {
            setCurrentUser(null);
            if (event === 'SIGNED_OUT') {
              navigate('/login');
            }
           setSessionLoaded(true);
            return;
          }

          const { data: profileData, error } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single();

          if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
          if (!profileData) throw new Error(`User profile not found for authenticated user.`);

          const profile = profileData as ProfileRow;

          if (profile.status === 'deactivated') {
            alert('This account has been deactivated.');
            await supabase.auth.signOut();
            return;
          }

          const userToSet: AppUser = {
            ...session.user,
            profile: {
              is_admin: profile.is_admin ?? false,
              credits: profile.credits ?? 0,
              status: profile.status ?? 'active',
            },
          };

          setCurrentUser(userToSet);

          if (event === 'SIGNED_IN') {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
          }
        } catch (error: any) {
          console.error("Authentication error, signing out:", error.message);
          await supabase.auth.signOut().catch(e => console.error("Sign out failed:", e));
          setCurrentUser(null);
          navigate('/login');
        } finally {
          setSessionLoaded(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.state]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/login');
  }, [navigate]);

  const handleUserUpdate = useCallback((updatedProfile: Partial<AppUser['profile']>) => {
    setCurrentUser(prev => prev ? { ...prev, profile: { ...prev.profile, ...updatedProfile } } : null);
  }, []);

  const handleEditInvoice = useCallback(async (invoiceId: number) => {
    if (!currentUser) return;
    const invoiceToSet = await supa.getInvoiceById(invoiceId);
    if (invoiceToSet) {
      setInvoiceToEdit(invoiceToSet);
      navigate('/create-invoice');
    } else {
      alert("Invoice not found");
    }
  }, [currentUser, navigate]);

  const handleCreateNewInvoice = () => {
    setInvoiceToEdit(null);
    navigate('/create-invoice');
  };

  if (!sessionLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p>Authenticating...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* 📄 Static public pages */}
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/faq" element={<FAQPage />} />

      {/* 🔓 Auth pages */}
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" /> : <SignUpPage />} />
      <Route path="/forgot-password" element={currentUser ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />

      {/* 🔐 Protected app area */}
      <Route
        path="/*"
        element={
          <ProtectedRoute user={currentUser}>
            {currentUser && (
              <AppLayout
                currentUser={currentUser}
                handleLogout={handleLogout}
                handleCreateNewInvoice={handleCreateNewInvoice}
              >
                <Routes>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard currentUser={currentUser} />} />
                  <Route path="create-invoice" element={
                    <CreateInvoice
                      currentUser={currentUser}
                      invoiceToEdit={invoiceToEdit}
                      onInvoiceSaved={() => navigate('/invoice-history')}
                      onUserUpdate={handleUserUpdate}
                    />
                  } />
                  <Route path="invoice-history" element={
                    <InvoiceHistory
                      currentUser={currentUser}
                      onEditInvoice={handleEditInvoice}
                    />
                  } />
                  <Route path="settings" element={
                    <Settings
                      currentUser={currentUser}
                      onUserUpdate={handleUserUpdate}
                      onLogout={handleLogout}
                    />
                  } />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="buy-credits" element={<BuyCreditsPage />} />
                  {currentUser?.profile?.is_admin && (
                    <Route path="admin" element={<AdminPanel currentUser={currentUser} />} />
                  )}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            )}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};
