# Handover: Dynamic Favicon System - Money Flow 3

## 🎯 Goal
Implement dynamic browser tab icons (favicons) that change based on the account or person being viewed, with a consistent "Money Bag" fallback for all other pages.

## 🛠️ Status & Changes

### 1. Static Conflict Mitigation
Next.js automatically injects static files found in `src/app/` (like `favicon.ico`, `favicon.svg`, `icon.svg`). These were conflicting with dynamic metadata.
- **Action**: Moved `src/app/favicon.ico`, `src/app/favicon.svg`, and `src/app/icon.svg` to `.bak` files.
- **Result**: Next.js no longer auto-serves these as the default for all routes.

### 2. Base Metadata (layout.tsx)
The root layout now explicitly defines a robust set of fallback icons pointing to the `public/` directory.
- **Files used**: `public/favicon.svg`, `public/favicon.ico` (copied from `icon.png`), `public/apple-icon.png`.
- **Reference**:
  ```tsx
  icons: {
    icon: [
      { url: '/favicon.svg?v=6', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=6', sizes: 'any' },
    ],
    shortcut: ['/favicon.ico?v=6'],
    apple: [
      { url: '/icon.svg?v=6', type: 'image/svg+xml' },
      { url: '/apple-icon.png?v=6', sizes: '180x180', type: 'image/png' },
    ],
  }
  ```

### 3. Dynamic Metadata (GenerateMetadata)
Updated `src/app/accounts/[id]/page.tsx` and `src/app/people/[id]/page.tsx` to override the icons using the account/person `image_url`.
- **Structure**:
  ```tsx
  const icons: Metadata['icons'] = account.image_url ? {
    icon: [ { url: account.image_url, rel: 'icon' } ],
    shortcut: [ { url: account.image_url, rel: 'shortcut icon' } ],
    apple: [ { url: account.image_url, rel: 'apple-touch-icon' } ],
  } : { ...fallback... }
  ```

### 4. Compatibility Fixes
- **Browser Caching**: Browsers often cache favicons heavily. Added a `shortcut` rel to force updates in some browsers.
- **Vercel Logo Issue**: The Vercel triangle icon was likely coming from the default `src/app/favicon.ico`. Removing it should resolve the issue once the browser cache clears.

## 🚀 Recommendations for User
1. **Clear Browser Cache**: Hard refresh (**Ctrl+F5**) or clear site data/cookies for the domain. Favicons are among the most cached assets in modern browsers.
2. **Restart Dev Server**: Run `npm run dev` again to ensure Next.js picks up the removal of static files in the `app/` directory.
3. **External URL Handling**: If some account images still don't render, it might be due to **CORS** or the image host blocking use as a favicon. In that case, a proxy route like `/api/proxy/icon?id=...` might be needed to serve the image from the same domain.

## 📄 Relevant Files
- `src/app/layout.tsx`: Base metadata.
- `src/app/accounts/[id]/page.tsx`: Account-specific icons.
- `src/app/people/[id]/page.tsx`: Person-specific icons.
- `public/favicon.ico`: Standard fallback (generated from `icon.png`).
