import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const APIURL = 'https://open-api.bingx.com';
const APIKEY = process.env.BINGX_API_KEY ?? '';
const SECRETKEY = process.env.BINGX_SECRET_KEY ?? '';

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

  const allParams = { ...params, timestamp };
  const sortedKeys = Object.keys(allParams).sort();
  const queryString = sortedKeys.map((k) => `${k}=${allParams[k]}`).join('&');
  const signature = sign(SECRETKEY, queryString);

  return `${APIURL}${path}?${queryString}&signature=${signature}`;
}

interface BingXInvitedUser {
  uid?: number | string;
  [key: string]: unknown;
}

interface FetchPageResult {
  list: BingXInvitedUser[];
  total: number;
  hasMore: boolean;
  lastUid?: number;
}

/**
 * Fetch one page of invited users from BingX Agent API.
 * Endpoint: GET /openApi/agent/v1/account/inviteAccountList
 * V3 docs: pageNum (1-based), pageSize (max 100), optional lastUid for cursor pagination
 */
async function fetchInvitedPage(
  pageNum: number,
  pageSize: number,
  lastUid?: number
): Promise<FetchPageResult> {
  const params: Record<string, string | number> = {
    pageNum,
    pageSize,
  };

  if (lastUid !== undefined) {
    params['lastUid'] = lastUid;
  }

  const url = buildSignedUrl('/openApi/agent/v1/account/inviteAccountList', params);

  console.log(`[BingX] Fetching page ${pageNum}${lastUid ? ` (lastUid=${lastUid})` : ''}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-BX-APIKEY': APIKEY,
    },
  });

  const rawText = await response.text();
  console.log(`[BingX] HTTP ${response.status} page ${pageNum}:`, rawText.slice(0, 500));

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`BingX returned non-JSON (HTTP ${response.status}): ${rawText.slice(0, 300)}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Unexpected BingX response shape: ${JSON.stringify(parsed).slice(0, 200)}`);
  }

  const root = parsed as Record<string, unknown>;
  const code = root['code'];

  if (code !== 0) {
    const msg = String(root['msg'] ?? root['message'] ?? 'unknown error');
    throw new Error(`BingX API error — code: ${String(code)}, msg: ${msg}`);
  }

  // data may be null when there are no results
  const data = root['data'] as Record<string, unknown> | null | undefined;

  if (!data) {
    // No data = empty result set, not an error
    return { list: [], total: 0, hasMore: false };
  }

  // V3 API may return 'rows' or 'list' depending on version
  let list: BingXInvitedUser[] = [];
  if (Array.isArray(data['rows'])) {
    list = data['rows'] as BingXInvitedUser[];
  } else if (Array.isArray(data['list'])) {
    list = data['list'] as BingXInvitedUser[];
  } else if (Array.isArray(data['data'])) {
    list = data['data'] as BingXInvitedUser[];
  }

  const total = typeof data['total'] === 'number' ? data['total'] : list.length;
  const hasMore = list.length === pageSize;

  // Get last UID for cursor-based pagination (needed when total > 10,000)
  const lastItem = list[list.length - 1];
  const lastItemUid = lastItem ? Number(lastItem['uid'] ?? 0) : undefined;

  return { list, total, hasMore, lastUid: lastItemUid };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uid = typeof body?.uid === 'string' ? body.uid.trim() : String(body?.uid ?? '').trim();

    if (!uid) {
      return NextResponse.json({ success: false, message: 'UID is required.' }, { status: 400 });
    }

    if (!APIKEY || !SECRETKEY) {
      console.error('[BingX] API keys not configured');
      return NextResponse.json({ success: false, message: 'BingX API not configured.' }, { status: 500 });
    }

    const uidNumber = Number(uid);
    const PAGE_SIZE = 100;

    const uidMatches = (entry: BingXInvitedUser): boolean => {
      const itemUid = entry['uid'];
      return itemUid === uidNumber || String(itemUid) === uid;
    };

    // Fetch first page
    const firstPage = await fetchInvitedPage(1, PAGE_SIZE);
    console.log(`[BingX] Total invited users: ${firstPage.total}, first page count: ${firstPage.list.length}`);

    if (firstPage.list.some(uidMatches)) {
      console.log(`[BingX] UID "${uid}" found on page 1`);
      return NextResponse.json({ success: true });
    }

    // Paginate through remaining pages
    const totalPages = Math.ceil(firstPage.total / PAGE_SIZE);
    let lastUid = firstPage.lastUid;

    for (let page = 2; page <= totalPages; page++) {
      // Use cursor (lastUid) when total > 10,000 as required by BingX V3 docs
      const useLastUid = firstPage.total > 10000 ? lastUid : undefined;
      const { list, lastUid: newLastUid } = await fetchInvitedPage(page, PAGE_SIZE, useLastUid);

      if (list.some(uidMatches)) {
        console.log(`[BingX] UID "${uid}" found on page ${page}`);
        return NextResponse.json({ success: true });
      }

      lastUid = newLastUid;

      if (list.length < PAGE_SIZE) {
        // No more pages
        break;
      }
    }

    console.warn(`[BingX] UID "${uid}" not found in ${firstPage.total} invited users`);
    return NextResponse.json({
      success: false,
      message: 'Your UID is not in the referral list — contact us if you believe this is an error.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[BingX] referral check error:', message);
    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV !== 'production'
            ? `BingX error: ${message}`
            : 'Internal server error.',
      },
      { status: 500 }
    );
  }
}
