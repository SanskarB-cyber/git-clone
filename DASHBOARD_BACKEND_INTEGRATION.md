# Dashboard Backend Integration

## Overview
The Dashboard has been fully integrated with the backend APIs. All buttons now communicate with the backend to perform Git operations.

## Backend Endpoints Implemented

### 1. **Fetch Commits**
- **Endpoint:** `GET /api/repos/:owner/:repo/log`
- **Parameters:** `owner_id` (query parameter)
- **Functionality:** Fetches commit history from Supabase
- **Used in:** Dashboard initialization and refresh operations

### 2. **Fetch Branches**
- **Endpoint:** `GET /api/repos/:owner/:repo/branches`
- **Parameters:** `owner_id` (query parameter)
- **Functionality:** Retrieves list of all branches in the repository
- **Used in:** Dashboard initialization and branch dropdown

### 3. **Pull Changes** ✨
- **Endpoint:** `GET /api/repos/:owner/:repo/log` (calls fetchCommits)
- **Functionality:** Fetches latest commits from remote
- **Button:** "Pull" in the toolbar
- **Response:** Updates the commit list with latest changes

### 4. **Push Changes** ✨
- **Endpoint:** `POST /api/repos/:owner/:repo/push`
- **Parameters:** 
  - `owner_id` (required)
  - `branch` (optional, defaults to 'main')
- **Functionality:** Pushes local commits to remote
- **Button:** "Push" in the toolbar
- **Response:** Confirmation message on success

### 5. **Fetch from Remote** ✨
- **Endpoint:** `POST /api/repos/:owner/:repo/fetch`
- **Parameters:**
  - `owner_id` (required)
  - `branch` (optional, defaults to 'main')
- **Functionality:** Fetches updates from remote and updates local commits
- **Button:** "Fetch" in the toolbar
- **Response:** Updates the commit list with fetched changes

### 6. **Checkout Branch**
- **Endpoint:** `POST /api/repos/:owner/:repo/checkout`
- **Parameters:**
  - `branch` (required)
  - `owner_id` (required)
- **Functionality:** Switches to a different branch
- **Used in:** Branch dropdown selection

## Frontend Integration

### Dashboard Component (`src/ui/Dashboard.tsx`)

#### State Management
```typescript
- commits: Commit[] - Array of commits fetched from backend
- selectedCommit: Commit | null - Currently selected commit
- loading: boolean - Loading state during API calls
- error: string - Error messages from API
- branches: string[] - List of available branches
- selectedBranch: string - Currently selected branch
- searchQuery: string - Search filter for commits
```

#### Key Functions

##### 1. `fetchCommits()`
- Calls `/api/repos/:owner/:repo/log` endpoint
- Parses response and transforms commits to UI format
- Sets loading and error states
- Formats timestamps and commit information

##### 2. `fetchBranches()`
- Calls `/api/repos/:owner/:repo/branches` endpoint
- Populates branch dropdown
- Sets default branch to 'main'

##### 3. `handlePull()`
- Triggered by "Pull" button
- Calls `fetchCommits()` to update commit list
- Shows success/error alerts

##### 4. `handlePush()`
- Triggered by "Push" button
- Sends POST request to `/api/repos/:owner/:repo/push`
- Includes owner_id and selected branch
- Shows success/error alerts

##### 5. `handleFetch()`
- Triggered by "Fetch" button
- Sends POST request to `/api/repos/:owner/:repo/fetch`
- Calls `fetchCommits()` after successful fetch
- Shows success/error alerts

##### 6. `handleBranchChange()`
- Triggered by branch dropdown selection
- Calls `/api/repos/:owner/:repo/checkout` to switch branch
- Updates local branch state
- Refreshes commit list

### UI Features

#### Toolbar Buttons
- **Pull Button:** Fetches latest commits from remote
- **Push Button:** Pushes commits to remote
- **Fetch Button:** Fetches updates from remote
- **Branch Selector:** Dropdown to switch between branches

