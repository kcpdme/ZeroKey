# DevVault - Developer Credentials & Secrets Manager

## Project Overview

**DevVault** is a secure, modern web application for managing developer credentials, API keys, environment variables, and configuration files across multiple projects. Unlike traditional password managers, DevVault is specifically designed for developers and DevOps engineers who need to organize and access project-related secrets efficiently.

---

## Core Concept

Each **Project** contains multiple **Credential Categories**:

```
DevVault
├── Project: "E-commerce App"
│   ├── 🔗 Codebase
│   │   ├── GitHub (login, password/PAT, SSH key)
│   │   └── Repository URL
│   ├── 🚀 Deployment
│   │   ├── Vercel (email, password, team ID)
│   │   └── Domain registrar credentials
│   ├── 🔥 Backend Services
│   │   ├── Firebase (email, password, project ID)
│   │   ├── Supabase (email, password, anon key, service key)
│   │   └── MongoDB Atlas (connection string)
│   ├── 📄 Config Files
│   │   ├── .env.local
│   │   ├── .env.production
│   │   ├── google-services.json
│   │   └── firebase-admin.json
│   └── 🔑 API Keys
│       ├── Stripe (publishable, secret)
│       ├── SendGrid API key
│       └── OpenAI API key
│
├── Project: "Mobile App"
│   └── ... (similar structure)
│
└── Project: "Internal Dashboard"
    └── ... (similar structure)
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: CSS Variables + Modern CSS (NO Tailwind unless specified)
- **Icons**: Lucide React
- **State Management**: React Context + Hooks

### Backend & Database
- **Authentication**: Firebase Auth (Google, Email/Password)
- **Database**: Firestore
- **File Storage**: Firebase Storage (for encrypted config files)
- **Encryption**: AES-256-GCM for sensitive data

### Design System
- **Theme**: Dark mode primary, Light mode secondary
- **Aesthetic**: Modern glassmorphism, subtle gradients, smooth animations
- **Inspiration**: 1Password, Bitwarden, Linear app

---

## Database Schema

### Collections Structure

```typescript
// Collection: users/{userId}
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: {
    theme: 'dark' | 'light' | 'system';
    defaultView: 'grid' | 'list';
    clipboardTimeout: number; // seconds to clear clipboard
    lockTimeout: number; // minutes before auto-lock
  };
}

// Collection: users/{userId}/projects/{projectId}
interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string; // emoji or icon name
  color?: string; // hex color for project badge
  createdAt: Timestamp;
  updatedAt: Timestamp;
  favorite: boolean;
  archived: boolean;
  tags: string[];
}

// Collection: users/{userId}/projects/{projectId}/credentials/{credentialId}
interface Credential {
  id: string;
  category: CredentialCategory;
  type: CredentialType;
  name: string; // e.g., "GitHub Main Account", "Production Vercel"
  description?: string;
  
  // Encrypted fields
  fields: EncryptedField[];
  
