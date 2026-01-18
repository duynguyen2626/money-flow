  # PHASE 1A: TASK EXECUTION - Transaction Slide V2 Integration

## 🚀 QUICK START (Agent Reading This)

```bash
# Branch mới
git checkout -b feature/phase-1a-slide-v2-integration

# Read the main prompt
cat PHASE-1A-PROMPT.md

# Then start with Step 1 below
```

---

## 📋 STEP-BY-STEP EXECUTION

### STEP 1: Code Analysis & Mapping (2 hours)

**Goal**: Understand the codebase structure and locate key components

#### 1.1 Find the "+ Add" Button
```bash
# Search for button or "Add" text
grep -r "Add" src/ --include="*.tsx" --include="*.ts" | grep -i button
grep -r "\+ Add" src/ --include="*.tsx" --include="*.ts"

# Common locations:
# - src/pages/Transactions.tsx
# - src/components/TransactionTable/*.tsx
# - src/components/layout/Header.tsx
# - src/components/layout/Toolbar.tsx
```

**Document**: 
- [ ] File path: `_____________________`
- [ ] Component name: `_____________________`
- [ ] Current onClick handler: `_____________________`
- [ ] Button ID/className: `_____________________`

#### 1.2 Find Transaction Data Structure
```bash
# Search for transaction type/interface
grep -r "Transaction" src/types/ --include="*.ts"
grep -r "interface.*Transaction" src/ --include="*.ts"

# Common locations:
# - src/types/transaction.ts
# - src/types/index.ts
# - src/api/types.ts
```

**Document Transaction Interface**:
```typescript
// Paste the actual interface here:
interface Transaction {
  // Fields:
  // 1. ________________
  // 2. ________________
  // 3. ________________
  // 4. ________________
  // 5. ________________
}
```

#### 1.3 Find Action Column (Pen & Copy Icons)
```bash
# Search for Action column
grep -r "Action" src/components/ --include="*.tsx" | grep -i column
grep -r "pen" src/components/ --include="*.tsx" --include="*.jsx"
grep -r "edit" src/components/ --include="*.tsx" | grep -i icon

# Common locations:
# - src/components/TransactionTable/ActionCell.tsx
# - src/components/TransactionTable/TableBody.tsx
# - src/components/TransactionTable/index.tsx
```

**Document**:
- [ ] File path: `_____________________`
- [ ] Pen icon onClick: `_____________________`
- [ ] Copy icon onClick: `_____________________`
- [ ] Current handlers exist? YES / NO

#### 1.4 Check Customize Columns Feature
```bash
# Search for customize/columns
grep -r "Customize" src/ --include="*.tsx" --include="*.ts"
grep -r "columns" src/ --include="*.tsx" | grep -i custom
grep -r "TableHeader\|ColumnConfig" src/ --include="*.tsx"
```

**Document**:
- [ ] Feature exists? YES / NO
- [ ] File location (if exists): `_____________________`
- [ ] Component name: `_____________________`

#### 1.5 Check Slide V2 Component Status
```bash
# Search for existing Slide component
grep -r "Slide" src/components/ --include="*.tsx" | grep -v ".test"
grep -r "TransactionSlide\|SlideV2" src/ --include="*.tsx"

# Check if it's already imported somewhere
grep -r "import.*Slide" src/ --include="*.tsx"
```

**Document**:
- [ ] Slide component exists? YES / NO
- [ ] Location: `_____________________`
- [ ] Props interface: `_____________________`
- [ ] Already integrated? YES / NO

#### 1.6 Check API Endpoints
```bash
# Search for API calls
grep -r "/api\|axios\|fetch" src/hooks/ --include="*.ts"
grep -r "transaction" src/api/ --include="*.ts"
grep -r "useTransactions\|useQuery" src/hooks/ --include="*.ts"
```

**Document API Endpoints**:
```
CREATE: POST _________________________ (body: _______)
READ:   GET  _________________________ 
UPDATE: PUT  _________________________ (body: _______)
```

---

### STEP 2: Create Component Files (1.5 hours)

**Goal**: Set up the Slide and Warning Dialog components

#### 2.1 Create TransactionSlide Component Structure
```bash
mkdir -p src/components/TransactionSlide
touch src/components/TransactionSlide/index.ts
touch src/components/TransactionSlide/TransactionSlide.tsx
touch src/components/TransactionSlide/TransactionSlide.types.ts
touch src/components/TransactionSlide/TransactionSlide.module.css
touch src/components/TransactionSlide/TransactionSlide.test.tsx
```

