# **AGENT TASK: REDESIGN ACCOUNT CARD (V2 \- CLEAN STYLE)**

Context:  
The previous "Digital Bank Card" design was too complex and buggy (broken icons, layout shifts).  
The User wants a simpler, cleaner "Info Card" style.  
**Visual Reference:**

* **Background:** White (bg-white), Rounded (rounded-xl), Shadow.  
* **Top Decoration:** A visual header (image or gradient) occupying the top 30-40%.  
* **Content Layout:** 3 Distinct Rows below the header.

Objective:  
Build a robust, clean AccountCard component that displays all info clearly and has accessible Quick Action buttons.

## **1\. UI: Redesign src/components/moneyflow/account-card.tsx**

**Structure:**

\<div className="group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md"\>  
    
  {/\* 1\. DECORATIVE HEADER (Top 30%) \*/}  
  {/\* Use a gradient based on account type, or a pattern image \*/}  
  \<div className={\`h-24 w-full bg-gradient-to-r ${getGradient(type)} relative\`}\>  
     {/\* Logo floating overlap \*/}  
     \<div className="absolute \-bottom-6 left-4 h-12 w-12 rounded-full border-4 border-white bg-white p-1 shadow-sm"\>  
        \<img src={logoUrl} className="h-full w-full object-contain" /\>  
     \</div\>  
  \</div\>

  {/\* 2\. MAIN CONTENT (Padding top to account for logo overlap) \*/}  
  \<div className="flex flex-col gap-3 p-4 pt-8"\>  
      
    {/\* ROW 1: Name & Balance & Edit \*/}  
    \<div className="flex items-start justify-between"\>  
       \<div\>  
          \<h3 className="font-semibold text-gray-900"\>{name}\</h3\>  
          \<p className="text-xs text-gray-500"\>{type}\</p\>  
       \</div\>  
       \<div className="text-right"\>  
          \<div className={\`text-lg font-bold ${balance \< 0 ? 'text-red-600' : 'text-gray-900'}\`}\>  
             {formatCurrency(balance)}  
          \</div\>  
          {/\* Edit Button (Absolute top-right of card or here) \*/}  
          \<button onClick={onEdit} className="text-gray-400 hover:text-blue-600"\>  
             \<PencilIcon className="h-4 w-4" /\>  
          \</button\>  
       \</div\>  
    \</div\>

    {/\* ROW 2: Smart Info (Badges) \*/}  
    \<div className="flex flex-wrap gap-2 text-xs"\>  
       {/\* Credit Card Info \*/}  
       {type \=== 'credit\_card' && (  
          \<\>  
            \<div className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-red-700"\>  
               \<ClockIcon className="h-3 w-3" /\>  
               \<span\>Hạn: {dueDate}\</span\>  
            \</div\>  
            \<div className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700"\>  
               \<PiggyBankIcon className="h-3 w-3" /\>  
               \<span\>Back còn: {cashbackRemains}\</span\>  
            \</div\>  
          \</\>  
       )}  
       {/\* Debt Info \*/}  
       {type \=== 'debt' && (  
          \<div className="rounded-md bg-orange-50 px-2 py-1 text-orange-700"\>  
             Kỳ: {tag}  
          \</div\>  
       )}  
    \</div\>

    {/\* ROW 3: Quick Actions (Grid) \*/}  
    \<div className="mt-2 grid grid-cols-5 gap-2 border-t pt-3"\>  
       \<ActionButton icon={ArrowRightLeft} label="Transfer" onClick={...} /\>  
       \<ActionButton icon={Plus} label="Thu" onClick={...} /\>  
       \<ActionButton icon={Minus} label="Chi" onClick={...} /\>  
       {type \=== 'credit\_card' && \<ActionButton icon={CreditCard} label="Trả Thẻ" /\>}  
       {type \=== 'debt' && \<ActionButton icon={User} label="Trả Nợ" /\>}  
    \</div\>

  \</div\>  
\</div\>

**Helper Functions:**

* getGradient(type): Return specific Tailwind classes (e.g., from-blue-500 to-cyan-400 for Bank).  
* **Action Button Component:** Small flex column (Icon \+ Label text optional, or just Tooltip). Use clear Icons.

## **2\. Integration Details**

* **Icons:** Import Pencil, Clock, PiggyBank, ArrowRightLeft, Plus, Minus, CreditCard, User from lucide-react.  
* **Layout:** Ensure text doesn't wrap weirdly. Use whitespace-nowrap for numbers.

## **3\. Execution Steps**

1. Rewrite AccountCard.tsx completely with the structure above.  
2. Ensure the "Edit" button triggers the existing Edit Dialog.  
3. Map the Quick Action buttons to open the TransactionForm with pre-filled data (e.g., Click "Credit Pay" \-\> Open Form, Type=Transfer, To=CreditAccount).