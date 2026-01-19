// app/page.tsx
'use client';

import { useState, useCallback, FC, ReactNode, ChangeEvent } from 'react';
import { Shield, KeyRound, User, Globe, Hash, ChevronsRight, Copy, Check, Settings, RefreshCw, Plus, Minus, Eye, EyeOff, Sparkles } from 'lucide-react';

// --- Type Definitions ---

interface GeneratePasswordParams {
  masterPassword: string;
  site: string;
  login: string;
  userSalt?: string;
  counter?: number;
  length?: number;
  useSymbols?: boolean;
  useNumbers?: boolean;
  useUppercase?: boolean;
  useLowercase?: boolean;
}

interface OptionsState {
  counter: number;
  length: number;
  useSymbols: boolean;
  useNumbers: boolean;
  useUppercase: boolean;
  useLowercase: boolean;
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
}

interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

interface CounterInputProps {
    label: string;
    value: number;
    onIncrement: () => void;
    onDecrement: () => void;
}


// --- Password Generation Logic (Ported from Dart) ---

/**
 * Normalizes a site URL.
 * @param {string} site The site URL to normalize.
 * @returns {string} The normalized site URL.
 */
const normalizeSite = (site: string): string => {
  let normalized = site.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.replace(/\/+$/, '');
  return normalized;
};

/**
 * Normalizes an email/login.
 * @param {string} email The email/login to normalize.
 * @returns {string} The normalized email/login.
 */
const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Converts an ArrayBuffer to a Base64URL string.
 * @param {ArrayBuffer} buffer The buffer to convert.
 * @returns {string} The Base64URL encoded string.
 */
const bufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  // btoa is safe to use in a 'use client' component.
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * The core password generation function, translated from your Dart code.
 * It's deterministic based on the inputs.
 */
const generatePassword = async ({
  masterPassword,
  site,
  login,
  userSalt = '',
  counter = 1,
  length = 16,
  useSymbols = true,
  useNumbers = true,
  useUppercase = true,
  useLowercase = true,
}: GeneratePasswordParams): Promise<string> => {
  if (!masterPassword || !site || !login) {
    return '';
  }

  try {
    // 1. Normalize inputs
    const normalizedSite = normalizeSite(site);
    const normalizedLogin = normalizeEmail(login);

    // 2. Salt construction
    const baseSource = (userSalt || '') + normalizedSite + normalizedLogin;
    const saltSource = `${baseSource}|${counter}|${baseSource}`;
    
    // 3. Use SHA-256 to get a consistent salt
    const encoder = new TextEncoder();
    const saltSourceBytes = encoder.encode(saltSource);
    const digestBuffer = await crypto.subtle.digest('SHA-256', saltSourceBytes);
    const salt = new Uint8Array(digestBuffer).slice(0, 16);

    // 4. Use PBKDF2 with SHA-256
    const masterPasswordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const keyBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      masterPasswordKey,
      256
    );

    // 5. Convert hash to Base64 string
    const base = bufferToBase64Url(keyBuffer);

    // 6. Build character sets
    const charSets: { [key: string]: string } = {
      lower: useLowercase ? 'abcdefghjkmnpqrstuvwxyz' : '',
      upper: useUppercase ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : '',
      numbers: useNumbers ? '23456789' : '',
      symbols: useSymbols ? '!@#%^&*()-_=+[]{};:,.<>?' : ''
    };

    const allChars = Object.values(charSets).join('');
    if (allChars.length === 0) {
      throw new Error('At least one character set must be selected.');
    }

    // 7. Deterministic password generation
    const passwordChars = new Array<string | null>(length).fill(null);
    let entropyIndex = 0;

    // 7a. Ensure at least one char from each selected set
    for (const key in charSets) {
      const charSet = charSets[key];
      if (charSet.length > 0) {
        let pos = base.charCodeAt(entropyIndex % base.length) % length;
        
        while (passwordChars[pos] !== null) {
          entropyIndex++;
          pos = base.charCodeAt(entropyIndex % base.length) % length;
        }
        entropyIndex++;
        
        const charIdx = base.charCodeAt(entropyIndex % base.length) % charSet.length;
        passwordChars[pos] = charSet[charIdx];
        entropyIndex++;
      }
    }

    // 7b. Fill remaining positions
    for (let i = 0; i < length; i++) {
      if (passwordChars[i] === null) {
        const charIdx = base.charCodeAt(entropyIndex % base.length) % allChars.length;
        passwordChars[i] = allChars[charIdx];
        entropyIndex++;
      }
    }

    return passwordChars.join('');

  } catch (error) {
    console.error('Password generation failed:', error);
    return 'Error generating password.';
  }
};