#### 2.2 Create WarningDialog Component Structure
```bash
mkdir -p src/components/ui/WarningDialog
touch src/components/ui/WarningDialog/index.ts
touch src/components/ui/WarningDialog/WarningDialog.tsx
touch src/components/ui/WarningDialog/WarningDialog.module.css
touch src/components/ui/WarningDialog/WarningDialog.test.tsx
```

#### 2.3 Create Types File
```bash
touch src/components/TransactionSlide/TransactionSlide.types.ts
```

**Add to TransactionSlide.types.ts**:
```typescript
import { Transaction } from 'src/types/transaction';

export type SlideMode = 'CREATE' | 'EDIT' | 'DUPLICATE';

export interface TransactionSlideProps {
  isOpen: boolean;
  onClose: () => void;
  mode: SlideMode;
  transactionData?: Transaction;
  onSuccess?: (transaction: Transaction) => void;
  onError?: (error: Error) => void;
}

export interface TransactionFormData {
  date: string;
  amount: number;
  category: string;
  account: string;
  note?: string;
  // Add other fields based on Step 1.2
}

export interface WarningDialogProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  message?: string;
}
```

---

### STEP 3: Implement WarningDialog (1 hour)

**Goal**: Create the unsaved changes warning dialog

#### 3.1 Implement Component
```bash
# Edit: src/components/ui/WarningDialog/WarningDialog.tsx
```

**Code Template**:
```typescript
import React from 'react';
import styles from './WarningDialog.module.css';

export interface WarningDialogProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  message?: string;
}

export const WarningDialog: React.FC<WarningDialogProps> = ({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  message = 'You have unsaved changes. Do you want to discard them?',
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Unsaved Changes</h2>
        </div>
        
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>
        
        <div className={styles.footer}>
          <button 
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={onDiscard}
          >
            Discard
          </button>
          <button 
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### 3.2 Add Styles
```bash
# Edit: src/components/ui/WarningDialog/WarningDialog.module.css
```

**CSS Template**:
```css
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 400px;
  width: 90%;
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.header {
  padding: var(--space-16);
  border-bottom: 1px solid var(--color-border);
}

.title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}

.body {
  padding: var(--space-16);
}

