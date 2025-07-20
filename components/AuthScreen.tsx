import React, { useState } from 'react';

interface AuthScreenProps {
  mode: 'login' | 'signup';
  onToggleMode: () => void;
  onLogin: (username: string, passwordHash: string) => Promise<void>;
  onSignUp: (username: string, passwordHash: string) => Promise<void>;
  authError: string | null;
  isLoading: boolean;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ mode, onToggleMode, onLogin, onSignUp, authError, isLoading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading || !username.trim() || !password.trim()) return;

    if (mode === 'login') {
      await onLogin(username.trim(), password);
    } else {
      await onSignUp(username.trim(), password);
    }
  };

  const handleToggleClick = () => {
    onToggleMode();
    setUsername('');
    setPassword('');
  };

  return (
    <div className="flex flex-col items-center justify-center w-full p-4 flex-grow">
      <div className="w-full max-w-sm sm:max-w-md glassmorphic-surface p-6 sm:p-8 rounded-xl shadow-2xl border border-violet-500/50">
        <h2 className="text-2xl sm:text-3xl font-bold text-violet-400 mb-6 text-center">
          {mode === 'login' ? 'Welcome Back!' : 'Create Your Account'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full p-2.5 sm:p-3 bg-slate-700/50 text-slate-100 border border-slate-600/70 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm text-sm sm:text-base backdrop-blur-sm"
              aria-label="Username"
              disabled={isLoading}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2.5 sm:p-3 bg-slate-700/50 text-slate-100 border border-slate-600/70 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm text-sm sm:text-base backdrop-blur-sm"
              aria-label="Password"
              disabled={isLoading}
            />
          </div>

          {authError && (
            <p className="text-sm text-red-300 text-center bg-red-900/40 p-2.5 rounded-md border border-red-700/60">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700/90 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center border border-violet-500/70 text-sm sm:text-base"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              mode === 'login' ? 'Login' : 'Sign Up'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs sm:text-sm">
          <button
            onClick={handleToggleClick}
            disabled={isLoading}
            className="font-medium text-violet-400 hover:text-violet-300 transition-colors duration-150"
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
