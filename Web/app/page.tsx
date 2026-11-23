// app/page.tsx
'use client';

import { useCallback, useEffect, useRef, useState, ChangeEvent, FormEvent } from 'react';
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
import { DraftPasswordModal, GenerateModal } from './components/dashboard/GenerateModal';
import { TagSelector } from './components/dashboard/TagSelector';
import { usePasswordGenerator, useAutoClean, useTheme } from './hooks';
import { useAuth } from './context/AuthContext';
import { ProfileService, PasswordProfile } from './services/ProfileService';
import { SettingsService, UserSettings } from './services/SettingsService';
import { MemorableMemoryCard } from './components/MemorableMemoryCard';
import { normalizeLogin, normalizeSiteForAlgorithm } from './lib/normalize-input';

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
        className="mb-1.5 block text-sm font-semibold uppercase tracking-wide"
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
          className="zk-input h-11 w-full bg-transparent text-base font-normal tracking-normal focus:outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {revealable && (
          <button
            type="button"
            tabIndex={-1}
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
        <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
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
  const { user, loading: authLoading } = useAuth();
  const userIdRef = useRef(user?.uid);
  userIdRef.current = user?.uid;
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingProfile, setEditingProfile] = useState<PasswordProfile | null>(null);
  const [matchingProfiles, setMatchingProfiles] = useState<PasswordProfile[]>([]);
  const [draftProfile, setDraftProfile] = useState<PasswordProfile | null>(null);
  const [savedPreview, setSavedPreview] = useState<PasswordProfile | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const editingProfileId = editingProfile?.id ?? null;

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
    applyDefaults,
    showAdvanced,
    setShowAdvanced,
    canGenerate,
  } = usePasswordGenerator();

  // Ref for first input to focus on reset
  const masterInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<UserSettings | null>(null);
  const formRef = useRef({ site: '', login: '', master: '', editing: null as string | null, generated: '' });
  const [clipboardSeconds, setClipboardSeconds] = useState(30);
  const [autoCopy, setAutoCopy] = useState(false);
  const [vaultProfiles, setVaultProfiles] = useState<PasswordProfile[]>([]);

  formRef.current = {
    site,
    login,
    master: masterPassword,
    editing: editingProfileId,
    generated: generatedPassword,
  };

  useEffect(() => {
    if (!user) {
      settingsRef.current = null;
      setVaultProfiles([]);
      setMatchingProfiles([]);
      setDraftProfile(null);
      setSavedPreview(null);
      setEditingProfile(null);
      setSaveStatus(null);
      setResultReady(false);
      return;
    }

    let cancelled = false;
    SettingsService.getSettings(user.uid)
      .then((settings) => {
        if (cancelled) return;
        settingsRef.current = settings;
        setClipboardSeconds(settings.preferences.clearClipboardAfter);
        setAutoCopy(settings.preferences.autoCopyOnGenerate);
        const form = formRef.current;
        if (!form.site && !form.login && !form.master && !form.generated && !form.editing) {
          applyDefaults(settings);
        }
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [user, applyDefaults]);

  useEffect(() => {
    if (!user || algorithm !== 'memorizable') return;

    let cancelled = false;
    ProfileService.getUserProfiles(user.uid)
      .then((profiles) => {
        if (!cancelled) setVaultProfiles(profiles);
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [user, algorithm]);

  const clearResult = useCallback(() => {
    setResultReady(false);
    setMatchingProfiles([]);
    setSaveStatus(null);
  }, []);

  // Auto-clean hook for security. 0 seconds means never clear the clipboard.
  const { scheduleClearClipboard } = useAutoClean(
    useCallback(() => {
      resetFields();
      clearResult();
      setDraftProfile(null);
      setSavedPreview(null);
      if (settingsRef.current) {
        applyDefaults(settingsRef.current);
      }
    }, [resetFields, applyDefaults, clearResult]),
    {
      inactivityTimeout: 2 * 60 * 1000,
      clipboardTimeout: clipboardSeconds * 1000,
      clearOnBlur: false,
    }
  );

  const handleCopyWithClear = useCallback(async () => {
    await handleCopy();
    scheduleClearClipboard();
  }, [handleCopy, scheduleClearClipboard]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canGenerate || isSaving || authLoading || matchingProfiles.length) return;
    clearResult();
    setIsSaving(true);
    const userId = user?.uid;

    try {
      if (userId) {
        const existing = await ProfileService.findAccountProfiles(userId, site, login);
        if (userId !== userIdRef.current) return;
        if (existing.length) {
          setMatchingProfiles(existing);
          return;
        }
      }

      const generated = await handleGenerate();
      if (!generated || userId !== userIdRef.current) return;
      if (userId) {
        const saved = await ProfileService.createProfile({
          userId,
          site,
          login,
          algorithm,
          options: generated.recipeOptions,
          tags: selectedTags,
        });
        if (userId !== userIdRef.current) return;
        if (saved.status === 'exists') {
          setMatchingProfiles(saved.profiles);
          return;
        }
        setSaveStatus({ type: 'success', message: 'Recipe saved to vault.' });
        setVaultProfiles(profiles => [...profiles, saved.profile]);
      }

      setResultReady(true);
      if (autoCopy) {
        try {
          await navigator.clipboard.writeText(generated.password);
          scheduleClearClipboard();
        } catch {
          // Generation and autosave succeeded even if clipboard access is denied.
        }
      }
    } catch {
      if (userId === userIdRef.current) {
        setSaveStatus({ type: 'error', message: 'Could not check or save the recipe. Try generating again.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = useCallback(() => {
    resetFields();
    clearResult();
    setSelectedTags([]);
    setEditingProfile(null);
    if (settingsRef.current) {
      applyDefaults(settingsRef.current);
    }
    masterInputRef.current?.focus();
  }, [resetFields, clearResult, applyDefaults]);

  const handlePrepareVersion = async (profile: PasswordProfile) => {
    if (!profile.id || isSaving) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const latest = await ProfileService.prepareVersion(profile.id);
      if (latest.userId !== userIdRef.current) return;
      setMatchingProfiles(profiles => profiles.map(item => item.id === latest.id ? latest : item));
      setDraftProfile(latest);
    } catch (err) {
      setSaveStatus({ type: 'error', message: err instanceof Error ? err.message : 'Could not prepare the new version.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSaved = async (profile: PasswordProfile) => {
    if (!profile.id || isSaving) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const current = await ProfileService.getCurrentProfile(profile.id);
      if (current.userId !== userIdRef.current) return;
      setMatchingProfiles(profiles => profiles.map(item => item.id === current.id ? current : item));
      setSavedPreview(current);
    } catch {
      setSaveStatus({ type: 'error', message: 'Could not check the current recipe. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const canEditTags = editingProfile?.id
    && !editingProfile.id.startsWith('seed-')
    && normalizeSiteForAlgorithm(editingProfile.site, editingProfile.algorithm) === normalizeSiteForAlgorithm(site, editingProfile.algorithm)
    && editingProfile.login === normalizeLogin(login);

  const handleSaveTags = async () => {
    if (!canEditTags || !editingProfile?.id || isSaving) return;
    setIsSaving(true);
    try {
      await ProfileService.saveTags(editingProfile.id, selectedTags);
      setSaveStatus({ type: 'success', message: 'Tags saved.' });
    } catch {
      setSaveStatus({ type: 'error', message: 'Could not save tags. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const fineTuneSummary = algorithm === 'pbkdf2'
    ? `${options.length} chars · rotation ${options.counter || 1}`
    : `shift ${memorizableOptions.shift || 1} · magic #${memorizableOptions.magicNumber || 0}`;

  const handleLoadProfile = useCallback((profile: PasswordProfile) => {
    clearResult();
    setSite(profile.site);
    setLogin(profile.login);
    setAlgorithm(profile.algorithm);
    setSelectedTags(profile.tags || []);
    setEditingProfile(profile);

    const saved = profile.options || ({} as PasswordProfile['options']);
    setOptions({
      length: typeof saved.length === 'number' ? saved.length : 16,
      counter: typeof saved.counter === 'number' ? saved.counter : 1,
      useLowercase: saved.useLowercase !== false,
      useUppercase: saved.useUppercase !== false,
      useNumbers: saved.useNumbers !== false,
      useSymbols: saved.useSymbols !== false,
    });
    setUserSalt(saved.userSalt ?? '');
    setMemorizableOptions({
      shift: typeof saved.shift === 'number' ? saved.shift : 1,
      magicNumber: typeof saved.magicNumber === 'number' ? saved.magicNumber : 0,
    });

    setIsDashboardOpen(false);
    setTimeout(() => {
      masterInputRef.current?.focus();
    }, 100);
  }, [clearResult, setSite, setLogin, setAlgorithm, setOptions, setUserSalt, setMemorizableOptions]);

  const handleCloseDashboard = useCallback(() => {
    setIsDashboardOpen(false);
    resetFields();
    clearResult();
    setSelectedTags([]);
    setEditingProfile(null);
    if (settingsRef.current) {
      applyDefaults(settingsRef.current);
    }
  }, [resetFields, clearResult, applyDefaults]);

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

      {user && draftProfile && (
        <DraftPasswordModal
          profile={draftProfile}
          initialMasterPassword={masterPassword}
          clearClipboardAfter={clipboardSeconds}
          onClose={() => setDraftProfile(null)}
          onConfirmed={profile => {
            setMatchingProfiles(profiles => profiles.map(item => item.id === profile.id ? profile : item));
            setVaultProfiles(profiles => profiles.map(item => item.id === profile.id ? profile : item));
            setSaveStatus({ type: 'success', message: `v${profile.options.counter} is now current.` });
          }}
        />
      )}

      {user && savedPreview && (
        <GenerateModal
          profile={savedPreview}
          initialMasterPassword={masterPassword}
          clearClipboardAfter={clipboardSeconds}
          onClose={() => setSavedPreview(null)}
        />
      )}

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
              className="h-9 sm:h-10 px-4 rounded-xl text-base font-medium transition-all duration-200 hover:scale-105"
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
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: 'var(--text-primary)' }}
            >
              ZeroKey
            </h1>
          </div>
          <p
            className="mt-1.5 text-base"
            style={{ color: 'var(--text-muted)' }}
          >
            {user ? 'New recipes are saved to your vault. Your master key stays on this device.' : 'Use the same inputs to generate the same password on any device.'}
          </p>
        </header>

        <form onSubmit={handleSubmit} aria-busy={isSaving} onChange={() => setResultReady(false)}>
          <fieldset disabled={isSaving} className="min-w-0 space-y-4">
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
                onChange={(e) => { setSite(e.target.value); clearResult(); }}
                placeholder="github.com"
                icon={<Globe className="h-4 w-4" />}
                inputMode="url"
                autoComplete="off"
              />
              <LabeledField
                label="Login"
                value={login}
                onChange={(e) => { setLogin(e.target.value); clearResult(); }}
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
                  autoComplete="off"
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

          {algorithm === 'memorizable' && (
            <MemorableMemoryCard
              login={login}
              site={site}
              shift={Number(memorizableOptions.shift) || 1}
              magicNumber={Number(memorizableOptions.magicNumber) || 0}
              editingProfileId={editingProfileId}
              profiles={vaultProfiles}
            />
          )}

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
              <span className="flex items-center gap-2 text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                {algorithm === 'memorizable' ? (
                  <Brain className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                ) : (
                  <SlidersHorizontal className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                )}
                {algorithm === 'memorizable' ? 'Memory Map' : 'Fine-tune'}
                <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-secondary)' }}>
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
                        <div className="mb-2 flex items-center justify-between text-base">
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
                        <span className="mb-2 block text-base font-medium" style={{ color: 'var(--text-primary)' }}>
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
                                className="rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors"
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
                          className="mb-1.5 block text-base font-medium"
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
                          className="zk-text-input h-10 w-full max-w-xs rounded-xl border px-3 font-mono text-base focus:outline-none"
                          style={{
                            background: 'var(--bg-primary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
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
              {canEditTags && (
                <button type="button" className="mt-2 text-sm font-medium" onClick={handleSaveTags}>
                  Save tags
                </button>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-base"
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

          {matchingProfiles.length > 0 ? (
            <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: 'var(--border-color)' }}>
              <p className="font-medium">You already have a saved recipe for this account.</p>
              {matchingProfiles.map(profile => (
                <div key={profile.id} className="space-y-2">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {profile.algorithm === 'pbkdf2' ? 'Maximum strength' : 'Easy to say'}
                    {' · '}v{profile.options.counter ?? 1} current
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary rounded-xl px-3 py-2 text-sm font-medium"
                      onClick={() => handlePrepareVersion(profile)}>
                      {profile.pendingVersion ? 'Resume new version' : 'Create new version'}
                    </button>
                    <button type="button" className="rounded-xl border px-3 py-2 text-sm font-medium"
                      style={{ borderColor: 'var(--border-color)' }}
                      onClick={() => handleGenerateSaved(profile)}>
                      Generate saved password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="submit"
              disabled={!canGenerate || isSaving || authLoading}
              className="btn-primary w-full flex items-center justify-center gap-2.5 h-12 text-base font-medium rounded-xl"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isLoading ? 'Generating...' : isSaving ? 'Checking and saving…' : resultReady ? 'Generate again' : 'Generate password'}
            </button>
          )}
          </fieldset>
        </form>

        {resultReady && generatedPassword && (
          <div className="mt-4">
            <PasswordDisplay
              password={generatedPassword}
              isLoading={false}
              error={null}
              isVisible={isPasswordVisible}
              onToggleVisibility={() => setIsPasswordVisible(!isPasswordVisible)}
              onCopy={handleCopyWithClear}
              isCopied={isCopied}
            />
          </div>
        )}

        {saveStatus && (
          <p
            role={saveStatus.type === 'error' ? 'alert' : 'status'}
            className={`mt-2 rounded-lg px-4 py-2 text-center text-base ${saveStatus.type === 'success'
              ? 'text-green-600 bg-green-500/10'
              : 'text-red-500 bg-red-500/10'
              }`}
          >
            {saveStatus.message}
          </p>
        )}

        {/* Reset */}
        <div className="flex justify-center pt-6">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-base transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Reset all fields"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {/* Footer */}
        <p
          className="text-center text-sm mt-6 pb-4"
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
