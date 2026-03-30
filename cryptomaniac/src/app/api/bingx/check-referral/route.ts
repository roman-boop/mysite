import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const APIURL = 'https://open-api.bingx.com';
const APIKEY = process.env.BINGX_API_KEY || '';
const SECRETKEY = process.env.BINGX_SECRET_KEY || '';

function getSign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Mirrors the Python parseParam() exactly:
 * 1. Sort keys
 * 2. Build paramsList (key=value pairs, no encoding)
 * 3. Append timestamp to paramsStr → used for HMAC signing
 * 4. Build urlParamsList (URL-encode values only if paramsStr contains [ or {)
 * 5. Append timestamp to urlParamsStr → used in the actual URL
 */
function parseParam(paramsMap: Record<string, string>): { paramsStr: string; urlParamsStr: string } {
  const sortedKeys = Object.keys(paramsMap).sort();
  const paramsList: string[] = [];
  const urlParamsList: string[] = [];

  for (const key of sortedKeys) {
    const value = paramsMap[key];
    paramsList.push(`${key}=${value}`);
  }

  const timestamp = String(Date.now());

  // paramsStr — used for signing
  let paramsStr = paramsList.join('&');
  paramsStr = paramsStr !== '' ? `${paramsStr}&timestamp=${timestamp}` : `timestamp=${timestamp}`;

  // contains check on paramsStr (matches Python)
  const contains = paramsStr.includes('[') || paramsStr.includes('{');

  for (const key of sortedKeys) {
    const value = paramsMap[key];
    if (contains) {
      urlParamsList.push(`${key}=${encodeURIComponent(String(value))}`);
    } else {
      urlParamsList.push(`${key}=${value}`);
    }
  }

  // urlParamsStr — used in the URL
  let urlParamsStr = urlParamsList.join('&');
  urlParamsStr = urlParamsStr !== '' ? `${urlParamsStr}&timestamp=${timestamp}` : `timestamp=${timestamp}`;

  return { paramsStr, urlParamsStr };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';

    if (!uid) {
      return NextResponse.json({ success: false, message: 'UID is required.' }, { status: 400 });
    }

    if (!APIKEY || !SECRETKEY) {
      console.error('[BingX] API keys not configured');
      return NextResponse.json({ success: false, message: 'BingX API not configured.' }, { status: 500 });
    }

    const paramsMap: Record<string, string> = { uid };
    const { paramsStr, urlParamsStr } = parseParam(paramsMap);
    const signature = getSign(SECRETKEY, paramsStr);

    const url = `${APIURL}/openApi/agent/v1/account/inviteRelationCheck?${urlParamsStr}&signature=${signature}`;

    console.log('[BingX] paramsStr (signed):', paramsStr);
    console.log('[BingX] urlParamsStr (url):', urlParamsStr);
    console.log('[BingX] signature:', signature);
    console.log('[BingX] full URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BX-APIKEY': APIKEY,
      },
    });

    const rawText = await response.text();
    console.log('[BingX] HTTP status:', response.status);
    console.log('[BingX] raw response:', rawText);

    let data: { code: number; msg?: string; data?: unknown };
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('[BingX] Failed to parse response JSON:', rawText);
      return NextResponse.json({ success: false, message: 'BingX API returned invalid response.' }, { status: 502 });
    }

    console.log('[BingX] parsed code:', data.code, '| msg:', data.msg);

    if (data.code === 0) {
      return NextResponse.json({ success: true });
    } else {
      // Surface the actual BingX error message in dev for easier debugging
      const devHint = process.env.NODE_ENV !== 'production' ? ` (BingX code: ${data.code}, msg: ${data.msg})` : '';
      console.warn(`[BingX] UID "${uid}" rejected — code: ${data.code}, msg: ${data.msg}`);
      return NextResponse.json({
        success: false,
        message: `Your UID is not in the list — try again later or text us.${devHint}`,
      });
    }
  } catch (err) {
    console.error('[BingX] referral check error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
