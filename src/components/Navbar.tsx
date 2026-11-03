/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  HardDrive,
  LogOut,
  User as UserIcon,
  Shield,
  KeyRound,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { User } from '../types';
import { googleSignIn, logoutGoogle } from '../lib/firebaseAuth';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onSwitchRole: (targetRole: 'admin' | 'client', clientId?: string) => void;
  isDriveConnected: boolean;
  onDriveConnectedChange: (connected: boolean) => void;
  onChangePasswordClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenLogin,
  onSwitchRole,
  isDriveConnected,
  onDriveConnectedChange,
  onChangePasswordClick,
}) => {
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const handleConnectGoogleDrive = async () => {
    setIsConnectingDrive(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onDriveConnectedChange(true);
      }
    } catch (e: any) {
      console.warn('Google Drive sign in prompt skipped or error', e);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await logoutGoogle();
    onDriveConnectedChange(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0c0d11]/90 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-700/80 flex items-center justify-center text-white shadow-inner">
            <Camera className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="font-serif-editorial text-lg tracking-[0.2em] uppercase font-bold text-white flex items-center gap-2">
              WISUDA BY TANTHOWI
            </div>
            <p className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
              Photo Selection & Delivery System
            </p>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          {/* Google Drive Status Badge / Button */}
          {currentUser?.role === 'admin' && (
            <div className="hidden sm:flex items-center">
              {isDriveConnected ? (
                <div
                  onClick={handleDisconnectDrive}
                  title="Klik untuk putus koneksi Google Drive"
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono transition hover:bg-emerald-900/50"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Drive Terhubung</span>
                </div>
              ) : (
                <button
                  onClick={handleConnectGoogleDrive}
                  disabled={isConnectingDrive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs transition"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isConnectingDrive ? 'Menghubungkan...' : 'Hubungkan Drive'}</span>
                </button>
              )}
            </div>
          )}

          {/* User Account / Role Switcher */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white text-xs transition"
              >
                {currentUser.role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="font-medium max-w-[140px] truncate">{currentUser.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-neutral-800 text-neutral-400">
                  {currentUser.role}
                </span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {/* Dropdown Menu */}
              {showSwitchMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 text-xs space-y-1 z-50 animate-in fade-in zoom-in-95"
                  onClick={() => setShowSwitchMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-neutral-800 text-neutral-400 text-[11px]">
                    Masuk sebagai <strong className="text-white">{currentUser.name}</strong> ({currentUser.username})
                  </div>

                  {/* Switch between Admin and Client demo */}
                  <div className="py-1">
                    <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                      Ganti Tampilan Akun
                    </span>
                    <button
                      onClick={() => onSwitchRole('admin')}
                      className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-neutral-800 transition ${
                        currentUser.role === 'admin' ? 'text-amber-400 font-semibold' : 'text-neutral-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        Admin Studio (Tanthowi)
                      </span>
                      {currentUser.role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onSwitchRole('client', 'client_001')}
                      className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-neutral-800 transition ${
                        currentUser.role === 'client' && currentUser.clientId === 'client_001'
                          ? 'text-amber-400 font-semibold'
                          : 'text-neutral-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5" />
                        Klien Annisa (UI)
                      </span>
                      {currentUser.role === 'client' && currentUser.clientId === 'client_001' && (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => onSwitchRole('client', 'client_002')}
                      className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-neutral-800 transition ${
                        currentUser.role === 'client' && currentUser.clientId === 'client_002'
                          ? 'text-amber-400 font-semibold'
                          : 'text-neutral-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5" />
                        Klien Dimas (ITB)
                      </span>
                      {currentUser.role === 'client' && currentUser.clientId === 'client_002' && (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="border-t border-neutral-800 pt-1">
                    <button
                      onClick={onChangePasswordClick}
                      className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-800 text-neutral-300 transition"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Ganti Password
                    </button>
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-red-950/40 text-red-400 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition"
            >
              Login Sistem
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
