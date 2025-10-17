# Action Cancel Flow

## Overview

This document describes the implementation of the action cancellation feature, which allows users to cancel a running or pending action with a confirmation dialog.

## Components Involved

### 1. ActionCancelDialog (`ActionCancelDialog.tsx`)

A confirmation dialog using `alert-dialog` component from shadcn/ui.

**Props:**

- `action`: The action to be cancelled
- `open`: Dialog open state
- `onOpenChange`: Callback to change dialog state
- `onConfirm`: Callback when user confirms cancellation
- `isLoading`: Loading state while cancelling

**Features:**

- Shows action name in the confirmation message
- Special warning if action is currently running
- Disabled state while processing cancellation

### 2. ActionItem (`ActionItem.tsx`)

Updated to include cancel button with dialog.

**Changes:**

- Added `ActionCancelDialog` component
- Added `showCancelDialog` state to control dialog visibility
- Added `isCancelling` state to track cancellation progress
- Added `handleCancelClick` to open dialog
- Added `handleCancelConfirm` to execute cancellation
- Cancel button now opens dialog instead of directly cancelling

### 3. ActionList (`ActionList.tsx`)

Handles the mutation call to cancel action.

**Changes:**

- Added `cancelAction` import from actions
- Added `mutateCancelAction` mutation with:
  - Success handler: invalidates queries and shows success toast
  - Error handler: shows error toast
- Added `handleActionCancel` function to trigger mutation
- Connected to `ActionItem` via `onActionCancel` prop

### 4. ActionDisplay (`ActionDisplay.tsx`)

Automatically dismounts when action is cancelled.

**Changes:**

- Added `useEffect` to detect when action status changes to PENDING
- When cancelled action detected:
  - Hides media content (`setShowMediaContent(false)`)
  - Marks action as completing (`setCompletingActionId`)
  - Forces component unmount via conditional rendering

## Backend

### Service (`timer-action-service.ts`)

Added `cancelAction` method:

```typescript
async cancelAction(actionId: string)
```

**Logic:**

1. Finds the action by ID
2. Updates action status to PENDING
3. Clears executedAt timestamp
4. Triggers Pusher event with "cancelled" action type
5. Returns cancelled action

### Server Action (`timer-actions.action.ts`)

Added `cancelAction` server function:

- Schema validation with `cancelActionSchema`
- Calls `timerActionService.cancelAction`

### Constants (`constant.ts`)

Added `CANCEL_ACTION` mutation key to `MUTATION_KEYS`.

## User Flow

1. User sees a running or pending action
2. User clicks "Cancel" button
3. Confirmation dialog appears asking to confirm
4. User clicks "Yes, cancel action"
5. Dialog shows loading state ("Cancelling...")
6. Backend updates action status to PENDING
7. Pusher event notifies all clients
8. ActionDisplay automatically dismounts
9. Action returns to pending state in ActionItem
10. Success toast appears

## Key Features

- ✅ Confirmation dialog prevents accidental cancellation
- ✅ Works for both RUNNING and PENDING actions
- ✅ Immediate UI feedback with loading states
- ✅ Automatic dismounting of media display
- ✅ Real-time sync via Pusher
- ✅ Error handling with user-friendly toasts
- ✅ Disabled states prevent double-cancellation

## Technical Notes

- Uses `setTimeout` with 0ms delay in `useEffect` to avoid React warnings about setState during render
- `completingActionId` check prevents re-triggering effect after cancellation
- Pusher event with "cancelled" action type can be used for additional client-side logic
- Action returns to PENDING state, allowing it to be restarted
