import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Stethoscope,
  Users,
  Calendar,
  Settings,
  LogOut,
  UserPlus,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface NavbarProps {
  onOpenNewPatient?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNewPatient }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Clinic Info */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                  DocOS <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">OPD</span>
                </span>
                <span className="text-xs text-slate-700 block truncate max-w-[200px] sm:max-w-xs font-semibold">
                  {user.clinicName}
                </span>
              </div>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center space-x-1 pl-6">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>OPD Queue</span>
              </Link>
              <Link
                to="/patients"
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/patients')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Patients</span>
              </Link>
              <Link
                to="/settings"
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/settings')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings & Formulary</span>
              </Link>
            </nav>
          </div>

          {/* Actions & User Profile */}
          <div className="flex items-center space-x-3">
            {onOpenNewPatient && (
              <button
                onClick={onOpenNewPatient}
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-emerald-600/20 transition-all hover:shadow"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">New Patient</span>
              </button>
            )}

            {/* Role & Doctor Info */}
            <div className="hidden sm:flex items-center pl-3 border-l border-slate-200">
              <div className="text-right mr-3">
                <div className="text-sm font-semibold text-slate-800 flex items-center justify-end gap-1.5">
                  {user.fullName}
                  {user.role === 'Doctor' ? (
                    <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                      Doctor
                    </span>
                  ) : (
                    <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      Assistant
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  {user.role === 'Doctor' && user.regNumber ? `Reg: ${user.regNumber}` : user.email}
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
