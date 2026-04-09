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
 * append &timestamp=<ms>, then HMAC-SHA256 the whole string.
 */
function buildSignedUrl(path: string, params: Record<string, string | number>): string {
  const timestamp = Date.now();

  // Sort keys, build query string WITHOUT timestamp first
  const sortedKeys = Object.keys(params).sort();
  const parts = sortedKeys.map((k) => `${k}=${params[k]}`);

  // Append timestamp
  parts.push(`timestamp=${timestamp}`);

  const queryString = parts.join('&');
  const signature = sign(SECRETKEY, queryString);

  return `${APIURL}${path}?${queryString}&signature=${signature}`;
}

/**
 * Fetch one page of invited users from BingX Agent API.
 * Endpoint: GET /openApi/agent/v1/account/inviteAccountList
 * Params: pageNum (1-based), pageSize (max 100)
 */
async function fetchInvitedPage(pageNum: number, pageSize: number): Promise<{
  list: unknown[];
  total: number;
}> {
  const url = buildSignedUrl('/openApi/agent/v1/account/inviteAccountList', {
    pageNum,
    pageSize,
  });

  console.log(`[BingX] Fetching page ${pageNum}, url: ${url}`);

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
    throw new Error(`BingX returned non-JSON: ${rawText.slice(0, 200)}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Unexpected BingX response shape: ${JSON.stringify(parsed).slice(0, 200)}`);
  }

  const root = parsed as Record<string, unknown>;
  const code = root['code'];

  if (code !== 0) {
    throw new Error(`BingX API error — code: ${String(code)}, msg: ${String(root['msg'] ?? root['message'] ?? '')}`);
  }

  const data = root['data'] as Record<string, unknown> | null;
  if (!data) {
    throw new Error('BingX response missing data field');
  }

  const list = Array.isArray(data['list']) ? (data['list'] as unknown[]) : [];
  const total = typeof data['total'] === 'number' ? data['total'] : 0;

  return { list, total };
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

    // Fetch first page to get total count
    const firstPage = await fetchInvitedPage(1, PAGE_SIZE);
    console.log(`[BingX] Total invited users: ${firstPage.total}, first page count: ${firstPage.list.length}`);

    // Check first page
    const foundOnFirstPage = firstPage.list.some((entry) => {
      if (typeof entry !== 'object' || entry === null) return false;
      const item = entry as Record<string, unknown>;
      const itemUid = item['uid'];
      return itemUid === uidNumber || String(itemUid) === uid;
    });

    if (foundOnFirstPage) {
      console.log(`[BingX] UID "${uid}" found on page 1`);
      return NextResponse.json({ success: true });
    }

    // Paginate through remaining pages if needed
    const totalPages = Math.ceil(firstPage.total / PAGE_SIZE);
    for (let page = 2; page <= totalPages; page++) {
      const { list } = await fetchInvitedPage(page, PAGE_SIZE);
      const found = list.some((entry) => {
        if (typeof entry !== 'object' || entry === null) return false;
        const item = entry as Record<string, unknown>;
        const itemUid = item['uid'];
        return itemUid === uidNumber || String(itemUid) === uid;
      });

      if (found) {
        console.log(`[BingX] UID "${uid}" found on page ${page}`);
        return NextResponse.json({ success: true });
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
