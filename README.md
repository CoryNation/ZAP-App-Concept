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

# Set up environment (optional - works without!)
cp .env.local.example .env.local
# Edit .env.local and set APP_DEMO_MODE=true for synthetic data

# Run development server
npm run dev

# Open http://localhost:3000 (or :3001 if 3000 is busy)
```

### Demo Mode

The app works **completely without a database** using synthetic data! This is perfect for:
- Local development
- Demonstrations and prototypes
- Testing UI without Supabase setup

**To enable demo mode:**

1. Create `.env.local` in project root:
```env
NEXT_PUBLIC_APP_DEMO_MODE=true
```

2. Restart dev server

**What you get in demo mode:**
- 90 days of realistic manufacturing data
- 3 production lines (Line A, B, C)
- Line speeds with downtime dips to 0 and runs at 700-800 ft/min
- Downtime events with 8 common causes
- Quality metrics (FPY, defects, control charts)
- OEE calculations and trends
- Work requests, concepts, wins
- All charts and dashboards fully functional

**No database required!** All services automatically fall back to in-memory synthetic data.

## 🛠️ Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run typecheck  # Run TypeScript type checking
npm run lint       # Run ESLint
npm run seed:demo  # Seed Supabase with demo data (requires service role key)
```

### Seeding Demo Data to Supabase

If you have a Supabase instance and want to populate it with demo data:

```bash
# Add to .env.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Run seed script
npm run seed:demo
```

Note: The seed script currently requires table schemas to be created first.

## 📁 Project Structure

```
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── operations/           # Operations section pages
│   │   │   ├── plant-performance/  # Full performance dashboard (8 charts)
│   │   │   ├── line-speed/       # Line speed monitoring
│   │   │   ├── downtime/         # Downtime analysis
│   │   │   ├── quality/          # Quality metrics
│   │   │   └── greasy-twin/      # Bearing monitoring
│   │   ├── improvement/          # Improvement section pages
│   │   ├── recognition/          # Recognition section pages
│   │   ├── inspiration/          # HMW inspiration gallery
│   │   ├── requests/             # Work requests page
│   │   ├── admin/                # Admin pages
│   │   ├── login/                # Auth pages
│   │   ├── layout.js             # Root layout
│   │   └── page.tsx              # Home page with KPIs
│   ├── components/
│   │   ├── common/               # Reusable components (AiInsightCard, KpiTile)
│   │   ├── charts/               # Chart wrappers (LineCard, BarCard, ScatterCard)
│   │   ├── nav/                  # Navigation (DrawerNav)
│   │   └── shell/                # App shell (AppShell)
│   └── lib/
│       ├── services/             # Data access layer (NO direct Supabase in components)
│       │   ├── metricsService.ts    # KPIs, OEE, speed
│       │   ├── downtimeService.ts   # Downtime analytics
│       │   ├── qualityService.ts    # FPY, defects, control charts
│       │   ├── maintenanceService.ts # MTTR/MTBF
│       │   ├── insightsService.ts   # AI insights
│       │   └── [others].ts          # Work requests, ideas, wins
│       ├── demo/                 # Synthetic data generators
│       ├── hmw/                  # How Might We prompts
│       ├── state/                # Global state (Zustand)
│       ├── types.ts              # TypeScript interfaces
│       └── routes.ts             # Drawer navigation configuration
├── lib/                          # Legacy location (being migrated to src/lib)
├── scripts/
│   └── seed-demo-data.ts         # Supabase seeding script
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

### Plant Performance Dashboard
- **8 interactive charts** showing comprehensive manufacturing metrics
- Multi-series line speed with **red 700 ft/min goal line**
- Downtime Pareto analysis (80/20 rule)
- OEE (Overall Equipment Effectiveness) with A×P×Q breakdown
- Speed vs Downtime correlation scatter plot
- First Pass Yield trends
- MTTR/MTBF maintenance metrics
- AI-driven performance insights

### Line Speed Chart
- Multi-series line chart with Recharts
- Red goal line at 700 ft/min
- Synthetic data fallback if DB unavailable
- Responsive to global filters (factory, line, time range)
- AI insights with goal attainment calculations

### Work Requests
- Create/track maintenance requests
- Status-based area chart visualization
- AI-driven insights and recommendations
- Aging alerts for requests >45 days old

### Improvement Concepts
- Impact × Effort scatter plot
- Quick wins identification
- Status workflow (Draft → Proposed → Approved → In-Progress → Done)

### Downtime Analysis
- KPI tiles (total hours, events, top cause, mean duration)
- Pareto chart of downtime causes
- Timeline view of recent events with severity indicators
- Quick action buttons to create work requests or improvement concepts

### Quality Metrics
- First Pass Yield (FPY) trends with 98% goal band
- Defects by cause analysis
- Statistical process control charts (p-chart) with UCL/LCL
- Violation detection and alerts

### Recognition Wins
- Celebrate team achievements
- KPI delta tracking
- Evidence links for documentation

### HMW Inspiration Gallery
- 30+ "How Might We..." prompts across 5 categories
- Searchable and filterable by category and tags
- Mini visualizations on select cards
- One-click "Create Concept" with pre-filled forms
- Contextual HMW suggestions on operational pages

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, commit conventions, and code style.

## 📄 License

Private/proprietary for internal use.

