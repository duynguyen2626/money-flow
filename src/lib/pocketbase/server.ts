
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function createClient() {
    const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://api-db.reiwarden.io.vn');

    const cookieStore = await cookies();
    const cookieHeader = cookieStore.get('pb_auth')?.value;

    if (cookieHeader) {
        pb.authStore.loadFromCookie(cookieHeader);
    }

    // After each request, we should update the cookie if the auth state changed
    // Note: In Next.js 15/16 RSCs can't set cookies directly during render.
    // This is usually handled in middleware or Server Actions.

    return pb;
}

// Admin client for tasks that bypass RLS
export async function createAdminClient() {
    const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://api-db.reiwarden.io.vn');

    // Login as admin/superuser
    await pb.collection('_superusers').authWithPassword(
        process.env.POCKETBASE_DB_EMAIL || '',
        process.env.POCKETBASE_DB_PASSWORD || ''
    );

    return pb;
}
