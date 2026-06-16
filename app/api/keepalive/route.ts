export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ ok: false, error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/accounts?select=id&limit=1`, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Cache-Control': 'no-store',
    },
    cache: 'no-store',
  });

  return Response.json({
    ok: response.ok,
    status: response.status,
    checkedAt: new Date().toISOString(),
  });
}
