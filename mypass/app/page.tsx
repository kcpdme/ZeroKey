// app/page.tsx
'use client';

import { useCallback, useRef, ChangeEvent, FormEvent } from 'react';
import {
  Shield,
  KeyRound,
  User,
  Globe,
  Hash,
  ChevronsRight,
  Settings,
  RefreshCw,
  Sparkles
} from 'lucide-react';

// Modular imports
import {
  FormInput,
  Checkbox,
  CounterInput,
  PasswordDisplay,
  AlgorithmSelector,
  MemorizableOptions
} from './components';
import { usePasswordGenerator, useAutoClean } from './hooks';

export default function HomePage() {
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
    handleOptionChange,
    memorizableOptions,
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

  return (
    <div className="min-h-screen animated-gradient-bg text-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Main Glass Card */}
        <div className="glass-card p-6 animate-fade-in-up">
          {/* Header */}
          <header className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 mb-4 shadow-lg shadow-cyan-500/30 animate-pulse-glow">
              <KeyRound className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Stateless Pass
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              {getDescription()}
            </p>
          </header>

          {/* Algorithm Selector */}
          <AlgorithmSelector
            algorithm={algorithm}
            onChange={setAlgorithm}
          />

          {/* Main Form */}
          <main>
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
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 transition-all backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex justify-between items-center w-full text-slate-300 hover:text-white transition-colors"
                  aria-expanded={showAdvanced}
                  aria-controls="advanced-options"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-400" aria-hidden="true" />
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
                            className="flex justify-between items-center text-slate-300 mb-2"
                          >
                            <span>Length</span>
                            <span className="font-mono text-lg" aria-live="polite">
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
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
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
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!canGenerate}
                  className="btn-primary w-full flex items-center justify-center gap-3"
                  aria-describedby="generate-hint"
                >
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                  {isLoading ? 'Generating...' : 'Generate Password'}
                </button>
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
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors focus:ring-2 focus:ring-slate-500"
                aria-label="Reset all fields"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </main>
        </div>
        {/* End glass-card */}
      </div>
    </div>
  );
}
