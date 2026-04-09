import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const APIURL = 'https://open-api.bingx.com';
const APIKEY = process.env.BINGX_API_KEY ?? '';
const SECRETKEY = process.env.BINGX_SECRET_KEY ?? '';
const PAGE_SIZE = 199;
const MAX_PAGES = 20; // safety cap: 20 * 199 = ~3980 users max
const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds per request

function sign(secret: string, queryString: string): string {
  return createHmac('sha256', secret).update(queryString).digest('hex');
}

/**
 * Build a signed BingX GET request URL.
 * BingX signing: sort params alphabetically, join as key=value&...,
 * append timestamp, then HMAC-SHA256 the whole string.
 */
function buildSignedUrl(path: string, params: Record<string, string | number>): string {
  const timestamp = Date.now();
  const allParams: Record<string, string | number> = { ...params, timestamp };
  const sortedKeys = Object.keys(allParams).sort();
  const queryString = sortedKeys.map((k) => `${k}=${allParams[k]}`).join('&');
  const signature = sign(SECRETKEY, queryString);
  return `${APIURL}${path}?${queryString}&signature=${signature}`;
}

interface InvitedUser {
  uid: number | string;
}

interface BingXResponse {
  code: number;
  msg?: string;
  data?: {
    list?: InvitedUser[];
    total?: number;
  } | null;
}

/**
 * Fetch one page of invited users from BingX Agent API.
 * Endpoint: GET /openApi/agent/v1/account/inviteAccountList
 * V3 docs: pageNum (1-based), pageSize (max 100), optional lastUid for cursor pagination
 */
async function fetchPage(pageNum: number, lastUid?: number): Promise<{ list: InvitedUser[]; total: number }> {
  const params: Record<string, string | number> = {
    pageIndex: pageNum,
    pageSize: PAGE_SIZE,
  };
  if (lastUid !== undefined) {
    params['lastUid'] = lastUid;
  }

  const url = buildSignedUrl('/openApi/agent/v1/account/inviteAccountList', params);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { 'X-BX-APIKEY': APIKEY },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();

  let parsed: BingXResponse;
  try {
    parsed = JSON.parse(text) as BingXResponse;
  } catch {
    throw new Error(`BingX returned non-JSON (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }

  if (parsed.code !== 0) {
    throw new Error(`BingX API error — code: ${parsed.code}, msg: ${parsed.msg ?? 'unknown'}`);
  }

  const list = parsed.data?.list ?? [];
  const total = parsed.data?.total ?? list.length;

  return { list, total };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUid = body?.uid;
    const uid = typeof rawUid === 'string' ? rawUid.trim() : String(rawUid ?? '').trim();

    if (!uid || uid === 'undefined' || uid === 'null') {
      return NextResponse.json({ success: false, message: 'UID is required.' }, { status: 400 });
    }

    if (!APIKEY || !SECRETKEY) {
      return NextResponse.json({ success: false, message: 'BingX API not configured.' }, { status: 500 });
    }

    const uidNumber = Number(uid);

    const uidMatches = (entry: InvitedUser): boolean => {
      return Number(entry.uid) === uidNumber || String(entry.uid) === uid;
    };

    // Fetch first page
    const { list: firstList, total } = await fetchPage(1);

    if (firstList.some(uidMatches)) {
      return NextResponse.json({ success: true });
    }

    // Paginate only if needed and within safety cap
    const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);

    let lastUid: number | undefined =
      firstList.length > 0 ? Number(firstList[firstList.length - 1].uid) : undefined;

    for (let page = 2; page <= totalPages; page++) {
      const useLastUid = total > 10000 ? lastUid : undefined;
      const { list } = await fetchPage(page, useLastUid);

      if (list.some(uidMatches)) {
        return NextResponse.json({ success: true });
      }

      if (list.length < PAGE_SIZE) break; // no more data

      lastUid = list.length > 0 ? Number(list[list.length - 1].uid) : undefined;
    }

    return NextResponse.json({
      success: false,
      message: 'UID not found in the referral list. Please make sure you registered via our referral link.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes('abort') || message.includes('AbortError');

    console.error('[BingX] check-referral error:', message);

    return NextResponse.json(
      {
        success: false,
        message: isTimeout
          ? 'BingX API request timed out. Please try again.'
          : process.env.NODE_ENV !== 'production'
            ? `BingX error: ${message}`
            : 'Internal server error. Please try again.',
      },
      { status: 500 }
    );
  }
}
