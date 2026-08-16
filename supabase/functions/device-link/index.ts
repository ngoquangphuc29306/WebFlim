import { createClient } from 'npm:@supabase/supabase-js@2';
import { canApprove, canExchange, isExpired } from './state.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEVICE_LINK_TTL_MS = 5 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Action = 'create' | 'approve' | 'status' | 'exchange';

type DeviceLinkRequest = {
  action?: Action;
  session_id?: string;
  device_code?: string;
  user_code?: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const webBaseUrl = (Deno.env.get('PHEVO_DEVICE_LINK_WEB_URL') ?? '').replace(/\/$/, '');

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomUserCode(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function authToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
}

async function authenticatedUser(request: Request) {
  const token = authToken(request);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

async function createSession() {
  if (!supabaseUrl || !serviceRoleKey || !webBaseUrl) return json({ error: 'server_not_configured' }, 503);
  const deviceCode = base64Url(randomBytes(32));
  const userCode = randomUserCode();
  const expiresAt = new Date(Date.now() + DEVICE_LINK_TTL_MS).toISOString();
  const [deviceCodeHash, userCodeHash] = await Promise.all([sha256(deviceCode), sha256(userCode)]);
  const { data, error } = await admin
    .from('device_link_sessions')
    .insert({ device_code_hash: deviceCodeHash, user_code_hash: userCodeHash, expires_at: expiresAt })
    .select('id, expires_at')
    .single();
  if (error || !data) return json({ error: 'session_create_failed' }, 503);

  const verificationUrl = `${webBaseUrl}/device-link?session=${encodeURIComponent(data.id)}&code=${encodeURIComponent(userCode)}`;
  return json({
    session_id: data.id,
    device_code: deviceCode,
    user_code: userCode,
    verification_url: verificationUrl,
    expires_at: data.expires_at,
  });
}

async function approveSession(request: Request, body: DeviceLinkRequest) {
  const user = await authenticatedUser(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (!body.session_id || !body.user_code) return json({ error: 'invalid_request' }, 400);
  const userCodeHash = await sha256(body.user_code.trim().toUpperCase());
  const { data: session, error: lookupError } = await admin
    .from('device_link_sessions')
    .select('id, status, expires_at')
    .eq('id', body.session_id)
    .eq('user_code_hash', userCodeHash)
    .maybeSingle();
  if (lookupError || !session) return json({ error: 'invalid_code' }, 404);
  if (isExpired(session.expires_at)) return json({ error: 'expired' }, 410);
  if (!canApprove(session.status, session.expires_at)) return json({ error: 'already_processed' }, 409);

  const { data: updated, error } = await admin
    .from('device_link_sessions')
    .update({ status: 'approved', approved_user_id: user.id, approved_at: new Date().toISOString() })
    .eq('id', session.id)
    .eq('status', 'pending')
    .is('approved_user_id', null)
    .select('id')
    .maybeSingle();
  if (error || !updated) return json({ error: 'already_processed' }, 409);
  return json({ status: 'approved' });
}

async function getStatus(body: DeviceLinkRequest) {
  if (!body.session_id || !body.device_code) return json({ error: 'invalid_request' }, 400);
  const deviceCodeHash = await sha256(body.device_code);
  const { data: session, error } = await admin
    .from('device_link_sessions')
    .select('status, approved_user_id, expires_at')
    .eq('id', body.session_id)
    .eq('device_code_hash', deviceCodeHash)
    .maybeSingle();
  if (error || !session) return json({ error: 'invalid_code' }, 404);
  if (isExpired(session.expires_at) && session.status === 'pending') {
    await admin.from('device_link_sessions').update({ status: 'consumed' }).eq('id', body.session_id).eq('status', 'pending');
    return json({ status: 'expired' });
  }
  return json({ status: session.status, user_id: session.approved_user_id });
}

async function exchangeSession(body: DeviceLinkRequest) {
  if (!body.session_id || !body.device_code) return json({ error: 'invalid_request' }, 400);
  const deviceCodeHash = await sha256(body.device_code);
  const now = new Date().toISOString();
  const { data: candidate, error: lookupError } = await admin
    .from('device_link_sessions')
    .select('status, expires_at, consumed_at')
    .eq('id', body.session_id)
    .eq('device_code_hash', deviceCodeHash)
    .maybeSingle();
  if (lookupError || !candidate || !canExchange(candidate.status, candidate.expires_at, candidate.consumed_at, Date.now())) {
    return json({ error: 'expired_or_consumed' }, 409);
  }
  const { data: claimed, error: claimError } = await admin
    .from('device_link_sessions')
    .update({ status: 'consumed', consumed_at: now })
    .eq('id', body.session_id)
    .eq('device_code_hash', deviceCodeHash)
    .eq('status', 'approved')
    .is('consumed_at', null)
    .gt('expires_at', now)
    .select('approved_user_id')
    .maybeSingle();
  if (claimError || !claimed?.approved_user_id) return json({ error: 'expired_or_consumed' }, 409);

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(claimed.approved_user_id);
  const email = userData.user?.email;
  if (userError || !email) return json({ error: 'email_auth_required' }, 422);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const hashedToken = link?.properties?.hashed_token;
  if (linkError || !hashedToken) return json({ error: 'session_issue_failed' }, 503);

  const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '', 'content-type': 'application/json' },
    body: JSON.stringify({ token_hash: hashedToken, type: 'magiclink' }),
  });
  if (!verifyResponse.ok) return json({ error: 'session_issue_failed' }, 503);
  const tokens = await verifyResponse.json();
  if (!tokens.access_token || !tokens.refresh_token || !tokens.user?.id) return json({ error: 'session_issue_failed' }, 503);
  return json({
    user_id: tokens.user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  let body: DeviceLinkRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  switch (body.action) {
    case 'create': return createSession();
    case 'approve': return approveSession(request, body);
    case 'status': return getStatus(body);
    case 'exchange': return exchangeSession(body);
    default: return json({ error: 'invalid_action' }, 400);
  }
});
