# ZAP App — Manufacturing Operations Dashboard

A Next.js application for manufacturing operations management, featuring real-time line speed monitoring, work request tracking, improvement concepts, and recognition wins.

## 🏗️ Information Architecture

```
/ (Home)
  └─ Executive overview with AI insights and scope display

/operations
  ├─ /line-speed      — Real-time line speed chart with 700 ft/min goal
  ├─ /downtime        — Downtime tracking and analysis (placeholder)
  ├─ /quality         — Quality metrics and reporting (placeholder)
  └─ /greasy-twin     — Bearing grease monitoring (Greasy Twin demo)

/requests
  └─ Work request management with status tracking and insights

/improvement
  └─ /concepts        — Improvement concepts with Impact × Effort matrix

/recognition
  └─ /wins            — Plant wins and achievement recognition

/admin
  └─ /users           — User management and invitations

/settings             — User preferences (placeholder)

/login, /join, /invite, /me — Authentication and user profile pages
```

## 🚦 Route Redirects (Old → New)

For backward compatibility, the following redirects are in place:

- `/factory-performance` → `/operations/line-speed`
- `/work-requests` → `/requests`
- `/greasy-twin` → `/operations/greasy-twin`
- `/inventory` → `/operations/line-speed` (temporary)

These redirects are configured in `middleware.ts`.

## 🎨 Design Patterns

### No Direct Database Access in Components

**Rule:** Components must never directly call Supabase. All data access goes through the service layer.

**✅ Good:**
```tsx
import { listIdeas } from '@/src/lib/services/ideasService';

const ideas = await listIdeas();
```

**❌ Bad:**
```tsx
import { supabase } from '@/lib/supabaseClient';

const { data } = await supabase.from('ideas').select('*');
```

**Why?** This pattern:
- Enables graceful fallbacks when DB is unavailable
- Makes testing easier (mock services, not Supabase)
- Centralizes business logic
- Provides consistent error handling

### Service Layer Structure

Services live in `src/lib/services/` and follow this pattern:

```typescript
// src/lib/services/exampleService.ts
import { supabase } from '@/lib/supabaseClient';

export interface DataType {
  id: string;
  name: string;
  // ... other fields
}

// In-memory fallback store
let inMemoryData: DataType[] = [];
let useInMemory = false;

export async function listData(): Promise<DataType[]> {
  if (useInMemory) {
    return [...inMemoryData];
  }

  try {
    const { data, error } = await supabase
      .from('table_name')
      .select('*');
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Failed to fetch data, using fallback:', err);
    useInMemory = true;
    return [...inMemoryData];
  }
}

export async function createData(input: CreateInput): Promise<DataType> {
  // Similar pattern with fallback
}
```

### Global State Management

Use Zustand for global filters (factory, line, time range):

```typescript
import { useGlobalFilters } from '@/src/lib/state/globalFilters';

const { factoryId, lineId, timeRange, setFactoryId } = useGlobalFilters();
```

## 🎯 How to Add a New Drawer Entry

1. **Define the route** in `src/lib/routes.ts`:

```typescript
export const routes: RouteItem[] = [
  // ... existing routes
  {
    label: 'My New Section',
    section: true,
  },
  {
    label: 'My New Page',
    href: '/my-section/my-page',
  },
];
```

2. **Create the page** at `src/app/my-section/my-page/page.tsx`:

```tsx
'use client';

import { Stack, Typography, Card, CardContent } from '@mui/material';

export default function MyPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">My New Page</Typography>
      <Card>
        <CardContent>
          <Typography>Page content here</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
```

3. The drawer navigation will automatically:
   - Display the new entry
   - Highlight it when active
   - Handle responsive mobile/desktop views

## 🔧 How to Add a New Service

1. **Create service file** at `src/lib/services/myDataService.ts`
2. **Define TypeScript interfaces** for your data types
3. **Implement CRUD functions** with Supabase + in-memory fallback
4. **Export functions** for use in components

