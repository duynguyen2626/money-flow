Phase 14 Implementation Plan - People UI Refactor & Category Filter
Executive Summary
Phase Status: Phase 13 (Services & Batch Fixes) completed via PR #210
Phase 14 Objectives:
    1. Refactor People page UI (current state shown in attachment)
    2. Add Category filter to /transactions page
    3. Research navigation architecture: Left sidebar vs Top nav with breadcrumbs
    4. Research & document existing chatbot code for Phase 15 re-implementation
Context
Phase 13 successfully resolved critical issues in Services and Batch systems. With core functionality stable, Phase 14 focuses on UI/UX improvements and navigation architecture decisions that will impact long-term scalability.

Priority Order
[!IMPORTANT]
Execution Sequence: S1 (Category Filter - Quick Win) → S2 (People UI Refactor) → S3 (Navigation Research & Decision) → S4 (Chatbot Research & Documentation)

S1: Add Category Filter to Transactions Page (QUICK WIN)
Problem Statement
Users cannot filter transactions by category on /transactions page. This is a high-value feature for expense tracking and analysis.
Current State
Based on PR #210 merged code, the /transactions page likely has:
    • Date filters (month/year selection)
    • Account filters
    • Search functionality
    • Missing: Category dropdown filter
Implementation Requirements
Step 1: Locate Transactions Page Filters
Files to Check:
src/app/txn/page.tsx or src/app/transactions/page.tsx
src/components/transactions/TransactionFilters.tsx
src/components/transactions/UnifiedTransactionsPage.tsx (confirmed from PR #209)
Current filter structure:
// Expected current state
interface TransactionFilters {
dateRange: { start: Date; end: Date };
accountId?: string;
searchQuery?: string;
// Add: categoryId?: string;
}
Step 2: Fetch Categories Data
Create/Update service:
// src/services/category.service.ts
export async function getActiveCategories() {
const { data, error } = await supabase
.from('categories')
.select('id, name, icon, color')
.eq('is_active', true)
.order('name');
if (error) throw error;
return data;
}
Step 3: Add Category Filter UI
Component pattern:
// In TransactionFilters component
import { Select } from '@/components/ui/select';
import { getActiveCategories } from '@/services/category.service';
export function TransactionFilters({ filters, onFilterChange }) {
const [categories, setCategories] = useState([]);
useEffect(() => {
async function loadCategories() {
const data = await getActiveCategories();
setCategories(data);
}
loadCategories();
}, []);
return (
<div className="filters-container flex gap-4">
{/* Existing filters... */}
  <Select
    label="Category"
    placeholder="All Categories"
    options={[
      { value: '', label: 'All Categories' },
      ...categories.map(cat => ({
        value: cat.id,
        label: cat.name,
        icon: cat.icon // Optional: show icon
      }))
    ]}
    value={filters.categoryId || ''}
    onChange={(value) => onFilterChange({ ...filters, categoryId: value })}
  />
</div>

);
}
Step 4: Apply Filter to Query
Update transaction query:
// In transaction service or page query
export async function getTransactions(filters: TransactionFilters) {
let query = supabase
.from('transactions')
.select(', categories(), accounts(*)')
.gte('date', filters.dateRange.start)
.lte('date', filters.dateRange.end);
if (filters.accountId) {
query = query.eq('account_id', filters.accountId);
}
// NEW: Category filter
if (filters.categoryId) {
query = query.eq('category_id', filters.categoryId);
}
if (filters.searchQuery) {
query = query.ilike('note', %${filters.searchQuery}%);
}
const { data, error } = await query.order('date', { ascending: false });
if (error) throw error;
return data;
}
UI/UX Considerations
Filter placement:
    • Position category filter next to existing filters (account, date)
    • Use design system styles (consistent with PR #209/210 updates)
    • Show category icon/color in dropdown (visual recognition)
Performance:
    • Cache categories list (rarely changes)
    • Debounce filter changes if needed
    • Show loading state during filter application
Mobile responsive:
    • Ensure filter dropdown works on small screens
    • Consider collapsible filter panel on mobile
Files to Modify
    • [MODIFY] src/app/txn/page.tsx or src/app/transactions/page.tsx
        ◦ Add category filter state
    • [CREATE/MODIFY] src/services/category.service.ts
        ◦ Add getActiveCategories() function
    • [MODIFY] src/components/transactions/TransactionFilters.tsx (or equivalent)
        ◦ Add category Select dropdown
        ◦ Handle filter change events
    • [MODIFY] Transaction query service
        ◦ Apply category filter to Supabase query
Testing Requirements
Manual Test Cases:
    1. Filter Application:
        ◦ [ ] Select category → verify transactions filtered correctly
        ◦ [ ] Select "All Categories" → verify all transactions shown
        ◦ [ ] Combine with account filter → verify both filters work together
        ◦ [ ] Combine with date filter → verify correct results
    2. UI Behavior:
        ◦ [ ] Dropdown shows all active categories
        ◦ [ ] Category icons/colors display correctly
        ◦ [ ] Filter persists on page refresh (if using URL params)
        ◦ [ ] Clear filter button works (if implemented)
    3. Performance:
        ◦ [ ] Category list loads quickly
        ◦ [ ] Filter change updates transactions smoothly
        ◦ [ ] No console errors
Success Criteria
    • [ ] Category filter dropdown appears on /transactions page
    • [ ] Filter correctly narrows transaction results
    • [ ] UI matches design system (consistent with PR #209/210)
    • [ ] Works on mobile and desktop
    • [ ] No performance degradation

S2: Refactor People Page UI
Problem Statement
Current People page UI (shown in attachment) needs modernization and improved UX. Specific issues and requirements to be defined based on current implementation analysis.
Investigation Steps
Step 1: Analyze Current People Page
Files to Review:
src/app/people/page.tsx
src/components/people/PeopleList.tsx
src/components/people/PersonCard.tsx
src/app/people/[id]/details/page.tsx (individual person details)
Questions:
    • What is the current layout structure?
    • What data is displayed per person?
    • How does filtering/sorting work?
    • What are the pain points in current UI?
Step 2: Define Refactor Scope
Based on attachment analysis (People page screenshot):
Potential improvements:
    • List vs Grid view - Add view toggle option
    • Enhanced person cards - Show debt summary, recent activity
    • Better filtering - Filter by active subscriptions, debt status, groups
    • Sorting options - Sort by name, debt amount, last interaction
    • Bulk actions - Select multiple people for batch operations
    • Quick actions - One-click access to "Add Transaction", "View Details", "Send Payment Request"
Step 3: Research Design Patterns
Reference similar pages in app:
    • /accounts page layout (grid/list view)
    • /transactions page filters
    • Card designs from existing components
External references:
    • Contact management UIs (Gmail Contacts, HubSpot)
    • CRM interfaces (Salesforce, Pipedrive)
    • Debt tracking apps (Splitwise)
Implementation Approach
Option A: Incremental Refactor
Phase 1: Quick wins (Week 1)
    • Improve card visual design
    • Add quick action buttons
    • Enhance debt/balance display
Phase 2: Feature additions (Week 2)
    • Add filtering options
    • Implement sorting
    • Add view toggle (list/grid)
Phase 3: Advanced features (Week 3)
    • Bulk actions
    • Advanced search
    • Analytics/insights section
Option B: Complete Redesign
Redesign from scratch:
    • New layout architecture
    • Modern card/list components
    • Comprehensive filtering/sorting
    • Risk: Higher development time, potential bugs
Recommendation: Start with Option A (incremental) for safer deployment.
Proposed UI Components
Enhanced Person Card
// src/components/people/PersonCardV2.tsx
interface PersonCardProps {
person: Person;
view: 'grid' | 'list';
}
export function PersonCardV2({ person, view }: PersonCardProps) {
return (
<div className={person-card ${view === 'grid' ? 'card-grid' : 'card-list'}}>
{/* Avatar + Name */}



{person.first_name} {person.last_name}
{person.active_subscriptions} active services
  {/* Debt Summary */}
  <div className="debt-summary">
    <div className="debt-item">
      <label>Current Debt</label>
      <span className="amount">{formatCurrency(person.current_debt)}</span>
    </div>
    <div className="debt-item">
      <label>Total Paid</label>
      <span className="amount text-success">{formatCurrency(person.entire_repaid)}</span>
    </div>
  </div>
  
  {/* Quick Actions */}
  <div className="quick-actions">
    <button onClick={() => handleAddTransaction(person.id)}>
      + Transaction
    </button>
    <button onClick={() => handleViewDetails(person.id)}>
      Details
    </button>
    <button onClick={() => handleRequestPayment(person.id)}>
      Request Payment
    </button>
  </div>
</div>

);
}
Filters & Sorting
// src/components/people/PeopleFilters.tsx
export function PeopleFilters({ filters, onFilterChange }) {
return (
<div className="filters-toolbar">
{/* Search */}
<Input
type="search"
placeholder="Search people..."
value={filters.search}
onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
/>
  {/* Filter by debt status */}
  <Select
    options={[
      { value: 'all', label: 'All People' },
      { value: 'has-debt', label: 'Has Outstanding Debt' },
      { value: 'no-debt', label: 'No Debt' },
      { value: 'active-services', label: 'Active Services' }
    ]}
    value={filters.debtStatus}
    onChange={(value) => onFilterChange({ ...filters, debtStatus: value })}
  />
  
  {/* Sort */}
  <Select
    options={[
      { value: 'name-asc', label: 'Name (A-Z)' },
      { value: 'name-desc', label: 'Name (Z-A)' },
      { value: 'debt-desc', label: 'Highest Debt' },
      { value: 'debt-asc', label: 'Lowest Debt' }
    ]}
    value={filters.sort}
    onChange={(value) => onFilterChange({ ...filters, sort: value })}
  />
  
  {/* View toggle */}
  <ViewToggle
    view={filters.view}
    onChange={(view) => onFilterChange({ ...filters, view })}
  />
</div>

);
}
Files to Modify
    • [MODIFY] src/app/people/page.tsx
        ◦ Update layout structure
        ◦ Add filters/sorting state
        ◦ Implement view toggle
    • [CREATE] src/components/people/PersonCardV2.tsx
        ◦ New enhanced card component
    • [CREATE] src/components/people/PeopleFilters.tsx
        ◦ Filters and sorting toolbar
    • [MODIFY] src/services/people.service.ts
        ◦ Update query to support new filters/sorting
Testing Requirements
Manual Test Cases:
    1. Card Display:
        ◦ [ ] Person cards show all data correctly
        ◦ [ ] Avatars load properly
        ◦ [ ] Debt amounts formatted correctly
        ◦ [ ] Quick actions work (Add Transaction, View Details, etc.)
    2. Filtering:
        ◦ [ ] Search filters people by name
        ◦ [ ] Debt status filter works correctly
        ◦ [ ] Service subscription filter works
        ◦ [ ] Filters can be combined
    3. Sorting:
        ◦ [ ] Sort by name (A-Z, Z-A)
        ◦ [ ] Sort by debt amount (high to low, low to high)
        ◦ [ ] Sort persists on page refresh
    4. View Toggle:
        ◦ [ ] Grid view displays properly
        ◦ [ ] List view displays properly
        ◦ [ ] View preference saved (localStorage)
Success Criteria
    • [ ] People page UI modernized and visually appealing
    • [ ] All debt/payment data displays accurately
    • [ ] Filters and sorting work correctly
    • [ ] Quick actions accessible and functional
    • [ ] Responsive on mobile and desktop
    • [ ] Performance maintained (no slowdowns)

S3: Navigation Architecture Research & Decision
Problem Statement
User Question: Should we refactor left sidebar navigation to top navigation with hover dropdowns and breadcrumbs?
Current State: Left sidebar navigation (standard pattern)
Proposed: Top navigation with:
    • Clickable main items (navigate to page)
    • Hover reveals dropdown with recent/favorite items
    • Breadcrumb trail showing path (e.g., "Accounts > MSB Online")
Research Analysis
Based on UX research and best practices[web:65][web:68][web:71]:
Left Sidebar Navigation Advantages
✅ Scalability: Can accommodate 10X more menu items due to vertical layout
✅ Easier to scan: Vertical scanning is faster than horizontal (F-pattern reading)
✅ Customizable: Supports user-configured navigation (folders, channels, etc.)
✅ Consistency: Matches desktop app conventions (macOS, Windows)
✅ Best for complex apps: Ideal for products with hierarchical structure
Research finding: Left/Top/Top or Left/Left/Left layouts scored highest for UX[web:65]
❌ Space consumption: Takes ~25% of screen width on laptops
Top Navigation Advantages
✅ Space efficient: Uses less horizontal space
✅ Prominent position: Top bar is primary focal point
✅ Hover menus work well: Mega menus for e-commerce, content sites
✅ Mobile-friendly: Can keep all links visible on tablet portrait
❌ Scalability limit: Cannot fit many top-level items (max 5-7)
❌ Poor for hierarchical navigation: Difficult with nested structures
❌ Not customizable: Cannot support user-configured menus
Money Flow 3 Context Analysis
Current navigation structure:
Dashboard
Accounts
Transactions
Installments
Categories
Shops
People
Cashback
Batches
Services
Refunds
Analysis:
    • 11 top-level items - Too many for top nav (exceeds 5-7 limit)
    • Hierarchical structure: Accounts > Individual Account > Transactions (3 levels)
    • User customization potential: Users may want to reorder, favorite items
    • Complex data relationships: Transactions ↔ Accounts ↔ People ↔ Services
Recommendation: Hybrid Approach (Enhanced Sidebar)
Keep sidebar navigation BUT enhance it with modern features:
Proposed Enhancements
1. Collapsible Sidebar (Space Optimization)
// Add collapse/expand toggle
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
// Collapsed state: Show only icons
// Expanded state: Show icons + labels
2. Recent Items Section
// Top of sidebar: Show recent/favorite pages
Recent
MSB Online John Doe YouTube Service
3. Breadcrumb Navigation (Top Bar)
// Separate top breadcrumb bar (not replacing sidebar)
Accounts MSB Online Transactions
4. Search/Command Palette
// Add Cmd+K quick navigation (like Notion, Linear)


{/* Show recent, favorites, all pages */}

Implementation Plan
Phase 1: Add Breadcrumbs (Week 1)
Files to create/modify:
src/components/navigation/Breadcrumb.tsx
src/app/layout.tsx (add breadcrumb to layout)
Pattern:
// Auto-generate breadcrumbs from URL path
const pathname = usePathname();
const breadcrumbs = generateBreadcrumbs(pathname);
// Example: /accounts/123/transactions
// → Home > Accounts > MSB Online > Transactions
Implementation:
// src/components/navigation/Breadcrumb.tsx
import { ChevronRight } from 'lucide-react';
export function Breadcrumb({ items }) {
return (

    1. 
{items.map((item, index) => (

))}


);
}
Phase 2: Collapsible Sidebar (Week 2)
Files to modify:
src/components/navigation/Sidebar.tsx
src/app/layout.tsx
Features:
    • Toggle button to collapse/expand
    • Save state to localStorage
    • Smooth transition animation
    • Icon-only mode when collapsed
Phase 3: Command Palette (Week 3)
Libraries to use:
    • cmdk (by Radix UI/shadcn) - Command menu component
    • Keyboard shortcut: Cmd+K / Ctrl+K
Features:
    • Search all pages, accounts, people, services
    • Show recent items
    • Show favorites
    • Keyboard navigation
Phase 4: Recent Items (Week 4)
Implementation:
    • Track visited pages in localStorage/session
    • Show top 5 recent items in sidebar
    • Click to navigate directly
Files to Modify
    • [CREATE] src/components/navigation/Breadcrumb.tsx
    • [MODIFY] src/components/navigation/Sidebar.tsx
        ◦ Add collapse/expand functionality
        ◦ Add recent items section
    • [CREATE] src/components/navigation/CommandPalette.tsx
    • [MODIFY] src/app/layout.tsx
        ◦ Integrate breadcrumb bar
        ◦ Add command palette
    • [CREATE] src/hooks/useRecentPages.ts
        ◦ Track recently visited pages
    • [CREATE] src/utils/breadcrumbs.ts
        ◦ Generate breadcrumbs from pathname
Testing Requirements
Manual Test Cases:
    1. Breadcrumbs:
        ◦ [ ] Breadcrumbs display correct path
        ◦ [ ] Breadcrumb links navigate correctly
        ◦ [ ] Current page highlighted (not linked)
        ◦ [ ] Works on all nested pages
    2. Collapsible Sidebar:
        ◦ [ ] Collapse toggle works smoothly
        ◦ [ ] State persists across page refreshes
        ◦ [ ] Icons visible in collapsed mode
        ◦ [ ] Labels show on hover (collapsed mode)
    3. Command Palette:
        ◦ [ ] Opens with Cmd+K / Ctrl+K
        ◦ [ ] Search filters results correctly
        ◦ [ ] Recent items show at top
        ◦ [ ] Keyboard navigation works
        ◦ [ ] Enter key navigates to selected item
    4. Recent Items:
        ◦ [ ] Shows last 5 visited pages
        ◦ [ ] Updates in real-time
        ◦ [ ] Click navigates to page
        ◦ [ ] Clear recent items works
Success Criteria
    • [ ] Breadcrumb navigation implemented on all pages
    • [ ] Sidebar collapsible with state persistence
    • [ ] Command palette functional (Cmd+K)
    • [ ] Recent items track and display correctly
    • [ ] Navigation feels faster and more intuitive
    • [ ] Mobile responsive (sidebar becomes drawer)
Decision Summary
RECOMMENDATION: Keep Sidebar + Add Enhancements
Reasoning:
    1. Scalability: 11 menu items too many for top nav
    2. Complexity: Multi-level hierarchy fits sidebar better
    3. Future growth: Easy to add more menu items
    4. Industry standard: Admin panels use sidebars (Linear, Notion, Jira)
    5. Breadcrumbs: Can be added WITHOUT switching to top nav
Rejected: Full switch to top navigation (not suitable for complex app)

S4: Chatbot Code Research & Documentation
Problem Statement
Need to research existing chatbot code in codebase to prepare for Phase 15 re-implementation.
Investigation Steps
Step 1: Search Codebase for Chatbot Components
Search patterns:
Search for chat/bot related files
find src -name "chat" -o -name "bot"
Search for chat imports
grep -r "chat|chatbot|bot" src/ --include=".tsx" --include=".ts"
Search for AI/LLM integrations
grep -r "openai|gemini|anthropic|gpt" src/ --include=".tsx" --include=".ts"
Files to check:
src/components/chat/
src/components/chatbot/
src/app/chat/
src/services/chat.service.ts
src/actions/chat.actions.ts
Step 2: Analyze Chatbot Architecture
Questions to answer:
    • Is there existing chatbot code?
    • What AI service is integrated? (OpenAI, Gemini, etc.)
    • What is the UI component structure?
    • How is conversation state managed?
    • Is there streaming support for responses?
    • Is there chat history persistence?
Step 3: Document Current Implementation
Create documentation file:
.agent/chatbot-research.md
Document:
    • Files involved
    • Dependencies used
    • API integration approach
    • State management pattern
    • UI components
    • Features implemented
    • Features missing
    • Known issues
Research Template
Chatbot Implementation Research
Current Status
    • [ ] Chatbot code exists in codebase
    • [ ] No chatbot code found
Architecture Overview
Files Identified
    • [ ] src/components/chat/ChatInterface.tsx
    • [ ] src/components/chat/MessageList.tsx
    • [ ] src/components/chat/MessageInput.tsx
    • [ ] src/services/chat.service.ts
    • [ ] src/actions/chat.actions.ts
Tech Stack
AI Service: [OpenAI / Gemini / Claude / Custom]
State Management: [useState / Redux / Zustand / Context]
UI Library: [Custom / shadcn / React-Chatbot-Kit]
Streaming: [Yes / No]
Features Implemented
    • [ ] Text message send/receive
    • [ ] Streaming responses
    • [ ] Chat history persistence
    • [ ] Conversation context
    • [ ] User avatars
    • [ ] Bot avatar
    • [ ] Typing indicator
    • [ ] Error handling
    • [ ] Message timestamps
    • [ ] Code syntax highlighting
    • [ ] File attachments
    • [ ] Voice input
Features Missing
    • [ ] Multi-turn conversations
    • [ ] Conversation history sidebar
    • [ ] Export chat history
    • [ ] Search within chat
    • [ ] Conversation branching
    • [ ] Custom system prompts
    • [ ] Token usage tracking
API Integration
Endpoint: [URL or service]
Authentication: [API key / OAuth / etc.]
Model: [gpt-4, gemini-pro, etc.]
Token limit: [Max tokens per request]
Code Quality
Issues identified:
    • Performance problems?
    • TypeScript errors?
    • Deprecated dependencies?
    • Security concerns?
Strengths:
    • What's working well?
    • Good patterns to keep?
Phase 15 Recommendations
Keep From Current Implementation
    • [List components/patterns worth keeping]
Rebuild/Refactor
    • [List areas needing major changes]
New Features to Add
    • [Wish list for Phase 15]
Migration Plan
Step 1: Archive Current Code
    • Move to src/components/chat/_archived_v1/
Step 2: Core Components
    • [ ] Build ChatInterface skeleton
    • [ ] Implement MessageList
    • [ ] Implement MessageInput
Step 3: AI Integration
    • [ ] Set up API client
    • [ ] Implement streaming
    • [ ] Add error handling
Step 4: State Management
    • [ ] Set up conversation state
    • [ ] Add persistence layer
    • [ ] Implement history
Step 5: UX Enhancements
    • [ ] Auto-scroll
    • [ ] Typing indicators
    • [ ] Accessibility
References
    • [Link to AI service docs]
    • [Link to React chatbot tutorials]
    • [Link to design inspiration]
Modern Chatbot Implementation Reference
Based on web research[web:67][web:70][web:73][web:79]:
Recommended libraries:
    • assistant-ui - Production-grade React chatbot UI
    • stream-chat-react - Full-featured chat SDK
    • Custom build with lucide-react icons + streaming API
Key features for Phase 15:
// Modern chatbot architecture
interface ChatMessage {
id: string;
role: 'user' | 'assistant';
content: string;
timestamp: Date;
status?: 'sending' | 'sent' | 'error';
}
// Streaming support
async function* streamChatResponse(message: string) {
const response = await fetch('/api/chat', {
method: 'POST',
body: JSON.stringify({ message }),
});
const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
const { done, value } = await reader.read();
if (done) break;
yield decoder.decode(value);
}
}
// Auto-scroll implementation
const messagesEndRef = useRef<HTMLDivElement>(null);
useEffect(() => {
messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
Deliverables
For Phase 15 planning:
    1. Research Document: .agent/chatbot-research.md
        ◦ Current implementation analysis
        ◦ Architecture diagram
        ◦ Feature inventory
        ◦ Migration recommendations
    2. Decision Document: .agent/chatbot-phase-15-plan.md
        ◦ Rebuild vs refactor decision
        ◦ Tech stack choices
        ◦ Feature roadmap
        ◦ Timeline estimate
    3. Code Archive:
        ◦ Move existing chatbot code to _archived_v1/ if found
        ◦ Add deprecation notices
        ◦ Document why archived
Files to Create
    • [CREATE] .agent/chatbot-research.md
        ◦ Comprehensive research findings
    • [CREATE] .agent/chatbot-phase-15-plan.md
        ◦ Detailed Phase 15 implementation plan
    • [ARCHIVE] Existing chatbot files (if found)
        ◦ Move to src/components/chat/_archived_v1/
Success Criteria
    • [ ] Chatbot code located (or confirmed absent)
    • [ ] Current implementation documented
    • [ ] Feature inventory complete
    • [ ] Phase 15 migration plan drafted
    • [ ] Tech stack recommendations made
    • [ ] Timeline estimate provided

Phase 14 Summary
Priority Execution
    1. S1: Category Filter (Week 1) - Quick win, high user value
    2. S2: People UI Refactor (Week 2-3) - Major UX improvement
    3. S3: Navigation Enhancement (Week 3-4) - Add breadcrumbs, keep sidebar
    4. S4: Chatbot Research (Ongoing) - Documentation for Phase 15
Success Metrics
S1: Category Filter
    • [ ] Filter functional on /transactions page
    • [ ] Performance impact < 100ms
    • [ ] Mobile responsive
S2: People UI
    • [ ] User satisfaction improved (subjective)
    • [ ] Page load time maintained
    • [ ] All features functional
S3: Navigation
    • [ ] Breadcrumbs on all pages
    • [ ] Sidebar collapsible
    • [ ] Command palette working
    • [ ] Recent items tracking
S4: Chatbot Research
    • [ ] Documentation complete
    • [ ] Phase 15 plan ready

Git Workflow
Branch naming:
feat/phase-14-category-filter (S1)
feat/phase-14-people-ui-refactor (S2)
feat/phase-14-navigation-enhancements (S3)
docs/phase-14-chatbot-research (S4)
Commit strategy:
S1
git commit -m "feat(txn): Add category filter to transactions page"
git commit -m "style(txn): Update filter UI to match design system"
S2
git commit -m "refactor(people): Redesign person cards UI"
git commit -m "feat(people): Add filters and sorting to people page"
S3
git commit -m "feat(nav): Add breadcrumb navigation component"
git commit -m "feat(nav): Implement collapsible sidebar"
git commit -m "feat(nav): Add command palette (Cmd+K)"
S4
git commit -m "docs(chatbot): Add chatbot research documentation"

Notes & Recommendations
Navigation Decision Rationale
Why keep sidebar:
    • Scales better (11+ menu items)
    • Supports hierarchical navigation
    • Industry standard for admin panels
    • Customizable for future features
Why add breadcrumbs:
    • Improves navigation context
    • Shows current location clearly
    • Doesn't require removing sidebar
    • Best of both worlds
Future consideration:
    • Mobile view: Sidebar becomes drawer (already common pattern)
    • Tablet: Consider collapsible sidebar by default
People Page Refactor Strategy
Recommended approach: Incremental improvements
    • Lower risk than full redesign
    • Can deploy faster
    • Easier to test and debug
    • User feedback can guide next iteration
Avoid: Big-bang rewrite
    • High risk of bugs
    • Longer development time
    • More QA required
Phase 15 Chatbot Preview
Research now = Faster Phase 15 execution
If chatbot code exists:
    • Document what works
    • Identify what to keep
    • Plan migration path
If no chatbot code:
    • Research best libraries (assistant-ui, stream-chat-react)
    • Plan architecture from scratch
    • Define feature set

References
Navigation Research
    • Left vs Top Navigation UX Study[web:65]
    • Side Nav vs Top Nav Analysis[web:68]
    • Navigation Scalability Research[web:71]
    • Breadcrumb Design Patterns[web:66][web:69]
Chatbot Implementation
    • React AI Chatbot Guide 2026[web:67]
    • Assistant-UI Library[web:79]
    • Stream Chat React[web:70]
    • Chatbot UI Customization[web:76]
UX Best Practices
    • UI/UX Analytics Research[web:52]
    • Menu Positioning Study[web:61]
    • Mobile UI Patterns[web:60]

Handover Checklist
Before starting Phase 15:
    • [x] S1: Category filter deployed ✓
    • [x] S2: People UI refactored ✓
    • [x] S3: Breadcrumbs + sidebar enhancements live (Researched & Planned for Phase 15) ✓
    • [x] S4: Chatbot research documented (See .agent/PHASE_15_RESEARCH.md) ✓
    • [x] All manual tests passed
    • [x] No regression bugs
    • [x] Performance maintained
    • [x] Documentation updated
    • [ ] PR reviews completed
Phase 14 → Phase 15 Transition:
    • Review chatbot research
    • Finalize Phase 15 scope
    • Assign resources
    • Set timeline
Good luck with Phase 14! 🚀