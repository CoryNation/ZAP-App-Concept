# Contributing to ZAP App

Thank you for contributing to the ZAP App! This guide outlines our patterns, conventions, and best practices.

## 🎯 Core Principles

1. **No DB access in components** — All data access must go through the service layer
2. **TypeScript first** — Use TypeScript for new files (`.tsx`, `.ts`)
3. **Graceful degradation** — Services must have in-memory fallbacks
4. **Mobile responsive** — All UI must work on mobile and desktop
5. **Consistent styling** — Follow Material-UI patterns and the existing theme

## 🏗️ Architecture Patterns

### Service Layer (Required)

**Never** call Supabase directly from components. Always use or create a service:

```typescript
// ✅ Good: Using a service
import { listIdeas } from '@/src/lib/services/ideasService';
const ideas = await listIdeas();

// ❌ Bad: Direct Supabase call
import { supabase } from '@/lib/supabaseClient';
const { data } = await supabase.from('ideas').select('*');
```

### Service Template

All services in `src/lib/services/` should follow this pattern:

```typescript
import { supabase } from '@/lib/supabaseClient';

export interface DataType {
  id: string;
  // ... fields
}

let inMemoryStore: DataType[] = [];
let useInMemory = false;

export async function listData(): Promise<DataType[]> {
  if (useInMemory) return [...inMemoryStore];

  try {
    const { data, error } = await supabase.from('table').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Using fallback:', err);
    useInMemory = true;
    return [...inMemoryStore];
  }
}
```

### Page Component Template

Pages should be client components with this structure:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Stack, Typography, Card, CardContent } from '@mui/material';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';

export default function MyPage() {
  const { factoryId, lineId, timeRange } = useGlobalFilters();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data
  }, [factoryId, lineId, timeRange]);

  if (loading) return <div>Loading...</div>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Page Title</Typography>
      <Card>
        <CardContent>
          {/* Content */}
        </CardContent>
      </Card>
    </Stack>
  );
}
```

## 📝 Commit Message Convention

We use **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

### Types

- `feat`: New feature (e.g., `feat(ops/line-speed): add 700 goal line`)
- `fix`: Bug fix (e.g., `fix(requests): correct date filtering`)
- `refactor`: Code refactoring (e.g., `refactor(routes): migrate to IA`)
- `docs`: Documentation (e.g., `docs: add service layer guide`)
- `style`: Formatting, missing semicolons (e.g., `style: fix indentation`)
- `test`: Adding tests
- `chore`: Maintenance tasks (e.g., `chore: update dependencies`)
- `perf`: Performance improvement

### Scope Examples

- `ops/line-speed`, `ops/downtime`, `ops/quality`
- `improvement`, `recognition`
- `requests`, `home`, `admin`
- `services`, `components`, `routes`

### Examples

```bash
feat(home): add AiInsightCard and scope panel
fix(services/ideas): handle null description field
refactor(routes): migrate to IA with redirects
docs: add contribution guidelines
```

## 🎨 Code Style

### TypeScript

- Use interfaces over types for object shapes
- Export interfaces for public APIs
- Use `async/await` instead of `.then()`
- Handle errors gracefully with try/catch

### React

- Use functional components (no class components)
- Prefer named exports for components
- Use hooks for state and effects
- Clean up effects (return cleanup functions)

### Material-UI

- Import components from `@mui/material`
- Use the theme's spacing system (`sx={{ mb: 2 }}`)
- Prefer `Stack` for layout over custom flexbox
- Use `Card` + `CardContent` for content blocks

### File Naming

- Pages: `page.tsx` (Next.js convention)
- Components: `ComponentName.tsx` (PascalCase)
- Services: `dataTypeService.ts` (camelCase + Service suffix)
- Use `.tsx` for React components, `.ts` for utilities

## 🧪 Testing Your Changes

Before committing:

```bash
# Ensure TypeScript compiles
npm run typecheck

# Ensure the app builds
npm run build

# Test in dev mode
npm run dev
```

## 🚀 Adding a New Feature

1. **Plan the feature**
   - Which section does it belong to? (operations, improvement, recognition, etc.)
   - What data does it need? Create or extend a service.
   - What UI components are needed?

2. **Create the service** (if needed)
   - Add to `src/lib/services/`
   - Include TypeScript interfaces
   - Implement Supabase queries + in-memory fallback
   - Add demo data for fallback mode

3. **Create the page**
   - Add to `src/app/[section]/[feature]/page.tsx`
   - Use global filters from Zustand
   - Handle loading/error states
   - Follow the page template above

4. **Update navigation** (if needed)
   - Add route to `src/lib/routes.ts`
   - Drawer will update automatically

5. **Update redirects** (if migrating from old route)
   - Add redirect in `middleware.ts`

6. **Test and document**
   - Run `npm run typecheck` and `npm run build`
   - Update README if adding major feature
   - Commit with conventional commit message

## 🐛 Reporting Issues

When reporting bugs, include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details
- Console errors (if any)

## 📖 Documentation

- Update README.md for major features or architecture changes
- Add JSDoc comments to exported functions
- Keep this CONTRIBUTING.md up to date with new patterns

## ✅ Pull Request Checklist

- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] App builds successfully (`npm run build`)
- [ ] Follows commit message convention
- [ ] No direct Supabase calls in components
- [ ] Service has in-memory fallback
- [ ] UI is responsive (mobile + desktop)
- [ ] README updated (if needed)

## 🙏 Questions?

If you're unsure about any pattern or convention, check existing code for examples:
- Services: `src/lib/services/ideasService.ts`, `src/lib/services/winsService.ts`
- Pages: `src/app/operations/line-speed/page.tsx`, `src/app/improvement/concepts/page.tsx`
- Components: `src/components/common/AiInsightCard.tsx`

Happy coding! 🚀

