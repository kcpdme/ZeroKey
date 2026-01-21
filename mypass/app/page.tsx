// app/page.tsx
'use client';

import { useCallback, useRef, useState, ChangeEvent, FormEvent } from 'react';
import {
  Shield,
  KeyRound,
  User,
  Globe,
  Hash,
  ChevronsRight,
  Settings,
  RefreshCw,
  Sparkles,
  Sun,
  Moon,
  Save
} from 'lucide-react';

// Modular imports
import {
  FormInput,
  Checkbox,
  CounterInput,
  PasswordDisplay,
  AlgorithmSelector,
  MemorizableOptions,
  Dashboard
} from './components';
import { AuthModal } from './components/auth';
import { usePasswordGenerator, useAutoClean, useTheme } from './hooks';
import { useAuth } from './context/AuthContext';
import { ProfileService } from './services/ProfileService';

export default function HomePage() {
  // Theme
  const { theme, toggleTheme, mounted } = useTheme();

  // Auth
  const { user } = useAuth();
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Use custom hook for all password generator state
  const {
    algorithm,
    setAlgorithm,
    masterPassword,
    setMasterPassword,
    site,
    setSite,
    login,
    setLogin,
    userSalt,
    setUserSalt,
    options,
    setOptions,
    handleOptionChange,
    memorizableOptions,
    setMemorizableOptions,
    handleMemorizableOptionChange,
    generatedPassword,
    isLoading,
    error,
    isPasswordVisible,
    setIsPasswordVisible,
    isCopied,
    handleGenerate,
    handleCopy,
    resetFields,
    showAdvanced,
    setShowAdvanced,
    canGenerate,
  } = usePasswordGenerator();

  // Ref for first input to focus on reset
  const loginInputRef = useRef<HTMLInputElement>(null);

  // Auto-clean hook for security
  const { scheduleClearClipboard } = useAutoClean(
    useCallback(() => {
      // Clear sensitive data on inactivity
      resetFields();
    }, [resetFields]),
    {
      inactivityTimeout: 2 * 60 * 1000, // 2 minutes
      clipboardTimeout: 30 * 1000, // 30 seconds
      clearOnBlur: false,
    }
  );

  // Enhanced copy handler that also schedules clipboard clearing
  const handleCopyWithClear = useCallback(async () => {
    await handleCopy();
    scheduleClearClipboard();
  }, [handleCopy, scheduleClearClipboard]);

  // Handle form submission (Enter key)
  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (canGenerate) {
      handleGenerate();
    }
  }, [canGenerate, handleGenerate]);

  // Enhanced reset that focuses the first input
  const handleReset = useCallback(() => {
    resetFields();
    loginInputRef.current?.focus();
  }, [resetFields]);

  // Get algorithm-specific description
  const getDescription = () => {
    if (algorithm === 'pbkdf2') {
      return 'Cryptographically secure password generation.';
    }
    return 'Human-memorizable passwords using Indian rivers.';
  };

  const handleSaveProfile = async () => {
    if (!user || !generatedPassword) return;
    setIsSaving(true);
    setSaveStatus(null);

    try {
      await ProfileService.saveProfile({
        userId: user.uid,
        site,
        login,
        algorithm,
        options: algorithm === 'pbkdf2'
          ? { ...options, userSalt }
          : { ...options, ...memorizableOptions } as any
      });
      setSaveStatus({ type: 'success', message: 'Saved to vault!' });
    } catch (error: any) {
      console.error(error);
      setSaveStatus({
        type: 'error',
        message: error.message || 'Failed to save. Please try again.'
      });
    } finally {
      setIsSaving(false);
      // Auto-clear status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleLoadProfile = useCallback((profile: any) => {
    setSite(profile.site);
    setLogin(profile.login);
    setAlgorithm(profile.algorithm);

    if (profile.algorithm === 'pbkdf2') {
      if (profile.options.length) handleOptionChange('length', profile.options.length);
      if (profile.options.counter) handleOptionChange('counter', profile.options.counter);
      if (profile.options.userSalt) setUserSalt(profile.options.userSalt);
      // options.useLowercase etc are not in the profile type yet but should be mapped if needed
    } else {
      setMemorizableOptions({
        shift: profile.options.shift,
        magicNumber: profile.options.magicNumber
      });
    }

    setIsDashboardOpen(false);
    // Focus master password field after loading
    setTimeout(() => {
      const inputs = document.querySelectorAll('input');
      // Find the master password input - it's usually the 3rd one if visible
      const masterPassInput = Array.from(inputs).find(i => i.placeholder.includes('Master Password'));
      if (masterPassInput) (masterPassInput as HTMLElement).focus();
    }, 100);
  }, [setSite, setLogin, setAlgorithm, handleOptionChange, setUserSalt, setMemorizableOptions]);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div
      className="min-h-screen font-sans flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <Dashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        onLoadProfile={handleLoadProfile}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Auth & Theme Controls - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
        {!user ? (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-lg"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            Sign In
          </button>
        ) : (
          <button
            onClick={() => setIsDashboardOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-lg flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
              color: 'white',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
            }}
          >
            <User className="w-4 h-4" />
            My Vault
          </button>
        )}
      </div>

      {/* Floating Theme Toggle - Bottom Right */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 p-4 rounded-full transition-all duration-300 hover:scale-110 shadow-lg z-50"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Header - Seamless */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-cyan-600))',
                boxShadow: '0 6px 20px rgba(6, 182, 212, 0.3)'
              }}
            >
              <KeyRound className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Stateless Pass
            </h1>
          </div>
          <p
            className="text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            {getDescription()}
          </p>
        </header>

        {/* Algorithm Selector */}
        <AlgorithmSelector
          algorithm={algorithm}
          onChange={setAlgorithm}
        />

        {/* Main Form - Seamless */}
        <main className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields: Login and Site */}
            <FormInput
              ref={loginInputRef}
              type="text"
              placeholder="Login (e.g., user@email.com)"
              value={login}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLogin(e.target.value)}
              icon={<User className="w-5 h-5" aria-hidden="true" />}
              label="Login email or username"
              inputMode="email"
              autoComplete="username"
            />

            <FormInput
              type="text"
              placeholder="Site (e.g., google.com)"
              value={site}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSite(e.target.value)}
              icon={<Globe className="w-5 h-5" aria-hidden="true" />}
              label="Website or service name"
              inputMode="url"
              autoComplete="off"
            />

            {/* PBKDF2-specific Fields */}
            {algorithm === 'pbkdf2' && (
              <>
                <FormInput
                  type="password"
                  placeholder="Master Password"
                  value={masterPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setMasterPassword(e.target.value)}
                  icon={<Shield className="w-5 h-5" aria-hidden="true" />}
                  label="Master password"
                  autoComplete="current-password"
                />

                <FormInput
                  type="text"
                  placeholder="User Salt (optional, but recommended)"
                  value={userSalt}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setUserSalt(e.target.value)}
                  icon={<Hash className="w-5 h-5" aria-hidden="true" />}
                  label="User salt for additional security"
                  autoComplete="off"
                />
              </>
            )}

            {/* Memorizable-specific Fields */}
            {algorithm === 'memorizable' && (
              <MemorizableOptions
                options={memorizableOptions}
                onChange={handleMemorizableOptionChange}
                showAsFields={true}
              />
            )}

            {/* Advanced Options Panel */}
            <div
              className="rounded-xl p-4 transition-all duration-300"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex justify-between items-center w-full transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                aria-expanded={showAdvanced}
                aria-controls="advanced-options"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" style={{ color: 'var(--color-cyan-500)' }} aria-hidden="true" />
                  <span className="font-medium">
                    {algorithm === 'pbkdf2' ? 'Advanced Options' : 'Generation Options'}
                  </span>
                </div>
                <ChevronsRight
                  className={`w-5 h-5 transition-transform duration-300 ${showAdvanced ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {showAdvanced && (
                <div id="advanced-options" className="mt-6">
                  {/* PBKDF2 Options */}
                  {algorithm === 'pbkdf2' && (
                    <div className="space-y-4">
                      <CounterInput
                        label="Counter (Version)"
                        value={options.counter}
                        onIncrement={() => handleOptionChange('counter', options.counter + 1)}
                        onDecrement={() => handleOptionChange('counter', options.counter - 1)}
                        min={1}
                      />

                      <div>
                        <label
                          htmlFor="length-slider"
                          className="flex justify-between items-center mb-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <span>Length</span>
                          <span className="font-mono text-lg" style={{ color: 'var(--color-cyan-500)' }} aria-live="polite">
                            {options.length}
                          </span>
                        </label>
                        <input
                          id="length-slider"
                          type="range"
                          min="8"
                          max="64"
                          value={options.length}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOptionChange('length', parseInt(e.target.value, 10))
                          }
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          style={{ background: 'var(--bg-tertiary)' }}
                          aria-valuemin={8}
                          aria-valuemax={64}
                          aria-valuenow={options.length}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <Checkbox
                          id="lower"
                          label="Lowercase (a-z)"
                          checked={options.useLowercase}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOptionChange('useLowercase', e.target.checked)
                          }
                        />
                        <Checkbox
                          id="upper"
                          label="Uppercase (A-Z)"
                          checked={options.useUppercase}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOptionChange('useUppercase', e.target.checked)
                          }
                        />
                        <Checkbox
                          id="numbers"
                          label="Numbers (0-9)"
                          checked={options.useNumbers}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOptionChange('useNumbers', e.target.checked)
                          }
                        />
                        <Checkbox
                          id="symbols"
                          label="Symbols (!@#)"
                          checked={options.useSymbols}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOptionChange('useSymbols', e.target.checked)
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Memorizable Options */}
                  {algorithm === 'memorizable' && (
                    <MemorizableOptions
                      options={memorizableOptions}
                      onChange={handleMemorizableOptionChange}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={!canGenerate}
                className="btn-primary w-full flex items-center justify-center gap-3"
                aria-describedby="generate-hint"
              >
                <Sparkles className="w-5 h-5" aria-hidden="true" />
                {isLoading ? 'Generating...' : 'Generate Password'}
              </button>

              {/* Save Profile Button (Only if generated and logged in) */}
              {generatedPassword && user && (
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg text-cyan-600 dark:text-cyan-400"
                >
                  {isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to Vault
                    </>
                  )}
                </button>
              )}

              {/* Save Status Feedback */}
              {saveStatus && (
                <div
                  className={`text-center text-sm py-2 px-4 rounded-lg ${saveStatus.type === 'success'
                    ? 'text-green-600 bg-green-500/10'
                    : 'text-red-500 bg-red-500/10'
                    }`}
                >
                  {saveStatus.message}
                </div>
              )}

              <span id="generate-hint" className="sr-only">
                Press Enter or click to generate password
              </span>
            </div>
          </form>

          {/* Password Display */}
          <PasswordDisplay
            password={generatedPassword}
            isLoading={isLoading}
            error={error}
            isVisible={isPasswordVisible}
            onToggleVisibility={() => setIsPasswordVisible(!isPasswordVisible)}
            onCopy={handleCopyWithClear}
            isCopied={isCopied}
          />

          {/* Reset Button */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Reset all fields"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </main>

        {/* Footer */}
        <p
          className="text-center text-xs mt-8"
          style={{ color: 'var(--text-muted)' }}
        >
          {user
            ? 'Your settings are synced. Your master password is NEVER stored.'
            : 'Your password is generated locally. Nothing is stored.'}
        </p>
      </div>
    </div>
  );
}