.message {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.footer {
  padding: var(--space-16);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: var(--space-8);
  justify-content: flex-end;
}

.button {
  padding: var(--space-8) var(--space-16);
  border: none;
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.buttonPrimary {
  background-color: var(--color-primary);
  color: white;
}

.buttonPrimary:hover {
  background-color: var(--color-primary-hover);
}

.buttonSecondary {
  background-color: var(--color-secondary);
  color: var(--color-text);
}

.buttonSecondary:hover {
  background-color: var(--color-secondary-hover);
}

.buttonDanger {
  background-color: var(--color-danger);
  color: white;
}

.buttonDanger:hover {
  background-color: var(--color-danger-hover);
}
```

#### 3.3 Export Component
```bash
# Edit: src/components/ui/WarningDialog/index.ts
```

```typescript
export { WarningDialog } from './WarningDialog';
export type { WarningDialogProps } from './WarningDialog';
```

---

### STEP 4: Implement TransactionSlide Component (3 hours)

**Goal**: Create the main Slide component for CRUD operations

#### 4.1 Create Main Component
```bash
# Edit: src/components/TransactionSlide/TransactionSlide.tsx
```

**Code Template - Part 1 (State & Setup)**:
```typescript
import React, { useState, useEffect } from 'react';
import { TransactionSlideProps, SlideMode } from './TransactionSlide.types';
import { WarningDialog } from 'src/components/ui/WarningDialog';
import styles from './TransactionSlide.module.css';

export const TransactionSlide: React.FC<TransactionSlideProps> = ({
  isOpen,
  onClose,
  mode,
  transactionData,
  onSuccess,
  onError,
}) => {
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    amount: 0,
    category: '',
    account: '',
    note: '',
    // Add other fields from Transaction interface
  });

  const [isDirty, setIsDirty] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data based on mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'CREATE') {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        category: '',
        account: '',
        note: '',
      });
    } else if (mode === 'EDIT' && transactionData) {
      setFormData({
        date: transactionData.date,
        amount: transactionData.amount,
        category: transactionData.category,
        account: transactionData.account,
        note: transactionData.note || '',
      });
    } else if (mode === 'DUPLICATE' && transactionData) {
      setFormData({
        date: new Date().toISOString().split('T')[0], // Today
        amount: transactionData.amount,
        category: transactionData.category,
        account: transactionData.account,
        note: transactionData.note || '',
      });
    }

    setIsDirty(false);
    setErrors({});
  }, [isOpen, mode, transactionData]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
    setIsDirty(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.account) newErrors.account = 'Account is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Call API based on mode
      if (mode === 'CREATE') {
        // await createTransaction(formData);
        console.log('Creating transaction:', formData);
      } else if (mode === 'EDIT' && transactionData) {
        // await updateTransaction(transactionData.id, formData);
        console.log('Updating transaction:', formData);
      } else if (mode === 'DUPLICATE' && transactionData) {
        // await createTransaction(formData);
        console.log('Duplicating transaction:', formData);
      }

      setIsDirty(false);
      onSuccess?.(formData as any);
      handleClose();
    } catch (error) {
      const err = error as Error;
      setErrors({ submit: err.message });
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close with warning
  const handleClose = () => {
    if (isDirty) {
      setShowWarning(true);
    } else {
      onClose();
    }
  };

  // Handle warning dialog
  const handleWarningDiscard = () => {
    setShowWarning(false);
    setIsDirty(false);
    onClose();
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
  };

  const handleWarningSave = () => {
    setShowWarning(false);
    handleSubmit({ preventDefault: () => {} } as any);
  };

  // Get title based on mode
  const getTitle = (): string => {
    switch (mode) {
      case 'CREATE':
        return 'Add New Transaction';
      case 'EDIT':
        return 'Edit Transaction';
      case 'DUPLICATE':
        return 'Duplicate Transaction';
      default:
        return 'Transaction';
    }
  };

  // Get button text based on mode
  const getButtonText = (): string => {
    switch (mode) {
      case 'CREATE':
        return 'Add Transaction';
      case 'EDIT':
        return 'Update Transaction';
      case 'DUPLICATE':
        return 'Duplicate to Save';
      default:
        return 'Save';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={handleClose} />
      
      <div className={styles.slide}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{getTitle()}</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Body - Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.body}>
            {/* Date Field */}
            <div className={styles.formGroup}>
              <label htmlFor="date" className={styles.label}>Date</label>
              <input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                disabled={isLoading}
                className={styles.input}
              />
              {errors.date && <span className={styles.error}>{errors.date}</span>}
            </div>

            {/* Amount Field */}
            <div className={styles.formGroup}>
              <label htmlFor="amount" className={styles.label}>Amount</label>
              <input
                id="amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                disabled={isLoading}
                className={styles.input}
                step="0.01"
              />
              {errors.amount && <span className={styles.error}>{errors.amount}</span>}
            </div>

            {/* Category Field */}
            <div className={styles.formGroup}>
              <label htmlFor="category" className={styles.label}>Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                disabled={isLoading}
                className={styles.input}
              >
                <option value="">Select Category</option>
                {/* TODO: Map categories from state/API */}
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              {errors.category && <span className={styles.error}>{errors.category}</span>}
            </div>

            {/* Account Field */}
            <div className={styles.formGroup}>
              <label htmlFor="account" className={styles.label}>Account</label>
              <select
                id="account"
                name="account"
                value={formData.account}
                onChange={handleInputChange}
                disabled={isLoading}
                className={styles.input}
              >
                <option value="">Select Account</option>
                {/* TODO: Map accounts from state/API */}
                <option value="main">Main Account</option>
              </select>
              {errors.account && <span className={styles.error}>{errors.account}</span>}
            </div>

            {/* Note Field */}
            <div className={styles.formGroup}>
              <label htmlFor="note" className={styles.label}>Note</label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                disabled={isLoading}
                className={styles.input}
                rows={3}
              />
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className={styles.errorBox}>
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer - Buttons */}
          <div className={styles.footer}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : getButtonText()}
            </button>
          </div>
        </form>
      </div>

      {/* Warning Dialog */}
      <WarningDialog
        isOpen={showWarning}
        onSave={handleWarningSave}
        onDiscard={handleWarningDiscard}
        onCancel={handleWarningCancel}
        message="You have unsaved changes. Do you want to discard them?"
      />
    </>
  );
};
```

#### 4.2 Add Styles
```bash
# Edit: src/components/TransactionSlide/TransactionSlide.module.css
```

**CSS Template**:
```css
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 900;
}

