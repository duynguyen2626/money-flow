# Phase Batch Enhance Plan

## Phase 1: High Priority Bug Fixes & Resilient UX
1. **Fix `removeChild` DOM Error**: 
   - Root cause: Structural DOM changes immediately accompanied by React state updates when using NextJS Router, Radix UI Modals (`ConfirmDialog`), and Conditional React trees (like removing `BatchDetail` immediately).
   - Fix: Use React's `useTransition` hook or graceful state-based spinner overlaid without modifying the node tree dynamically on navigation inputs (like "Before/After Cutoff" or "Add Month").

2. **Fix Before/After Tabs Loading state**:
   - Provide visual feedback (spinner) when changing `?period=after` or `before` so the user knows it's loading. Add `useTransition` to `handlePeriodSelect`.

## Phase 2: Batch Details UI & Flow Adjustments
1. **Amount Formatter Unification**:
   - Total Amount: Keep the numeric amount styled large (red), and print the localized text on the *same line* (blue, non-italic, uppercase).
   
2. **"Step 1: Fund" Button Enforcement**:
   - Make sure "Step 1: Fund" button is always visibly rendered, conditionally disabled depending on `batch_items.length` or `batch.status`, preventing layout shift.

3. **Action Button on Items Table**:
   - Change the lonely "Check" toggle button in `items-table.tsx` to text-based "Confirm" button so it's clear what the action does.

## Phase 3: Global Settings Slide Integration
1. **Global Setting Access**:
   - Remove any local/duplicate setting gear icons (like underneath the total amount in `batch-detail`).
   - Leave the one main `Settings` button at the top header area.
2. **Convert to a Slide Modal**:
   - Instead of routing to `http://localhost:55940/batch/settings`, reuse the form content of `BatchSettingsPage` into a `BatchSettingsSlide` component.
   - Trigger it directly from `BatchPageClientV2` so the user doesn't lose context of the batch lists.

## Phase 4: Smart "Internal Target Account" Pre-filtering
1. **Pre-filter based on `statement_day` or `due_date`**:
   - Read the database `accounts` table configuration.
   - If User is in `Before Cutoff` mode (e.g., 1-15), the `Target Internal Account` selection inside `BatchItemSlide` will primarily display credit cards or accounts that typically have a statement/due date falling into this zone, streamlining selection.