  // Metadata
  url?: string;
  favicon?: string;
  tags: string[];
  favorite: boolean;
  lastAccessedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface EncryptedField {
  key: string; // e.g., "username", "password", "apiKey"
  value: string; // encrypted value
  type: 'text' | 'password' | 'email' | 'url' | 'textarea' | 'file';
  visible?: boolean; // show by default or masked
}

// Collection: users/{userId}/projects/{projectId}/files/{fileId}
interface ConfigFile {
  id: string;
  name: string; // e.g., ".env.production"
  type: 'env' | 'json' | 'xml' | 'yaml' | 'pem' | 'other';
  mimeType: string;
  size: number;
  storagePath: string; // Firebase Storage path (encrypted)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Enums
type CredentialCategory = 
  | 'codebase'      // GitHub, GitLab, Bitbucket
  | 'deployment'    // Vercel, Netlify, AWS, GCP, Azure
  | 'backend'       // Firebase, Supabase, MongoDB, PostgreSQL
  | 'api_keys'      // Stripe, SendGrid, Twilio, OpenAI
  | 'database'      // Connection strings, admin credentials
  | 'email'         // SMTP, email service providers
  | 'domain'        // Domain registrars, DNS providers
  | 'other';

type CredentialType =
  // Codebase
  | 'github' | 'gitlab' | 'bitbucket' | 'azure_devops'
  // Deployment
  | 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure' | 'digitalocean' | 'heroku' | 'railway'
  // Backend
  | 'firebase' | 'supabase' | 'mongodb' | 'postgresql' | 'mysql' | 'redis' | 'planetscale'
  // API Keys
  | 'stripe' | 'sendgrid' | 'twilio' | 'openai' | 'anthropic' | 'cloudinary' | 'algolia'
  // Email
  | 'smtp' | 'mailgun' | 'ses' | 'postmark'
  // Domain
  | 'namecheap' | 'godaddy' | 'cloudflare' | 'route53'
  // Generic
  | 'custom';
```

---

## Feature Specifications

### Phase 1: Core Foundation

#### 1.1 Authentication
- [ ] Firebase Auth setup
- [ ] Google Sign-in
- [ ] Email/Password sign-in with verification
- [ ] Sign out functionality
- [ ] Auth state persistence
- [ ] Protected routes

#### 1.2 Project Management
- [ ] Create new project (name, description, icon, color)
- [ ] Edit project details
- [ ] Delete project (with confirmation)
- [ ] Archive/unarchive projects
- [ ] Favorite projects
- [ ] Project search and filtering
- [ ] Project tags

#### 1.3 Basic Dashboard Layout
- [ ] Sidebar with project list
- [ ] Main content area
- [ ] Header with search and user menu
- [ ] Responsive design (mobile drawer)
- [ ] Dark/Light theme toggle
- [ ] Keyboard shortcuts (Cmd/Ctrl+K for search)

---

### Phase 2: Credentials Management

#### 2.1 Credential CRUD
- [ ] Add credential with category and type selection
- [ ] Pre-built templates for common services (GitHub, Vercel, Firebase, etc.)
- [ ] Custom credential type with flexible fields
- [ ] Edit credential
- [ ] Delete credential (with confirmation)
- [ ] Duplicate credential

#### 2.2 Credential Display
- [ ] List view with grouping by category
- [ ] Grid view for visual overview
- [ ] Credential cards with service icons/logos
- [ ] Quick copy buttons (username, password, API key)
- [ ] Masked/revealed password toggle
- [ ] Last accessed indicator

#### 2.3 Credential Templates
Create pre-configured field templates for each credential type:

```typescript
const CREDENTIAL_TEMPLATES: Record<CredentialType, FieldTemplate[]> = {
  github: [
    { key: 'username', label: 'Username', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'pat', label: 'Personal Access Token', type: 'password' },
    { key: 'ssh_key', label: 'SSH Private Key', type: 'textarea' },
    { key: 'repo_url', label: 'Repository URL', type: 'url' },
  ],
  vercel: [
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'team_id', label: 'Team ID', type: 'text' },
    { key: 'api_token', label: 'API Token', type: 'password' },
    { key: 'project_url', label: 'Project URL', type: 'url' },
  ],
  firebase: [
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'project_id', label: 'Project ID', type: 'text' },
    { key: 'web_api_key', label: 'Web API Key', type: 'password' },
    { key: 'admin_sdk_json', label: 'Admin SDK JSON', type: 'file' },
  ],
  supabase: [
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'project_url', label: 'Project URL', type: 'url' },
    { key: 'anon_key', label: 'Anon/Public Key', type: 'password' },
    { key: 'service_key', label: 'Service Role Key', type: 'password' },
    { key: 'db_password', label: 'Database Password', type: 'password' },
    { key: 'connection_string', label: 'Connection String', type: 'textarea' },
  ],
  stripe: [
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'password', label: 'Dashboard Password', type: 'password' },
    { key: 'publishable_key', label: 'Publishable Key', type: 'text' },
    { key: 'secret_key', label: 'Secret Key', type: 'password' },
    { key: 'webhook_secret', label: 'Webhook Secret', type: 'password' },
  ],
  // ... add more templates for other types
  custom: [
    { key: 'field1', label: 'Field 1', type: 'text', editable: true },
  ],
};
```

---

### Phase 3: Config File Management

#### 3.1 File Upload & Storage
- [ ] Upload config files (.env, .json, .xml, .yaml, .pem)
- [ ] Encrypt files before uploading to Firebase Storage
- [ ] File size limits (e.g., max 5MB)
- [ ] File type validation
- [ ] Drag and drop upload

#### 3.2 File Viewer
- [ ] Parse and display .env files with key-value highlighting
- [ ] JSON viewer with syntax highlighting and collapsible nodes
- [ ] XML viewer with syntax highlighting
- [ ] YAML viewer with syntax highlighting
- [ ] Download decrypted file
- [ ] Copy entire file content

#### 3.3 .env File Features
- [ ] Parse .env into editable key-value pairs
- [ ] Add/edit/delete individual variables
- [ ] Export modified .env file
- [ ] Compare .env files across environments
- [ ] Mask sensitive values by default

---

### Phase 4: Search & Organization

#### 4.1 Global Search (Cmd/Ctrl+K)
- [ ] Search across all projects and credentials
- [ ] Fuzzy search with highlighting
- [ ] Filter by category, type, tags
- [ ] Recent items
- [ ] Keyboard navigation (↑↓ to navigate, Enter to select)

#### 4.2 Quick Actions
- [ ] Quick copy credential (Cmd/Ctrl+C on selection)
- [ ] Quick open URL (Cmd/Ctrl+O)
- [ ] Pin frequently used credentials
- [ ] Recent activity feed

#### 4.3 Tags & Categories
- [ ] Custom tags for credentials
- [ ] Filter by tags
- [ ] Bulk tag management
- [ ] Tag suggestions based on content

---

### Phase 5: Security Features

#### 5.1 Encryption
- [ ] Client-side encryption using AES-256-GCM
- [ ] Derive encryption key from user's master password (optional)
- [ ] Or use Firebase Auth UID for key derivation (simpler, less secure)
- [ ] Encrypt all sensitive fields before storing

#### 5.2 Security Features
- [ ] Auto-lock after inactivity timeout
- [ ] Clipboard auto-clear after X seconds
- [ ] Password strength indicator
- [ ] Breach detection (haveibeenpwned API)
- [ ] Audit log (when was credential accessed)

#### 5.3 Export & Backup
- [ ] Export all credentials as encrypted JSON
- [ ] Export specific project as encrypted JSON
- [ ] Import from backup
- [ ] Export as plain-text (with security warning)

---

### Phase 6: Advanced Features (Optional)

#### 6.1 Team Sharing
- [ ] Share projects with team members
- [ ] Role-based access (viewer, editor, admin)
- [ ] Invite via email
- [ ] Revoke access

#### 6.2 Browser Extension
- [ ] Chrome/Firefox extension
- [ ] Auto-fill credentials
- [ ] Quick access popup

#### 6.3 CLI Tool
- [ ] `devvault get project/credential/field`
- [ ] `devvault list projects`
- [ ] Integration with dotenv tools

---

## UI/UX Specifications

### Design Tokens

```css
:root {
  /* Colors - Dark Theme (Primary) */
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #12121a;
  --color-bg-tertiary: #1a1a24;
  --color-bg-elevated: #22222e;
  --color-bg-hover: #2a2a38;
  
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.15);
  
  --color-text-primary: #ffffff;
  --color-text-secondary: #a0a0b0;
  --color-text-muted: #606070;
  
  --color-accent: #6366f1; /* Indigo */
  --color-accent-hover: #818cf8;
  --color-accent-subtle: rgba(99, 102, 241, 0.15);
  
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Category Colors */
  --color-codebase: #8b5cf6;     /* Purple */
  --color-deployment: #06b6d4;   /* Cyan */
  --color-backend: #f97316;      /* Orange */
  --color-api-keys: #ec4899;     /* Pink */
  --color-database: #14b8a6;     /* Teal */
  --color-email: #eab308;        /* Yellow */
  --color-domain: #84cc16;       /* Lime */
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  
  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}

