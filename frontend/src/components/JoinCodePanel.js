import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Clipboard,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function JoinCodePanel() {
  const [status, setStatus] = useState({ configured: false, updatedAt: null });
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  const [password, setPassword] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [busy, setBusy] = useState(false);
  const hideTimer = useRef(null);

  const clearReveal = () => {
    setCode('');
    setCopied(false);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(clearReveal, 60000);
  };

  const loadStatus = async () => {
    try {
      const response = await axios.get(API_BASE + '/auth/admin/join-code/status', {
        withCredentials: true,
        timeout: 5000,
      });
      setStatus(response.data);
    } catch (error) {
      console.warn('Unable to load join-code status:', error.message);
    }
  };

  useEffect(() => {
    loadStatus();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const openDialog = (action) => {
    setDialogAction(action);
    setPassword('');
    setDialogError('');
  };

  const closeDialog = () => {
    if (!busy) {
      setDialogAction(null);
      setPassword('');
      setDialogError('');
    }
  };

  const submitReauth = async (event) => {
    event.preventDefault();
    if (!dialogAction) return;

    setBusy(true);
    setDialogError('');

    try {
      const endpoint = dialogAction === 'rotate'
        ? '/auth/admin/join-code/rotate'
        : '/auth/admin/join-code/reveal';

      const response = await axios.post(
        API_BASE + endpoint,
        { password },
        { withCredentials: true, timeout: 10000 }
      );

      setCode(response.data.code || '');
      setStatus((current) => ({
        ...current,
        configured: true,
        updatedAt: response.data.updatedAt || current.updatedAt,
      }));
      setDialogAction(null);
      setPassword('');
      scheduleHide();
    } catch (error) {
      setDialogError(error.response?.data?.error || 'Unable to verify administrator password.');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">User Join Code</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reveal or rotate the normal-user invitation only after administrator password verification.
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Current normal-user invitation</p>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <code className="text-base sm:text-lg font-semibold text-slate-950 break-all">
                    {code || (status.configured ? '••••••••••••••••••••' : 'Not configured')}
                  </code>
                  {code && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                      Auto-hides in 60 seconds
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {status.updatedAt
                    ? 'Last changed ' + new Date(status.updatedAt).toLocaleString()
                    : status.configured
                      ? 'Configured and protected'
                      : 'Create one with Rotate / Generate.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {code ? (
                  <>
                    <button
                      onClick={copyCode}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Clipboard className="w-4 h-4" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={clearReveal}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <EyeOff className="w-4 h-4" />
                      Hide
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => openDialog('reveal')}
                    disabled={!status.configured}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4" />
                    Reveal
                  </button>
                )}

                <button
                  onClick={() => openDialog('rotate')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className="w-4 h-4" />
                  {status.configured ? 'Rotate' : 'Generate'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-600 flex-none" />
            <span>
              Only authenticated EduNetGuard admins can use these controls. The separate administrator-registration code
              is intentionally never displayed here.
            </span>
          </div>
        </div>
      </section>

      {dialogAction && (
        <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Administrator Re-authentication</p>
                <h3 className="text-xl font-bold text-slate-950 mt-2">
                  {dialogAction === 'rotate' ? 'Rotate user join code' : 'Reveal user join code'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Re-enter your EduNetGuard admin password to continue.
                </p>
              </div>
              <button
                onClick={closeDialog}
                disabled={busy}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitReauth} className="p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Admin password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  autoFocus
                  className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  placeholder="Enter your current password"
                />
              </label>

              {dialogError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {dialogError}
                </div>
              )}

              {dialogAction === 'rotate' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Rotating immediately invalidates the previous normal-user join code. Existing user accounts are not affected.
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !password}
                className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {busy
                  ? 'Verifying…'
                  : dialogAction === 'rotate'
                    ? 'Verify Password & Rotate'
                    : 'Verify Password & Reveal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default JoinCodePanel;