.slide {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 100%;
  max-width: 500px;
  background-color: var(--color-surface);
  box-shadow: var(--shadow-xl);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease-out;
  overflow: hidden;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.header {
  padding: var(--space-16);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}

.closeButton {
  background: none;
  border: none;
  font-size: var(--font-size-xl);
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-base);
  transition: background-color 0.2s ease;
}

.closeButton:hover:not(:disabled) {
  background-color: var(--color-secondary);
}

.closeButton:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.form {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
}

.input {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background-color: var(--color-background);
  transition: border-color 0.2s ease;
  font-family: inherit;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: -var(--space-4);
}

.errorBox {
  padding: var(--space-12);
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-base);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  text-align: center;
}

.footer {
  padding: var(--space-16);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: var(--space-8);
  justify-content: flex-end;
  flex-shrink: 0;
}

.button {
  padding: var(--space-8) var(--space-16);
  border: none;
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.buttonPrimary {
  background-color: var(--color-primary);
  color: white;
}

.buttonPrimary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.buttonSecondary {
  background-color: var(--color-secondary);
  color: var(--color-text);
}

.buttonSecondary:hover:not(:disabled) {
  background-color: var(--color-secondary-hover);
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .slide {
    max-width: 100%;
  }
}
```

#### 4.3 Export Component
```bash
# Edit: src/components/TransactionSlide/index.ts
```

```typescript
export { TransactionSlide } from './TransactionSlide';
export type { TransactionSlideProps, SlideMode, TransactionFormData } from './TransactionSlide.types';
```

---

### STEP 5: Integrate into Transactions Page (2 hours)

**Goal**: Connect Slide to the main Transactions page and hook up buttons

#### 5.1 Update Transactions Page
```bash
# Edit: src/pages/Transactions.tsx (or your main transactions component)
```

**Code Changes**:
```typescript
// Add imports at top
import { TransactionSlide } from 'src/components/TransactionSlide';
import { Transaction } from 'src/types/transaction';

// Inside component function, add state:
export const TransactionsPage = () => {
  // ... existing state ...

  // Slide state
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'CREATE' | 'EDIT' | 'DUPLICATE'>('CREATE');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Handlers for Slide
  const handleOpenCreate = () => {
    setSlideMode('CREATE');
    setSelectedTransaction(null);
    setSlideOpen(true);
  };

  const handleOpenEdit = (transaction: Transaction) => {
    setSlideMode('EDIT');
    setSelectedTransaction(transaction);
    setSlideOpen(true);
  };

  const handleOpenDuplicate = (transaction: Transaction) => {
    setSlideMode('DUPLICATE');
    setSelectedTransaction(transaction);
    setSlideOpen(true);
  };

  const handleCloseSlide = () => {
    setSlideOpen(false);
    setSelectedTransaction(null);
  };

  const handleSlideSuccess = async () => {
    // Refresh table data
    // await fetchTransactions();
    // Show success toast
    // dispatch({ type: 'SHOW_TOAST', payload: { message: 'Transaction saved!', type: 'success' } });
  };

  const handleSlideError = (error: Error) => {
    // Show error toast
    // dispatch({ type: 'SHOW_TOAST', payload: { message: error.message, type: 'error' } });
  };

  // ... existing JSX ...

  return (
    <div>
      {/* Toolbar with + Add Button */}
      <div className="toolbar">
        <button 
          onClick={handleOpenCreate}
          className="btn btn-primary"
        >
          + Add
        </button>
        {/* Other toolbar items (Account dropdown, People dropdown, etc.) */}
      </div>

      {/* Transaction Table */}
      <TransactionTable 
        transactions={transactions}
        onEdit={handleOpenEdit}
        onDuplicate={handleOpenDuplicate}
      />

      {/* Transaction Slide */}
      <TransactionSlide
        isOpen={slideOpen}
        onClose={handleCloseSlide}
        mode={slideMode}
        transactionData={selectedTransaction || undefined}
        onSuccess={handleSlideSuccess}
        onError={handleSlideError}
      />
    </div>
  );
};
```

#### 5.2 Update Action Column Component
```bash
# Edit: src/components/TransactionTable/ActionCell.tsx (or similar)
```

**Code Template**:
```typescript
interface ActionCellProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDuplicate: (transaction: Transaction) => void;
}