/* Light Theme */
[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f7;
  --color-bg-tertiary: #ebebf0;
  --color-bg-elevated: #ffffff;
  --color-bg-hover: #e5e5ea;
  
  --color-border: rgba(0, 0, 0, 0.08);
  --color-border-strong: rgba(0, 0, 0, 0.15);
  
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-text-muted: #999999;
}
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Header                                                [User] ▼ │
│  [🔍 Search...]  [+ New Credential]  [☀️/🌙]                    │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Sidebar     │  Main Content Area                               │
│              │                                                  │
│  [All Items] │  ┌─────────────────────────────────────────────┐ │
│              │  │  Project: E-commerce App        [⭐] [⋯]   │ │
│  PROJECTS    │  │  5 credentials • 3 files                    │ │
│  ─────────   │  └─────────────────────────────────────────────┘ │
│  📁 E-comm   │                                                  │
│  📁 Mobile   │  ┌─ Codebase ─────────────────────────────────┐ │
│  📁 Backend  │  │  ┌──────────────────────────────────────┐  │ │
│              │  │  │ 🐙 GitHub Main                       │  │ │
│  [+ Project] │  │  │ user@email.com          [📋] [👁️]  │  │ │
│              │  │  └──────────────────────────────────────┘  │ │
│  CATEGORIES  │  └─────────────────────────────────────────────┘ │
│  ─────────   │                                                  │
│  🔗 Codebase │  ┌─ Deployment ───────────────────────────────┐ │
│  🚀 Deploy   │  │  ┌──────────────────────────────────────┐  │ │
│  🔥 Backend  │  │  │ ▲ Vercel Production                  │  │ │
│  🔑 API Keys │  │  │ team@company.com        [📋] [🔗]   │  │ │
│              │  │  └──────────────────────────────────────┘  │ │
│              │  └─────────────────────────────────────────────┘ │
│              │                                                  │
│              │  ┌─ Config Files ─────────────────────────────┐ │
│              │  │  📄 .env.local  📄 .env.prod  📄 fb.json   │ │
│              │  └─────────────────────────────────────────────┘ │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/
├── layout.tsx
├── page.tsx (landing/login)
├── globals.css
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthProvider.tsx
│   │
│   ├── dashboard/
│   │   ├── Dashboard.tsx (main layout)
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── ProjectList.tsx
│   │   ├── ProjectCard.tsx
│   │   └── CategoryFilter.tsx
│   │
│   ├── credentials/
│   │   ├── CredentialList.tsx
│   │   ├── CredentialCard.tsx
│   │   ├── CredentialForm.tsx
│   │   ├── CredentialModal.tsx
│   │   ├── FieldRow.tsx
│   │   └── CopyButton.tsx
│   │
│   ├── files/
│   │   ├── FileList.tsx
│   │   ├── FileUpload.tsx
│   │   ├── FileViewer.tsx
│   │   ├── EnvViewer.tsx
│   │   ├── JsonViewer.tsx
│   │   └── XmlViewer.tsx
│   │
│   ├── projects/
│   │   ├── ProjectModal.tsx
│   │   ├── ProjectForm.tsx
│   │   └── ProjectSettings.tsx
│   │
│   ├── search/
│   │   ├── GlobalSearch.tsx
│   │   └── SearchResults.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── Dropdown.tsx
│       ├── Toast.tsx
│       ├── Skeleton.tsx
│       └── Icons.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useProjects.ts
│   ├── useCredentials.ts
│   ├── useFiles.ts
│   ├── useEncryption.ts
│   ├── useClipboard.ts
│   ├── useKeyboardShortcuts.ts
│   └── useTheme.ts
│
├── lib/
│   ├── firebase.ts
│   ├── encryption.ts
│   ├── templates.ts (credential templates)
│   ├── parsers/
│   │   ├── envParser.ts
│   │   ├── jsonParser.ts
│   │   └── xmlParser.ts
│   └── utils.ts
│
├── services/
│   ├── AuthService.ts
│   ├── ProjectService.ts
│   ├── CredentialService.ts
│   └── FileService.ts
│
└── types/
    └── index.ts