Example service template:

```typescript
import { supabase } from '@/lib/supabaseClient';

export interface MyData {
  id: string;
  title: string;
  created_at: string;
}

let inMemoryStore: MyData[] = [];
let useInMemory = false;

export async function listMyData(): Promise<MyData[]> {
  if (useInMemory) return [...inMemoryStore];

  try {
    const { data, error } = await supabase
      .from('my_table')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Using fallback:', err);
    useInMemory = true;
    return [...inMemoryStore];
  }
}

export async function createMyData(input: Partial<MyData>): Promise<MyData> {
  const newItem = {
    id: generateId(),
    ...input,
    created_at: new Date().toISOString(),
  } as MyData;

  if (useInMemory) {
    inMemoryStore.push(newItem);
    return newItem;
  }

  try {
    const { data, error } = await supabase
      .from('my_table')
      .insert([newItem])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Using fallback:', err);
    useInMemory = true;
    inMemoryStore.push(newItem);
    return newItem;
  }
}

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

## 📦 Technology Stack

- **Next.js 14.2.5** — React framework with App Router
- **TypeScript** — Type-safe development
- **Material-UI (MUI)** — Component library with custom theme
- **Recharts** — Data visualization (charts)
- **Supabase** — Backend and authentication
- **Zustand** — Global state management

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000 (or :3001 if 3000 is busy)
```

## 🛠️ Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run typecheck  # Run TypeScript type checking
npm run lint       # Run ESLint (may have config issues, use typecheck)
```

## 📁 Project Structure

```
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── operations/           # Operations section pages
│   │   ├── improvement/          # Improvement section pages
│   │   ├── recognition/          # Recognition section pages
│   │   ├── requests/             # Work requests page
│   │   ├── admin/                # Admin pages
│   │   ├── login/                # Auth pages
│   │   ├── layout.js             # Root layout
│   │   └── page.tsx              # Home page
│   ├── components/
│   │   ├── common/               # Reusable components (AiInsightCard, etc.)
│   │   ├── nav/                  # Navigation (DrawerNav)
│   │   └── shell/                # App shell (AppShell)
│   └── lib/
│       ├── services/             # Data access layer (NO direct Supabase in components)
│       ├── state/                # Global state (Zustand)
│       └── routes.ts             # Drawer navigation configuration
├── lib/                          # Legacy location (being migrated to src/lib)
│   ├── supabaseClient.js
│   ├── theme.js
│   └── scope.js
├── middleware.ts                 # Route redirects
└── public/                       # Static assets
```

## 🎨 Visual Style Guide

- **Primary Color:** `#b51e27` (ZAP App red)
- **Secondary Color:** `#E51837` (Zekelman brand red)
- **Cards:** Rounded corners (12px), subtle border
- **Charts:** Red goal lines at 700 ft/min for line speed
- **Typography:** Inter font family

## 🔐 Authentication

The app uses Supabase Auth with:
- Email/password authentication
- Google OAuth (configured in Supabase dashboard)
- Row Level Security (RLS) for data access

Login page has full-bleed layout; all other pages use the AppShell (drawer + AppBar).

## 📊 Key Features

### Line Speed Chart
- Multi-series line chart with Recharts
- Red goal line at 700 ft/min
- Synthetic data fallback if DB unavailable
- Responsive to global filters (factory, line, time range)

### Work Requests
- Create/track maintenance requests
- Status-based area chart visualization
- AI-driven insights and recommendations
- Aging alerts for requests >45 days old

### Improvement Concepts
- Impact × Effort scatter plot
- Quick wins identification
- Status workflow (Draft → Proposed → Approved → In-Progress → Done)

### Recognition Wins
- Celebrate team achievements
- KPI delta tracking
- Evidence links for documentation

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, commit conventions, and code style.

## 📄 License

Private/proprietary for internal use.

