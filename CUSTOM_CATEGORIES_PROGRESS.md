# Custom Categories & Goal Linking - Implementation Progress

## ✅ Completed (Phases 1-2)

### Phase 1: Database Schema ✓
- **Created `revenue_categories` table**
  - Fields: id, company_id, name, color, is_default, created_at, updated_at
  - RLS policies for view/insert/update/delete
  - Unique constraint on (company_id, name)
  
- **Updated `revenue_entries` table**
  - Added `goal_id` column (UUID, references sales_goals)
  - Created indexes for performance
  
- **Seeded Default Categories**
  - Calls (#22c55e)
  - Consulting (#3b82f6)
  - Investment (#22c55e)
  - Stan Store (#a855f7)
  - Subscription (#ec4899)
  - Invoice Payment (#a855f7)
  - Whop (#f97316)
  - Freelance (#06b6d4)
  - Other (#6b7280)
  - Booking Conversions (#6366f1)

### Phase 2: Edge Functions ✓
- **Created `manage-categories` Edge Function**
  - `list` - Get all categories for a company
  - `create` - Add new custom category
  - `update` - Edit custom category (name/color only)
  - `delete` - Remove custom category (cannot delete defaults)
  - Deployed successfully to Supabase

## ✅ Completed (Phases 1-3)

### Phase 3: DataContext Updates ✓
Added to `/src/contexts/DataContext.tsx`:

1. **Add Category Type**
```typescript
export interface Category {
  id: string;
  company_id: string;
  name: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

2. **Update DataContextType Interface**
```typescript
interface DataContextType {
  // ... existing fields
  categories: Category[];
  fetchCategories: () => Promise<void>;
  addCategory: (name: string, color: string) => Promise<void>;
  updateCategory: (id: string, name: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}
```

3. **Add State Management**
```typescript
const [categories, setCategories] = useState<Category[]>([]);
```

4. **Add Category Functions**
- fetchCategories() - Call manage-categories with action: 'list'
- addCategory() - Call manage-categories with action: 'create'
- updateCategory() - Call manage-categories with action: 'update'
- deleteCategory() - Call manage-categories with action: 'delete'

5. **Update addRevenueEntry**
- Add support for goal_id parameter
- Pass goal_id when creating revenue entry

## 📋 Remaining Phases

### Phase 4: Update UI Components

**FilterPanel** (`/src/components/FilterPanel.tsx`)
- Replace `DEFAULT_REVENUE_CATEGORIES` with `categories` from context
- Fetch categories on mount
- Add "Manage Categories" link to settings

**RevenueEntryForm** (`/src/components/RevenueEntryForm.tsx`)
- Replace hardcoded categories with context categories
- Add "Link to Goal" dropdown (optional)
- Filter goals by type (revenue goals only)
- Pass goal_id to addRevenueEntry

**RevenueHistory** (`/src/components/RevenueHistory.tsx`)
- Show goal badge on entries with goal_id
- Add ability to edit/remove goal link
- Filter by linked goal

### Phase 5: Category Management UI

Create `/src/app/(protected)/settings/categories/page.tsx`:
- List all categories (default + custom)
- Add new category button with dialog
  - Name input
  - Color picker
- Edit custom categories
- Delete custom categories (with confirmation)
- Cannot edit/delete default categories
- Show category usage count

### Phase 6: Goal Integration

**GoalsManager** (`/src/components/GoalsManager.tsx`)
- Show linked revenue entries in goal details
- Display "auto-tracked" vs "manual" progress
- Option to unlink revenue entries
- Visual indicator for goal-linked revenue

**Update Goal Progress Calculation**
- Include revenue entries where goal_id matches
- Show breakdown of manual vs linked revenue
- Update progress bars to reflect linked entries

## 🎯 Key Features

### Custom Categories
- ✅ Database schema created
- ✅ Edge Functions deployed
- ⏳ UI for managing categories
- ⏳ Sync across all components

### Goal Linking
- ✅ Database column added
- ⏳ UI for linking revenue to goals
- ⏳ Automatic goal progress updates
- ⏳ Show linked entries in goal details

## 📝 Next Steps

1. Complete Phase 3 (DataContext updates)
2. Update FilterPanel and RevenueEntryForm
3. Create category management page
4. Add goal linking to revenue entry form
5. Update goal progress calculations
6. Test end-to-end functionality

## 🔧 Technical Notes

- Categories are company-scoped
- Default categories cannot be edited/deleted
- Goal linking is optional
- Revenue entries can be linked to revenue-type goals only
- Deleting a goal sets goal_id to NULL (ON DELETE SET NULL)
- All Edge Function calls should use `/api/edge-proxy`

## 📊 Database Schema

```sql
-- revenue_categories table
CREATE TABLE revenue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- revenue_entries update
ALTER TABLE revenue_entries 
ADD COLUMN goal_id UUID REFERENCES sales_goals(id) ON DELETE SET NULL;
```

## 🚀 Deployment Status

- ✅ Database migration applied
- ✅ manage-categories Edge Function deployed
- ⏳ Frontend components pending
- ⏳ Testing pending

---

**Last Updated:** January 6, 2026
**Status:** Phase 2 Complete, Phase 3 In Progress