```

---

## Implementation Order

### Sprint 1: Foundation (Week 1)
1. Initialize Next.js project with TypeScript
2. Set up Firebase (Auth, Firestore, Storage)
3. Create design system (`globals.css` with all tokens)
4. Implement authentication flow
5. Create basic dashboard layout (Sidebar + Header)

### Sprint 2: Projects (Week 2)
1. Project CRUD operations
2. Project list in sidebar
3. Project detail view
4. Project favorites and search

### Sprint 3: Credentials (Week 3)
1. Credential CRUD with templates
2. Credential list by category
3. Credential form with dynamic fields
4. Copy functionality
5. Password visibility toggle

### Sprint 4: Files (Week 4)
1. File upload to Firebase Storage
2. .env file parser and viewer
3. JSON viewer
4. File download

### Sprint 5: Polish (Week 5)
1. Global search (Cmd/Ctrl+K)
2. Keyboard shortcuts
3. Clipboard auto-clear
4. Export/Import
5. Mobile responsive design
6. Loading states and animations

---

## Service Logos/Icons

Use these for credential type icons:

| Service | Icon Source |
|---------|-------------|
| GitHub | `https://github.githubassets.com/favicons/favicon.svg` |
| GitLab | `https://gitlab.com/favicon.ico` |
| Vercel | `https://vercel.com/favicon.ico` |
| Netlify | `https://www.netlify.com/favicon.ico` |
| Firebase | `https://www.gstatic.com/devrel-devsite/prod/v0.../firebase/images/touchicon-180.png` |
| Supabase | `https://supabase.com/favicon/favicon-32x32.png` |
| AWS | `https://a0.awsstatic.com/libra-css/images/site/fav/favicon.ico` |
| Stripe | `https://stripe.com/favicon.ico` |
| MongoDB | `https://www.mongodb.com/assets/images/global/favicon.ico` |

