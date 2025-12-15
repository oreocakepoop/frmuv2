import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, Fingerprint } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a brief network check for UX feel
    setTimeout(() => {
      if (password === 'Score@8520') {
        onLogin();
      } else {
        setError('Access Denied: Invalid Security Key');
        setPassword('');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Brand Header */}
      <div className="mb-8 text-center animate-in slide-in-from-top-4 duration-500">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 inline-block mb-4">
             <ShieldCheck size={48} className="text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
             Network<span className="text-red-500 ml-0.5">›</span> Secure Workspace
        </h1>
        <p className="text-slate-500 text-sm mt-2">Merchant Match Automator & FRMU Dashboard</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-brand-700"></div>
          
          <div className="p-8 pt-10">
              <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Lock size={18} className="text-slate-400" /> System Access
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                      This application contains sensitive financial data. <br/> Please authenticate to continue.
                  </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Security Key</label>
                      <div className="relative group">
                          <input 
                              type="password" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="block w-full px-4 py-3.5 pl-11 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all group-hover:bg-white"
                              placeholder="Enter access code..."
                              autoFocus
                          />
                          <Fingerprint className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                      </div>
                  </div>

                  {error && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-xs font-bold text-red-600 animate-in shake">
                          <AlertCircle size={14} /> {error}
                      </div>
                  )}

                  <button 
                      type="submit" 
                      disabled={loading || !password}
                      className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-900/20 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                      {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                          <> Authenticate <ArrowRight size={16} /> </>
                      )}
                  </button>
              </form>
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                  <Lock size={10} /> 256-bit Secure Environment
              </p>
          </div>
      </div>

      <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-400">
              Authorized Personnel Only • v1.0.4
          </p>
      </div>
    </div>
  );
};