// --- React UI Components ---

const FormInput: FC<FormInputProps> = ({ icon, ...props }) => (
  <div className="relative flex items-center">
    <div className="absolute left-0 pl-4 text-slate-400">{icon}</div>
    <input
      {...props}
      className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
    />
  </div>
);

const Checkbox: FC<CheckboxProps> = ({ id, label, checked, onChange }) => (
  <label htmlFor={id} className="flex items-center space-x-3 cursor-pointer select-none">
    <input type="checkbox" id={id} checked={checked} onChange={onChange} className="sr-only" />
    <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all duration-200 ${checked ? 'bg-cyan-500 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}>
      {checked && <Check className="w-4 h-4 text-slate-900" />}
    </div>
    <span className="text-slate-300">{label}</span>
  </label>
);

const CounterInput: FC<CounterInputProps> = ({ label, value, onIncrement, onDecrement }) => (
    <div className="flex items-center justify-between">
        <span className="text-slate-300">{label}</span>
        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
            <button onClick={onDecrement} className="p-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50" disabled={value <= 1}>
                <Minus className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono text-lg w-12 text-center">{value}</span>
            <button onClick={onIncrement} className="p-2 rounded-md hover:bg-slate-700 transition-colors">
                <Plus className="w-4 h-4" />
            </button>
        </div>
    </div>
);


// --- Main App Component ---

export default function HomePage() {
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [site, setSite] = useState<string>('');
  const [login, setLogin] = useState<string>('');
  const [userSalt, setUserSalt] = useState<string>('');
  
  const [options, setOptions] = useState<OptionsState>({
    counter: 1,
    length: 16,
    useSymbols: true,
    useNumbers: true,
    useUppercase: true,
    useLowercase: true,
  });

  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

  const handleGenerate = useCallback(async () => {
    if (!masterPassword || !site || !login) {
      setGeneratedPassword('');
      return;
    }
    setIsLoading(true);
    setGeneratedPassword('');
    const password = await generatePassword({
      masterPassword,
      site,
      login,
      userSalt,
      ...options,
    });
    setGeneratedPassword(password);
    setIsLoading(false);
    setIsPasswordVisible(false);
  }, [masterPassword, site, login, userSalt, options]);

  const handleCopy = async (): Promise<void> => {
    if (!generatedPassword) return;

    try {
      await navigator.clipboard.writeText(generatedPassword);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers or iframe environments
      const textArea = document.createElement('textarea');
      textArea.value = generatedPassword;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Unable to copy:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleOptionChange = <K extends keyof OptionsState>(key: K, value: OptionsState[K]): void => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };
  
  const resetFields = (): void => {
    setMasterPassword('');
    setSite('');
    setLogin('');
    setUserSalt('');
    setOptions({
        counter: 1,
        length: 16,
        useSymbols: true,
        useNumbers: true,
        useUppercase: true,
        useLowercase: true,
    });
    setGeneratedPassword('');
    setShowAdvanced(false);
    setIsPasswordVisible(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-100 flex items-center justify-center gap-3">
            <KeyRound className="w-10 h-10 text-cyan-400" />
            <span>Stateless Pass</span>
          </h1>
          <p className="text-slate-400 mt-2">Deterministic password generation in your browser.</p>
        </header>

        <main className="space-y-4" suppressHydrationWarning>
          <FormInput
            type="text"
            placeholder="Login (e.g., user@email.com)"
            value={login}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLogin(e.target.value)}
            icon={<User className="w-5 h-5" />}
          />
          <FormInput
            type="text"
            placeholder="Site (e.g., google.com)"
            value={site}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSite(e.target.value)}
            icon={<Globe className="w-5 h-5" />}
          />
          <FormInput
            type="password"
            placeholder="Master Password"
            value={masterPassword}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMasterPassword(e.target.value)}
            icon={<Shield className="w-5 h-5" />}
          />
          <FormInput
            type="text"
            placeholder="User Salt (optional, but recommended)"
            value={userSalt}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUserSalt(e.target.value)}
            icon={<Hash className="w-5 h-5" />}
          />

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 transition-all">
             <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex justify-between items-center w-full text-slate-300 hover:text-white">
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    <span>Advanced Options</span>
                </div>
                <ChevronsRight className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
             </button>
             {showAdvanced && (
                <div className="mt-6 space-y-6">
                    <div className="space-y-4">
                        <CounterInput 
                            label="Counter (Version)"
                            value={options.counter}
                            onIncrement={() => handleOptionChange('counter', options.counter + 1)}
                            onDecrement={() => handleOptionChange('counter', options.counter - 1)}
                        />
                        
                        <div>
                            <label className="flex justify-between items-center text-slate-300 mb-2">
                                <span>Length</span>
                                <span className="font-mono text-lg">{options.length}</span>
                            </label>
                            <input
                                type="range"
                                min="8"
                                max="64"
                                value={options.length}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleOptionChange('length', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                           <Checkbox id="lower" label="Lowercase (a-z)" checked={options.useLowercase} onChange={(e: ChangeEvent<HTMLInputElement>) => handleOptionChange('useLowercase', e.target.checked)} />
                           <Checkbox id="upper" label="Uppercase (A-Z)" checked={options.useUppercase} onChange={(e: ChangeEvent<HTMLInputElement>) => handleOptionChange('useUppercase', e.target.checked)} />
                           <Checkbox id="numbers" label="Numbers (0-9)" checked={options.useNumbers} onChange={(e: ChangeEvent<HTMLInputElement>) => handleOptionChange('useNumbers', e.target.checked)} />
                           <Checkbox id="symbols" label="Symbols (!@#)" checked={options.useSymbols} onChange={(e: ChangeEvent<HTMLInputElement>) => handleOptionChange('useSymbols', e.target.checked)} />
                        </div>
                    </div>
                </div>
             )}
          </div>

          <div className="pt-2">
            <button 
              onClick={handleGenerate}
              disabled={isLoading || !login || !site || !masterPassword}
              className="w-full flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {isLoading ? 'Generating...' : 'Generate Password'}
            </button>
          </div>

          <div className="pt-2">
            <div className="relative bg-slate-800 border border-slate-700 rounded-lg flex items-center h-16">
              {isLoading && <div className="absolute inset-0 flex items-center justify-center text-slate-400">Generating...</div>}
              {!isLoading && generatedPassword && (
                <>
                  <pre className="flex-grow px-4 text-slate-200 text-lg font-mono tracking-widest truncate">
                    {isPasswordVisible ? generatedPassword : '•'.repeat(generatedPassword.length)}
                  </pre>
                  <div className="flex items-center h-full">
                    <button onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="p-4 h-full flex items-center justify-center hover:bg-slate-700 transition-colors">
                      {isPasswordVisible ? <EyeOff className="w-6 h-6 text-slate-300" /> : <Eye className="w-6 h-6 text-slate-300" />}
                    </button>
                    <button onClick={handleCopy} className="p-4 h-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 transition-colors rounded-r-lg">
                      {isCopied ? <Check className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6 text-slate-300" />}
                    </button>
                  </div>
                </>
              )}
              {!isLoading && !generatedPassword && (
                 <div className="flex-grow px-4 text-slate-500 text-center">Press &apos;Generate&apos; to create a password</div>
              )}
            </div>
          </div>
          
          <div className="flex justify-center pt-4">
            <button onClick={resetFields} className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
                <span>Reset</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
