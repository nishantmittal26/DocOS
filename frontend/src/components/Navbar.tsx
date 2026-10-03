import React, { useState, useRef, useEffect } from 'react';
import { formatDateIST } from '../utils/dateTime';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clinicsApi } from '../api/client';
import { ClinicQuotaStatus } from '../types';
import {
  Stethoscope,
  Users,
  Calendar,
  History,
  Settings,
  LogOut,
  UserPlus,
  ChevronDown,
  KeyRound,
  Building2,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  CreditCard,
  ShieldCheck,
  Clock,
  Activity,
  FlaskConical,
  BookOpen,
} from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

interface NavbarProps {
  onOpenNewPatient?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNewPatient }) => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Quota status for clinic staff
  const [quota, setQuota] = useState<ClinicQuotaStatus | null>(null);

  const isPlatformStaff = hasRole('PlatformAdmin') || hasRole('SalesAgent');
  const isClinicStaff = !isPlatformStaff && !!user?.clinicId;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch current quota status for clinic staff
  useEffect(() => {
    if (!isClinicStaff) {
      setQuota(null);
      return;
    }

    const checkQuota = async () => {
      try {
        const data = await clinicsApi.getCurrentSubscriptionQuota();
        setQuota(data);
      } catch (err) {
        // Silently catch quota fetch errors so navbar doesn't break
        console.warn('Could not fetch subscription quota status', err);
      }
    };

    checkQuota();
    const interval = setInterval(checkQuota, 60000); // Check every 60s
    return () => clearInterval(interval);
  }, [isClinicStaff, location.pathname]);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand & Clinic/Platform Info */}
            <div className="flex items-center space-x-4">
              <Link
                to={isPlatformStaff ? '/admin/clinics' : '/'}
                className="flex items-center space-x-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  {isPlatformStaff ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <Stethoscope className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                    DocOS{' '}
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        hasRole('PlatformAdmin')
                          ? 'bg-purple-100 text-purple-800'
                          : hasRole('SalesAgent')
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {hasRole('PlatformAdmin')
                        ? 'Admin'
                        : hasRole('SalesAgent')
                        ? 'Sales'
                        : 'OPD'}
                    </span>
                  </span>
                  <span className="text-xs text-slate-700 block truncate max-w-[200px] sm:max-w-xs font-semibold">
                    {isPlatformStaff
                      ? hasRole('PlatformAdmin')
                        ? 'Platform Administration'
                        : 'Sales Agent Portal'
                      : user.clinicName}
                  </span>
                </div>
              </Link>

              {/* Navigation links */}
              <nav className="hidden md:flex items-center space-x-1 pl-6">
                {isPlatformStaff ? (
                  <>
                    <Link
                      to="/admin/clinics"
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/admin/clinics')
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Clinics Directory</span>
                    </Link>
                    <Link
                      to="/admin/onboard-doctor"
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/admin/onboard-doctor')
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Onboard Clinic</span>
                    </Link>
                    {hasRole('PlatformAdmin') && (
                      <>
                        <Link
                          to="/admin/masters/vitals"
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive('/admin/masters/vitals')
                              ? 'bg-emerald-50 text-emerald-700 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Activity className="w-4 h-4" />
                          <span>Vitals</span>
                        </Link>
                        <Link
                          to="/admin/masters/labs"
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive('/admin/masters/labs')
                              ? 'bg-purple-50 text-purple-700 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <FlaskConical className="w-4 h-4" />
                          <span>Labs</span>
                        </Link>
                        <Link
                          to="/admin/masters/advice"
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive('/admin/masters/advice')
                              ? 'bg-teal-50 text-teal-700 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Advice</span>
                        </Link>
                        <Link
                          to="/admin/audit-logs"
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive('/admin/audit-logs')
                              ? 'bg-slate-200 text-slate-900 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Audit</span>
                        </Link>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      to="/"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/')
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>OPD Queue</span>
                    </Link>
                    <Link
                      to="/history"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/history')
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      <span>History</span>
                    </Link>
                    <Link
                      to="/patients"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/patients')
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Patients</span>
                    </Link>
                    <Link
                      to="/settings/lab-tests"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/settings/lab-tests')
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <FlaskConical className="w-4 h-4" />
                      <span>Labs & Panels</span>
                    </Link>
                    <Link
                      to="/settings/advice"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/settings/advice')
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Advice</span>
                    </Link>
                    <Link
                      to="/settings"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/settings')
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Actions & User Profile */}
            <div className="flex items-center space-x-3">
              {isClinicStaff && onOpenNewPatient && (
                <button
                  onClick={onOpenNewPatient}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-emerald-600/20 transition-all hover:shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Patient</span>
                </button>
              )}

              {/* Role & Doctor Info Dropdown */}
              <div className="relative pl-3 border-l border-slate-200" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100/80 transition-colors group text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-semibold text-slate-800 flex items-center justify-end gap-1.5">
                      <span>{user.fullName}</span>
                      <div className="flex items-center gap-1">
                        {user.roles?.map((r) => (
                          <span
                            key={r}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              r === 'Doctor'
                                ? 'bg-indigo-100 text-indigo-700'
                                : r === 'ClinicAdmin'
                                ? 'bg-purple-100 text-purple-700'
                                : r === 'PlatformAdmin'
                                ? 'bg-amber-100 text-amber-800'
                                : r === 'SalesAgent'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      {user.roles?.includes('Doctor') && user.regNumber
                        ? `Reg: ${user.regNumber}`
                        : user.email}
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-emerald-500/20 sm:ml-1">
                    {user.fullName.slice(0, 2).toUpperCase()}
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                      isProfileMenuOpen ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User profile header inside dropdown */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {user.email}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {user.clinicName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 truncate max-w-[130px]">
                            {user.clinicName}
                          </span>
                        )}
                        {user.roles?.map((r) => (
                          <span
                            key={r}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              r === 'Doctor'
                                ? 'bg-indigo-100 text-indigo-700'
                                : r === 'ClinicAdmin'
                                ? 'bg-purple-100 text-purple-700'
                                : r === 'PlatformAdmin'
                                ? 'bg-amber-100 text-amber-800'
                                : r === 'SalesAgent'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsChangePasswordOpen(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <span>Change Password</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-red-50 group-hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Standalone Logout Icon Button */}
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

      {/* Quota & Subscription Warning Banner (Phase 2B Requirement) */}
      {isClinicStaff && quota && (
        <>
          {/* Hard Quota Exceeded or Suspended Alert */}
          {(quota.isQuotaExceeded || quota.isSuspended || !quota.canIssueTokens) && (
            <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold shadow-sm no-print animate-in slide-in-from-top-2">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 flex-shrink-0 text-white" />
                  <span>
                    {quota.isSuspended
                      ? '⚠️ Account Suspended: Your clinic subscription has lapsed past grace period. New patient check-ins are paused. Past records and prescriptions remain accessible.'
                      : `⚠️ Quota Exhausted: Your monthly quota of ${quota.monthlyQuota} visits plus the 20-visit buffer has been fully used (${quota.visitsConducted} visits completed). New patient check-ins are paused. Past visits and clinical records remain readable.`}
                  </span>
                </div>
                <span className="text-[11px] underline opacity-90 cursor-default whitespace-nowrap">
                  Contact Support to Upgrade
                </span>
              </div>
            </div>
          )}

          {/* Buffer Warning Banner (+20 soft buffer) */}
          {quota.canIssueTokens && quota.isWithinBuffer && (
            <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold shadow-sm no-print animate-in slide-in-from-top-1">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-950" />
                  <span>
                    Visit Quota Reached: You have completed {quota.visitsConducted} visits ({quota.monthlyQuota} monthly quota). You are currently using your grace buffer: <span className="underline">{quota.remainingBufferVisits} buffer visits remaining</span> before token issuance pauses.
                  </span>
                </div>
                <span className="text-[11px] text-amber-900 whitespace-nowrap">
                  Grace Buffer Active
                </span>
              </div>
            </div>
          )}

          {/* Grace Period Days Warning Banner */}
          {quota.canIssueTokens && !quota.isWithinBuffer && quota.isGracePeriod && (
            <div className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs font-semibold shadow-sm no-print">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0 text-amber-700" />
                  <span>
                    Subscription Grace Period: Your billing cycle ended on{' '}
                    {formatDateIST(quota.periodEnd)}. Please contact your administrator to renew your plan.
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-800">
                  Renewal Needed
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};
