# Google OAuth Setup for Supabase

## Steps to Configure Google OAuth

### 1. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if you haven't already
6. For Application type, select **Web application**
7. Add authorized redirect URIs:
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
   - For local development: `http://localhost:54321/auth/v1/callback`
8. Save and copy your **Client ID** and **Client Secret**

### 2. Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and enable it
5. Enter your Google **Client ID** and **Client Secret**
6. Save the configuration

### 3. Environment Variables

Ensure your `.env.local` file has the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Test the Integration

1. Start your development server
2. Navigate to the login page
3. Click "Sign in with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you'll be redirected back to `/editor`

## How It Works

The implementation uses Supabase's `signInWithOAuth` method:

```typescript
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/editor`,
  },
});
```

After successful authentication, Supabase will:
1. Redirect to Google for authorization
2. Handle the OAuth callback
3. Create/update the user in your Supabase database
4. Redirect to the specified `redirectTo` URL