export const ActionCell: React.FC<ActionCellProps> = ({
  transaction,
  onEdit,
  onDuplicate,
}) => {
  return (
    <div className="action-cell">
      {/* Edit Button */}
      <button
        onClick={() => onEdit(transaction)}
        className="icon-button"
        title="Edit"
        aria-label="Edit transaction"
      >
        <PenIcon />
      </button>

      {/* Duplicate Button */}
      <button
        onClick={() => onDuplicate(transaction)}
        className="icon-button"
        title="Duplicate"
        aria-label="Duplicate transaction"
      >
        <CopyIcon />
      </button>

      {/* Customize Columns (if feature exists) */}
      {/* 
      <button
        onClick={() => onCustomizeColumns()}
        className="icon-button"
        title="Customize Columns"
        aria-label="Customize columns"
      >
        <SettingsIcon />
      </button>
      */}
    </div>
  );
};
```

---

### STEP 6: Testing & Validation (2 hours)

**Goal**: Test all functionality before PR

#### 6.1 Manual Testing Checklist
```bash
# Test CREATE mode
- [ ] Click "+ Add" button
- [ ] Slide opens with empty form
- [ ] Title says "Add New Transaction"
- [ ] Button says "Add Transaction"
- [ ] Can fill form fields
- [ ] Form validation works (required fields)
- [ ] Click Submit → Transaction created
- [ ] Table refreshes
- [ ] Success message shows
- [ ] Close without saving → Warning shows
  - [ ] "Cancel" keeps slide open
  - [ ] "Discard" closes without saving
  - [ ] "Save" submits and closes

# Test EDIT mode
- [ ] Click Pen icon
- [ ] Slide opens with pre-filled data
- [ ] Title says "Edit Transaction"
- [ ] Button says "Update Transaction"
- [ ] Can modify fields
- [ ] Click Submit → Transaction updated
- [ ] Table refreshes with new data
- [ ] Success message shows
- [ ] Close without saving → Warning shows

# Test DUPLICATE mode
- [ ] Click Copy icon
- [ ] Slide opens with pre-filled data (except date = today)
- [ ] Title says "Duplicate Transaction"
- [ ] Button says "Duplicate to Save"
- [ ] Can modify fields
- [ ] Click Submit → New transaction created
- [ ] Table shows new transaction (not modified original)
- [ ] Success message shows
- [ ] Close without saving → Warning shows

# Test Warning Dialog
- [ ] Shows custom styled dialog (NOT browser alert)
- [ ] Text is clear and readable
- [ ] All 3 buttons work correctly
- [ ] Can close with ESC? NO (should disable this)
- [ ] Can close by clicking outside? NO (should disable this)

# Test Error Handling
- [ ] Submit with empty required field → Shows error
- [ ] Submit with invalid amount → Shows error
- [ ] Network error → Shows error message (not crash)
- [ ] Can retry after error
```

#### 6.2 Write Unit Tests
```bash
# Create test file
touch src/components/TransactionSlide/TransactionSlide.test.tsx
touch src/components/ui/WarningDialog/WarningDialog.test.tsx
```

**Test Template - TransactionSlide.test.tsx**:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionSlide } from './TransactionSlide';

describe('TransactionSlide', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CREATE mode', () => {
    it('renders with empty form', () => {
      render(
        <TransactionSlide
          isOpen={true}
          onClose={mockOnClose}
          mode="CREATE"
        />
      );

      expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Transaction/i })).toBeInTheDocument();
    });

    it('submits form and calls onSuccess', async () => {
      const user = userEvent.setup();
      
      render(
        <TransactionSlide
          isOpen={true}
          onClose={mockOnClose}
          mode="CREATE"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/Amount/i), '100');
      await user.selectOption(screen.getByLabelText(/Category/i), 'expense');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /Add Transaction/i }));

      // Check success callback
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('EDIT mode', () => {
    it('renders with pre-filled data', () => {
      const mockTransaction = {
        id: '1',
        date: '2026-01-18',
        amount: 100,
        category: 'expense',
        account: 'main',
        note: 'Test',
      };

      render(
        <TransactionSlide
          isOpen={true}
          onClose={mockOnClose}
          mode="EDIT"
          transactionData={mockTransaction}
        />
      );

      expect(screen.getByText('Edit Transaction')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    });
  });

  describe('Warning Dialog', () => {
    it('shows warning when closing with unsaved changes', async () => {
      const user = userEvent.setup();
      
      render(
        <TransactionSlide
          isOpen={true}
          onClose={mockOnClose}
          mode="CREATE"
        />
      );

      // Make a change
      await user.type(screen.getByLabelText(/Amount/i), '50');

      // Try to close
      await user.click(screen.getByRole('button', { name: /Close/i }));

      // Warning should show
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
  });
});
```