#### Error Handling
- Displays error messages at the top of commit list
- Shows loading state while fetching
- Shows "No commits found" when list is empty
- Graceful error handling for network failures

#### Commit List
- Displays commits fetched from backend
- Shows author information
- Displays commit hash and timestamp
- Branch tag for each commit
- Click to view commit details

#### Commit Details Panel
- Shows full commit message
- Author name and email
- Commit hash
- Date/time
- File statistics (additions/deletions)
- Revert and View Files buttons

## Data Flow

```
Dashboard Component
    ↓
[On Mount] → fetchCommits() → Backend /api/repos/:owner/:repo/log
    ↓                             ↓
[Display Commits] ← Format Response
    ↓
[User Clicks Pull] → handlePull() → fetchCommits() → Update UI
    ↓
[User Clicks Push] → handlePush() → POST /api/repos/:owner/:repo/push → Update UI
    ↓
[User Clicks Fetch] → handleFetch() → POST /api/repos/:owner/:repo/fetch → fetchCommits() → Update UI
    ↓
[User Selects Branch] → handleBranchChange() → POST /api/repos/:owner/:repo/checkout → fetchCommits() → Update UI
```

## Error Handling

### API Error Response Format
```json
{
  "ok": false,
  "error": "Error message"
}
```

### Frontend Error Display
- Errors are caught and displayed in a red banner at the top
- Users are notified via alert dialogs
- Error states don't break the UI
- Graceful fallback to empty state

## Testing the Integration

### Prerequisites
1. Backend server running on `http://localhost:4000`
2. Supabase project configured with required tables
3. User authenticated in the frontend

### Test Steps

#### 1. Test Fetch Commits
- Navigate to Dashboard
- Verify commit list loads from backend
- Check that commits display correctly

#### 2. Test Branch Dropdown
- Click branch dropdown
- Select different branch
- Verify commit list updates
- Check API call to checkout endpoint

#### 3. Test Pull Button
- Click "Pull" button
- Verify success alert appears
- Check that commit list refreshes

#### 4. Test Push Button
- Click "Push" button
- Verify success alert appears
- Check network tab for POST request to push endpoint

#### 5. Test Fetch Button
- Click "Fetch" button
- Verify success alert appears
- Check that commit list updates with new commits

#### 6. Test Error Handling
- Disconnect internet or stop backend
- Try to fetch commits
- Verify error message displays in UI
- Verify error alert shows

## Database Tables Required

The backend assumes these Supabase tables exist:

### repositories
- id (UUID)
- owner_id (UUID)
- name (string)
- description (string)
- created_at (timestamp)
- updated_at (timestamp)

### commits
- id (UUID)
- repo_id (UUID, foreign key)
- branch_id (UUID, foreign key)
- sha (string)
- message (string)
- author_name (string)
- author_email (string)
- created_at (timestamp)

### branches
- id (UUID)
- repo_id (UUID, foreign key)
- name (string)
- created_at (timestamp)

## Future Enhancements

1. **Real Git Operations:** Integrate with actual Git repositories instead of simulated operations
2. **Commit Details:** Show actual file changes for each commit
3. **Revert Commit:** Implement actual commit reverting functionality
4. **Merge Requests:** Support pulling specific commits or branches
5. **Real-time Updates:** Use WebSockets for real-time commit updates
6. **Author Filter:** Implement actual filtering by author
7. **Advanced Search:** Full-text search for commits
8. **Commit Signing:** Support for GPG signed commits

## Deployment Checklist

- [ ] Backend server running and accessible
- [ ] Supabase project configured
- [ ] All required environment variables set
- [ ] Endpoints tested with Postman/Thunder Client
- [ ] Error handling verified
- [ ] Frontend deployed and connected to backend
- [ ] Dashboard tested in production environment
- [ ] All buttons tested and working
- [ ] Error states handled gracefully
