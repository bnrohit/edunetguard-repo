import React, { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff, KeyRound, LogIn, ShieldCheck, UserPlus, X } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function AuthDialog({ open, mode = 'login', onClose, onAuthenticated }) {
  const [activeMode, setActiveMode] = useState(mode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const path = activeMode === 'register' ? '/auth/register' : '/auth/login';
      const payload = activeMode === 'register'
        ? { username, password, join_code: joinCode }
        : { username, password };

      const response = await axios.post(API_BASE + path, payload, {
        timeout: 10000,
        withCredentials: true,
      });

      onAuthenticated?.(response.data.user);
      setUsername('');
      setPassword('');
      setJoinCode('');
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to complete authentication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">EduNetGuard Account</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-950 mt-2">
              {activeMode === 'register' ? 'Create your dashboard account' : 'Sign in to your dashboard'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {activeMode === 'register'
                ? 'Use the secret join code provided by your administrator.'
                : 'Use your EduNetGuard username and password.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="your.username"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={activeMode === 'register' ? 'new-password' : 'current-password'}
                required
                minLength={10}
                className="w-full h-11 rounded-xl border border-slate-200 pl-3 pr-11 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="Minimum 10 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {activeMode === 'register' && (
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Secret join code</span>
              <div className="relative mt-1.5">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  placeholder="Code from your administrator"
                />
              </div>
            </label>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {activeMode === 'register' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {submitting ? 'Working…' : activeMode === 'register' ? 'Create Account' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode(activeMode === 'register' ? 'login' : 'register');
              setError('');
            }}
            className="w-full text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            {activeMode === 'register' ? 'Already have an account? Sign in' : 'Have a join code? Create an account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthDialog;
