/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ClientDashboard } from './components/client/ClientDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AppStorage } from './lib/storage';
import { ClientProject, User } from './types';
import { GoogleDriveService } from './lib/drive';
import { initAuth } from './lib/firebaseAuth';
import {
  Camera,
  CheckCircle2,
  HardDrive,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  FileSpreadsheet,
  Smartphone,
  MessageCircle,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clients, setClients] = useState<ClientProject[]>([]);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize data and user session
  const refreshData = useCallback(() => {
    const loadedClients = AppStorage.getClients();
    setClients(loadedClients);
    const active = AppStorage.getCurrentUser();
    setCurrentUser(active);
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    refreshData();

    // Check Drive connection & Firebase Auth state
    initAuth(
      (_user, _token) => {
        setIsDriveConnected(true);
      },
      () => {
        setIsDriveConnected(false);
      }
    );

    GoogleDriveService.isConnected().then(connected => {
      setIsDriveConnected(connected);
    });
  }, [refreshData]);

  // Handle Logout
  const handleLogout = () => {
    AppStorage.setCurrentUser(null);
    setCurrentUser(null);
  };

  // Switch role seamlessly (Admin vs specific Client demo)
  const handleSwitchRole = (targetRole: 'admin' | 'client', clientId = 'client_001') => {
    if (targetRole === 'admin') {
      const adminUser: User = {
        id: 'usr_admin_001',
        username: 'admin',
        name: 'Tanthowi Jauhari (Admin)',
        role: 'admin',
        email: 'tanthowij183@gmail.com',
      };
      AppStorage.setCurrentUser(adminUser);
      setCurrentUser(adminUser);
    } else {
      const targetClient = clients.find(c => c.id === clientId) || clients[0];
      if (targetClient) {
        const clientUser: User = {
          id: `usr_${targetClient.id}`,
          username: targetClient.username,
          name: targetClient.name,
          role: 'client',
          clientId: targetClient.id,
          phone: targetClient.phone,
          email: targetClient.email,
        };
        AppStorage.setCurrentUser(clientUser);
        setCurrentUser(clientUser);
      }
    }
    setRefreshKey(k => k + 1);
  };

  // Switch to viewing a client from the admin table
  const handleAdminViewClient = (clientId: string) => {
    handleSwitchRole('client', clientId);
  };

  // Determine active client object if user is in client mode
  const currentClientProject = currentUser?.clientId
    ? clients.find(c => c.id === currentUser.clientId) || clients[0]
    : clients[0];

  return (
    <div className="min-h-screen bg-[#090a0d] text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Editorial Luxury Header */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
        onSwitchRole={handleSwitchRole}
        isDriveConnected={isDriveConnected}
        onDriveConnectedChange={setIsDriveConnected}
        onChangePasswordClick={() => setShowChangePasswordModal(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser ? (
          currentUser.role === 'admin' ? (
            <AdminDashboard
              key={`admin_${refreshKey}`}
              clients={clients}
              onRefresh={refreshData}
              onSelectClientAsView={handleAdminViewClient}
            />
          ) : currentClientProject ? (
            <ClientDashboard
              key={`client_${currentClientProject.id}_${refreshKey}`}
              client={currentClientProject}
              onRefresh={refreshData}
            />
          ) : (
            <div className="text-center py-20 text-neutral-400">
              Data klien tidak ditemukan. Silakan login kembali.
            </div>
          )
        ) : (
          /* Public Editorial Showcase / Landing when logged out */
          <div className="space-y-16 py-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                FINE ART GRADUATION PHOTOGRAPHY
              </span>
              <h1 className="text-4xl sm:text-6xl font-serif-editorial tracking-tight text-white leading-tight">
                WISUDA BY TANTHOWI
              </h1>
              <p className="text-base text-neutral-400 max-w-2xl mx-auto">
                Sistem terpadu pemilihan foto wisuda, integrasi Google Drive, kolase Instagram Story, dan pengiriman berkas beresolusi penuh.
              </p>
              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition shadow-xl shadow-amber-500/20 flex items-center gap-2"
                >
                  <span>Masuk ke Portal Klien</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSwitchRole('admin')}
                  className="px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium text-sm transition border border-neutral-800 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Akses Admin Studio</span>
                </button>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Galeri Foto High-Res & Batas 25 Pilihan</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Klien dapat meninjau sekitar 250 foto original secara cepat dengan thumbnail teroptimasi dan memilih maksimal 25 foto terbaik dengan live counter.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Struktur Google Drive Otomatis</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Folder terpisah untuk setiap klien (01_RAW_PHOTOS hingga 07_DOWNLOAD). Menjaga keamanan privasi tanpa mencampur berkas antar klien.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Studio Kolase Story 9:16 (1080x1920)</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Hasilkan kolase Instagram Story multi-halaman beresolusi tajam dengan tipografi editorial, logo resmi studio, dan tombol share langsung.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-[#07080a] py-8 text-neutral-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="font-serif-editorial text-neutral-300 font-semibold tracking-wider">
              WISUDA BY TANTHOWI
            </span>
            <span>• Online Photo Selection & Delivery System</span>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            <span>Password Default: <code className="text-amber-400/90 font-mono">Wisudabytanthowijh</code></span>
            <span>•</span>
            <span>Google Drive API v3</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={user => {
          setCurrentUser(user);
          refreshData();
        }}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
