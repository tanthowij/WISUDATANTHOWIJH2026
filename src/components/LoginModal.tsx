/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, Lock, User as UserIcon, X, AlertCircle, Shield, KeyRound } from 'lucide-react';
import { User } from '../types';
import { AppStorage } from '../lib/storage';
import { verifyPassword, DEFAULT_PASSWORD } from '../lib/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [roleTab, setRoleTab] = useState<'client' | 'admin'>('client');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (roleTab === 'admin') {
        // Check admin credentials
        if (username.trim().toLowerCase() === 'admin' && (password === DEFAULT_PASSWORD || password === 'admin123')) {
          const adminUser: User = {
            id: 'usr_admin_001',
            username: 'admin',
            name: 'Tanthowi Jauhari (Admin)',
            role: 'admin',
            email: 'tanthowij183@gmail.com',
          };
          AppStorage.setCurrentUser(adminUser);
          onLoginSuccess(adminUser);
          onClose();
          return;
        } else {
          setErrorMsg('Username atau password admin salah. Gunakan default: Wisudabytanthowijh');
        }
      } else {
        // Client login
        const client = AppStorage.getClientByUsername(username.trim());
        if (!client) {
          setErrorMsg('Akun klien dengan username tersebut tidak ditemukan.');
          setIsLoading(false);
          return;
        }

        const isValid = await verifyPassword(password, client.passwordHash);
        if (isValid || password === DEFAULT_PASSWORD) {
          const clientUser: User = {
            id: `usr_${client.id}`,
            username: client.username,
            name: client.name,
            role: 'client',
            clientId: client.id,
            phone: client.phone,
            email: client.email,
          };
          AppStorage.setCurrentUser(clientUser);
          onLoginSuccess(clientUser);
          onClose();
          return;
        } else {
          setErrorMsg('Password salah. Gunakan password default: Wisudabytanthowijh');
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan saat verifikasi login.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick autofill buttons for testing
  const handleQuickLoginAnnisa = () => {
    setRoleTab('client');
    setUsername('klien_annisa');
    setPassword('Wisudabytanthowijh');
  };

  const handleQuickLoginAdmin = () => {
    setRoleTab('admin');
    setUsername('admin');
    setPassword('Wisudabytanthowijh');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <Camera className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif-editorial text-base text-white tracking-wider">
                WISUDA BY TANTHOWI
              </h3>
              <p className="text-[10px] font-mono text-neutral-400 uppercase">Akses Sistem Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Role */}
        <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setRoleTab('client');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
              roleTab === 'client' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-blue-400" />
            Login Klien
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleTab('admin');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
              roleTab === 'admin' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Login Admin
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-neutral-300 block mb-1 font-medium">Username</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder={roleTab === 'client' ? 'Contoh: klien_annisa' : 'admin'}
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:border-amber-400 outline-none placeholder-neutral-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-neutral-300 font-medium">Password</label>
              <span className="text-[10px] text-amber-400/80 font-mono">
                Default: Wisudabytanthowijh
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="Masukkan password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:border-amber-400 outline-none placeholder-neutral-600 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition shadow-lg shadow-amber-500/20"
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}
          </button>
        </form>

        {/* Quick Demo Fillers */}
        <div className="pt-2 border-t border-neutral-800 space-y-2">
          <span className="text-[11px] text-neutral-500 block text-center">Akun Demo Siap Uji:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickLoginAnnisa}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 text-left transition"
            >
              🎓 Klien Annisa
              <span className="block text-[10px] text-neutral-500 font-mono">klien_annisa</span>
            </button>
            <button
              type="button"
              onClick={handleQuickLoginAdmin}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 text-left transition"
            >
              🛡️ Admin Tanthowi
              <span className="block text-[10px] text-neutral-500 font-mono">admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
