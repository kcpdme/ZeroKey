// app/page.tsx
'use client';

import { useCallback, useRef, useState, ChangeEvent, FormEvent } from 'react';
import {
  KeyRound,
  User,
  Globe,
  Hash,
  AtSign,
  RefreshCw,
  Sparkles,
  Sun,
  Moon,
  Save,
  ChevronDown,
  SlidersHorizontal,
  Brain,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

import { ZeroKeyLogo } from './components/ui/ZeroKeyLogo';

// Modular imports
import {
  PasswordDisplay,
  AlgorithmSelector,
  MemorizableOptions,
  DashboardV2
} from './components';
import { AuthModal } from './components/auth';
import { TagSelector } from './components/dashboard/TagSelector';
import { usePasswordGenerator, useAutoClean, useTheme } from './hooks';
import { useAuth } from './context/AuthContext';
import { ProfileService } from './services/ProfileService';

/* ─── Labeled Field (matching alt design) ─── */
function LabeledField({
  label,
  hint,
  icon,
  revealable,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
  inputRef,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  revealable?: boolean;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'email' | 'url' | 'numeric' | 'text';
  autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [revealed, setRevealed] = useState(false);
  const inputType = revealable ? (revealed ? 'text' : 'password') : type;

  return (
    <div className="w-full">
      <label
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <div
        className="zk-field flex items-center gap-2.5 rounded-xl border px-3.5 transition-colors"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        {icon && <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>}
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="zk-input h-11 w-full bg-transparent text-sm font-normal tracking-normal focus:outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="rounded-md p-1 transition-colors shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={revealed ? 'Hide value' : 'Show value'}
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ─── Charset pill toggles (matching alt design) ─── */
const charsets: Array<{ key: string; label: string }> = [
  { key: 'useLowercase', label: 'a-z' },
  { key: 'useUppercase', label: 'A-Z' },
  { key: 'useNumbers', label: '0-9' },
  { key: 'useSymbols', label: '!@#' },
];

export default function HomePage() {
  // Theme
  const { theme, toggleTheme, mounted } = useTheme();

  // Auth
  const { user } = useAuth();
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

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
  const masterInputRef = useRef<HTMLInputElement>(null);

  // Auto-clean hook for security
  const { scheduleClearClipboard } = useAutoClean(
    useCallback(() => {
      resetFields();
    }, [resetFields]),
    {
      inactivityTimeout: 2 * 60 * 1000,
      clipboardTimeout: 30 * 1000,
      clearOnBlur: false,
    }
  );

  const handleCopyWithClear = useCallback(async () => {
    await handleCopy();
    scheduleClearClipboard();
  }, [handleCopy, scheduleClearClipboard]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (canGenerate) {
      handleGenerate();
    }
  }, [canGenerate, handleGenerate]);

  const handleReset = useCallback(() => {
    resetFields();
    setSelectedTags([]);
    setEditingProfileId(null);
    masterInputRef.current?.focus();
  }, [resetFields]);

  // Fine-tune / Memory Map summary
  const fineTuneSummary = algorithm === 'pbkdf2'
    ? `${options.length} chars · rotation ${options.counter || 1}`
    : `shift ${memorizableOptions.shift || 1} · magic #${memorizableOptions.magicNumber || 0}`;

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
          : { ...options, ...memorizableOptions } as any,
        tags: selectedTags,
      });
      setSaveStatus({ type: 'success', message: editingProfileId ? 'Updated in vault!' : 'Saved to vault!' });
      setEditingProfileId(null);
    } catch (error: any) {
      console.error(error);
      setSaveStatus({
        type: 'error',
        message: error.message || 'Failed to save. Please try again.'
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleLoadProfile = useCallback((profile: any) => {
    setSite(profile.site);
    setLogin(profile.login);
    setAlgorithm(profile.algorithm);
    setSelectedTags(profile.tags || []);
    setEditingProfileId(profile.id || null);

    if (profile.algorithm === 'pbkdf2') {
      if (profile.options.length) handleOptionChange('length', profile.options.length);
      if (profile.options.counter) handleOptionChange('counter', profile.options.counter);
      if (profile.options.userSalt) setUserSalt(profile.options.userSalt);
    } else {
      setMemorizableOptions({
        shift: profile.options.shift,
        magicNumber: profile.options.magicNumber
      });
    }

    setIsDashboardOpen(false);
    setTimeout(() => {
      masterInputRef.current?.focus();
    }, 100);
  }, [setSite, setLogin, setAlgorithm, handleOptionChange, setUserSalt, setMemorizableOptions]);

  const handleCloseDashboard = useCallback(() => {
    setIsDashboardOpen(false);
    resetFields();
    setSelectedTags([]);
    setEditingProfileId(null);
  }, [resetFields]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="min-h-screen font-sans flex items-start justify-center px-4 py-8 sm:px-6 lg:py-12 transition-colors duration-300"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <DashboardV2
        isOpen={isDashboardOpen}
        onClose={handleCloseDashboard}
        onLoadProfile={handleLoadProfile}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Auth & Theme Controls */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 flex items-center gap-2 z-20">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-200 hover:scale-105"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
          }}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {!user ? (
          <>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="h-9 sm:h-10 px-4 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Sign In
            </button>
            {/* Dev shortcut to preview vault without logging in */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => setIsDashboardOpen(true)}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-200 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
                title="Preview Vault (Dev Mode)"
              >
                <User className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => setIsDashboardOpen(true)}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            title="My Vault"
          >
            <User className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="w-full max-w-xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <ZeroKeyLogo
              className="w-7 h-7"
              style={{ color: 'var(--color-cyan-500)' }}
            />
            <h1
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ color: 'var(--text-primary)' }}
            >
              ZeroKey
            </h1>
          </div>
          <p
            className="mt-1.5 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Same three ingredients, same result — on any device, without storing a thing.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Algorithm Picker */}
          <AlgorithmSelector
            algorithm={algorithm}
            onChange={setAlgorithm}
          />

          {/* Primary Fields Card */}
          <div
            className="space-y-4 rounded-2xl p-5"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Site + Login row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledField
                label="Site"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="github.com"
                icon={<Globe className="h-4 w-4" />}
                inputMode="url"
                autoComplete="off"
              />
              <LabeledField
                label="Login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="you@company.com"
                icon={<AtSign className="h-4 w-4" />}
                inputMode="email"
                autoComplete="username"
              />
            </div>

            {/* Master key + Salt row */}
            {algorithm === 'pbkdf2' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledField
                  label="Master key"
                  revealable
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Secret password"
                  icon={<KeyRound className="h-4 w-4" />}
                  hint="Stays on this device for session."
                  autoComplete="current-password"
                  inputRef={masterInputRef}
                />
                <LabeledField
                  label="Salt"
                  value={userSalt}
                  onChange={(e) => setUserSalt(e.target.value)}
                  placeholder="optional"
                  icon={<Hash className="h-4 w-4" />}
                  hint="User salt for extra security."
                  autoComplete="off"
                />
              </div>
            )}

            {/* Memorizable-specific Fields */}
            {algorithm === 'memorizable' && (
              <MemorizableOptions
                options={memorizableOptions}
                onChange={handleMemorizableOptionChange}
                showAsFields={true}
              />
            )}
          </div>

          {/* Fine-tune (Advanced Options) */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {algorithm === 'memorizable' ? (
                  <Brain className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                ) : (
                  <SlidersHorizontal className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                )}
                {algorithm === 'memorizable' ? 'Memory Map' : 'Fine-tune'}
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-secondary)' }}>
                  {fineTuneSummary}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-muted)' }}
              />
            </button>

            {showAdvanced && (
              <div
                className="space-y-5 px-4 pb-5"
                style={{ borderTop: '1px solid var(--border-color)' }}
              >
                <div className="pt-5">
                  {algorithm === 'pbkdf2' ? (
                    <>
                      {/* Length slider */}
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <label htmlFor="length" className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            Length
                          </label>
                          <span className="font-mono" style={{ color: 'var(--color-cyan-500)' }}>
                            {options.length}
                          </span>
                        </div>
                        <input
                          id="length"
                          type="range"
                          min={8}
                          max={48}
                          value={options.length}
                          onChange={(e) => handleOptionChange('length', parseInt(e.target.value, 10))}
                          className="zk-range h-1.5 w-full cursor-pointer appearance-none rounded-full"
                        />
                      </div>

                      {/* Character sets - pill toggles */}
                      <div className="mt-5">
                        <span className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Character sets
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {charsets.map((set) => {
                            const active = Boolean((options as any)[set.key]);
                            return (
                              <button
                                key={set.key}
                                type="button"
                                aria-pressed={active}
                                onClick={() => handleOptionChange(set.key as any, !active)}
                                className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
                                style={{
                                  borderColor: active ? 'rgba(16, 185, 129, 0.6)' : 'var(--border-color)',
                                  background: active ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                  color: active ? 'var(--color-cyan-500)' : 'var(--text-muted)',
                                }}
                              >
                                {set.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Rotation */}
                      <div className="mt-5">
                        <label
                          htmlFor="counter"
                          className="mb-1.5 block text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Rotation
                        </label>
                        <input
                          id="counter"
                          type="text"
                          inputMode="numeric"
                          value={options.counter === ('' as any) ? '' : options.counter}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              handleOptionChange('counter', '' as any);
                            } else {
                              const num = parseInt(raw, 10);
                              if (!isNaN(num)) {
                                handleOptionChange('counter', num);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (options.counter === ('' as any) || isNaN(Number(options.counter)) || Number(options.counter) < 1) {
                              handleOptionChange('counter', 1);
                            }
                          }}
                          className="zk-text-input h-10 w-full max-w-xs rounded-xl border px-3 font-mono text-sm focus:outline-none"
                          style={{
                            background: 'var(--bg-primary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          Bump this to retire a password.
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Memorizable fine-tune */
                    <MemorizableOptions
                      options={memorizableOptions}
                      onChange={handleMemorizableOptionChange}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tags Selector - Only for logged in users */}
          {user && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <TagSelector
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                showLabel={true}
                maxTags={3}
              />
            </div>
          )}

          {/* Error display */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm"
              style={{
                border: '1px solid rgba(220, 38, 38, 0.3)',
                background: 'rgba(220, 38, 38, 0.1)',
                color: '#f87171',
              }}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            type="submit"
            disabled={!canGenerate}
            className="btn-primary w-full flex items-center justify-center gap-2.5 h-12 text-base font-medium rounded-xl"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {isLoading ? 'Generating...' : generatedPassword ? 'Generate again' : 'Generate password'}
          </button>
        </form>

        {/* Password Result + Save */}
        {(generatedPassword || isLoading) && (
          <div className="mt-4">
            <PasswordDisplay
              password={generatedPassword}
              isLoading={isLoading}
              error={null}
              isVisible={isPasswordVisible}
              onToggleVisibility={() => setIsPasswordVisible(!isPasswordVisible)}
              onCopy={handleCopyWithClear}
              isCopied={isCopied}
            />

            {/* Save Profile Button */}
            {generatedPassword && user && (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-colors"
                style={{
                  color: 'var(--color-cyan-500)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
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
                className={`mt-2 text-center text-sm py-2 px-4 rounded-lg ${saveStatus.type === 'success'
                  ? 'text-green-600 bg-green-500/10'
                  : 'text-red-500 bg-red-500/10'
                  }`}
              >
                {saveStatus.message}
              </div>
            )}
          </div>
        )}

        {/* Reset */}
        <div className="flex justify-center pt-6">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Reset all fields"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-6 pb-4"
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