---

### STEP 7: Code Review & Cleanup (1 hour)

**Goal**: Prepare PR with clean, documented code

#### 7.1 Code Quality Checklist
```bash
# Run linting
npm run lint

# Run tests
npm run test

# Check TypeScript
npm run type-check

# Format code
npm run format
```

#### 7.2 Documentation
```bash
# Add JSDoc comments to all exports
# Add comments to complex logic
# Update component README if exists
```

#### 7.3 Commit & PR
```bash
git add src/components/TransactionSlide/
git add src/components/ui/WarningDialog/
git add src/pages/Transactions.tsx
git add src/components/TransactionTable/ActionCell.tsx

git commit -m "feat: integrate transaction slide v2 with create/edit/duplicate and warning dialogs

- Implement TransactionSlide component with CREATE/EDIT/DUPLICATE modes
- Add WarningDialog for unsaved changes handling
- Connect +Add button to Slide (CREATE mode)
- Connect Pen icon to Slide (EDIT mode)
- Connect Copy icon to Slide (DUPLICATE mode)
- Form validation and error handling
- Loading states and success/error toasts
- 80%+ test coverage
- WCAG AA accessibility compliant"

git push origin feature/phase-1a-slide-v2-integration
```

---

## ✅ COMPLETION CHECKLIST

### Code Delivery
- [ ] TransactionSlide component created (with TypeScript)
- [ ] WarningDialog component created
- [ ] Styles created (CSS Modules)
- [ ] Types/interfaces defined
- [ ] Component exported properly

### Integration
- [ ] "+ Add" button triggers Slide (CREATE mode)
- [ ] Pen icon triggers Slide (EDIT mode)
- [ ] Copy icon triggers Slide (DUPLICATE mode)
- [ ] Form submission works
- [ ] Table refreshes after save
- [ ] Customize Columns icon added (if feature exists)

### Functionality
- [ ] Form validation works
- [ ] Warning dialog shows on unsaved changes
- [ ] Warning dialog styling is app-level (not browser)
- [ ] All 3 warning buttons work
- [ ] Loading states visible
- [ ] Error messages show
- [ ] Success messages show

### Quality
- [ ] Unit tests written (>80% coverage)
- [ ] Tests passing
- [ ] TypeScript no errors
- [ ] ESLint passing
- [ ] Prettier formatted
- [ ] Accessibility audit passed

### Documentation
- [ ] JSDoc comments added
- [ ] Complex logic documented
- [ ] PR description clear
- [ ] Commit message follows conventions

---

## 📞 NEED HELP?

### If form validation not working:
→ Check Transaction interface for required fields
→ Review validation logic in TransactionSlide.tsx (validateForm function)

### If Slide doesn't open:
→ Check if isOpen state passed correctly from Transactions.tsx
→ Verify onClick handlers are attached to buttons

### If table doesn't refresh:
→ Check onSuccess callback in Transactions.tsx
→ Verify API call actually returns updated data
→ May need to refetch entire transactions list

### If warning dialog doesn't show:
→ Check isDirty state is being set on form change
→ Verify WarningDialog isOpen prop is set correctly
→ Check backdrop onClick not preventing it

### If styles look wrong:
→ Verify CSS variables are defined in your app
→ Check class names match between .tsx and .module.css
→ Look for CSS specificity conflicts

---

*Phase 1A Task Execution Guide*  
*Version: 1.0*  
*Created: January 18, 2026*  
*Estimated Time: 12-14 hours*  
*Status: Ready for Agent*