Or use Lucide icons as fallback:
- `Github`, `GitBranch` for codebase
- `Rocket`, `Cloud` for deployment
- `Database`, `Server` for backend
- `Key`, `Lock` for API keys

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open global search |
| `Cmd/Ctrl + N` | New credential |
| `Cmd/Ctrl + Shift + N` | New project |
| `Cmd/Ctrl + C` | Copy selected credential's password |
| `Cmd/Ctrl + O` | Open URL of selected credential |
| `Escape` | Close modal/search |
| `↑` / `↓` | Navigate lists |
| `Enter` | Select/open item |

---

## Security Considerations

1. **Never log sensitive data** - No console.log of passwords/keys
2. **Encrypt before storing** - All sensitive fields encrypted client-side
3. **Use Firestore Security Rules** - Users can only access their own data
4. **HTTPS only** - Enforce in production
5. **Rate limiting** - Use Firebase AppCheck
6. **Clipboard cleanup** - Clear after configurable timeout

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /projects/{projectId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /credentials/{credentialId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        
        match /files/{fileId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

---

## Environment Variables

Create `.env.local`:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Optional: HaveIBeenPwned API for breach detection
HIBP_API_KEY=

# Optional: Encryption
ENCRYPTION_SALT=your-random-salt-here
```

---

## Getting Started Commands

```bash
# Create project
npx create-next-app@latest devvault --typescript --app --eslint

# Install dependencies
npm install firebase lucide-react

# Development
npm run dev

# Build
npm run build
```

---

## Success Criteria

The project is complete when:

1. ✅ User can sign up/login with Google or email
2. ✅ User can create, edit, delete projects
3. ✅ User can add credentials using pre-built templates
4. ✅ User can copy credentials with one click
5. ✅ User can upload and view config files (.env, .json)
6. ✅ Global search works across all data
7. ✅ App is fully responsive (mobile + desktop)
8. ✅ Dark/Light theme works
9. ✅ All sensitive data is encrypted
10. ✅ App looks modern, premium, and polished

---

## Reference Designs

Draw inspiration from:
- **1Password** - Clean credential organization
- **Bitwarden** - Open-source vault UI
- **Linear** - Modern SaaS dashboard aesthetics
- **Vercel Dashboard** - Project organization
- **Raycast** - Command palette (for global search)

---

*This document serves as the complete specification for the DevVault project. Follow the phases in order and refer to this document for all implementation details.*
