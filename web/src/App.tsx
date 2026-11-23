import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './components/admin/AdminLayout';
import { DeckStudentApp } from './components/student/DeckStudentApp';
import { VerificationGate } from './components/auth/VerificationGate';
import { DeckAuth } from './components/student/DeckAuth';
import { Badge } from './components/common/ThemeAssets';

const MainApp: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [portalMode, setPortalMode] = useState<'student' | 'admin'>('student');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E8F1FB] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Badge size={84} className="mx-auto shadow-xl" />
          <div className="w-8 h-8 border-4 border-[#3E9B52] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#16335A] uppercase tracking-wider font-heading">
            Loading BoardBuddy...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated: render the Login and Registration screen
  if (!currentUser) {
    return (
      <DeckAuth
        onSuccess={(user) => {
          if (user?.role === 'SUPERADMIN') {
            setPortalMode('admin');
          } else {
            setPortalMode('student');
          }
        }}
        onAdminSuccess={() => {
          setPortalMode('admin');
        }}
      />
    );
  }

  // Super Admin view
  if (portalMode === 'admin' && currentUser?.role === 'SUPERADMIN') {
    return (
      <AdminLayout
        onSwitchToStudent={() => {
          setPortalMode('student');
        }}
      />
    );
  }

  // If student account is pending approval / unverified
  const isApproved =
    String(currentUser?.verification_status || '').trim().toUpperCase() === 'APPROVED';

  if (
    currentUser &&
    currentUser.role === 'STUDENT' &&
    !isApproved
  ) {
    return <VerificationGate />;
  }

  // Main Student Application
  return (
    <DeckStudentApp
      onOpenAdmin={() => {
        if (currentUser?.role === 'SUPERADMIN') {
          setPortalMode('admin');
        }
      }}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
