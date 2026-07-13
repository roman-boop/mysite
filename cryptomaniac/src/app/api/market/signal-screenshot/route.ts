import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET: fetch screenshots for a signal type + symbol
export async function GET(request: Request) {
  const url = new URL(request.url);
  const signal_type = url.searchParams.get('signal_type');
  const symbol = url.searchParams.get('symbol');

  if (!signal_type || !symbol) {
    return NextResponse.json({ error: 'signal_type and symbol are required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('signal_screenshots')
    .select('id, screenshot_url, created_at')
    .eq('signal_type', signal_type)
    .eq('symbol', symbol)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ screenshot: data ?? null });
}

// POST: save a screenshot URL for a signal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signal_type, symbol, screenshot_url } = body;

    if (!signal_type || !symbol || !screenshot_url) {
      return NextResponse.json({ error: 'signal_type, symbol, and screenshot_url are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Delete existing screenshot for this signal (one per signal)
    await supabase
      .from('signal_screenshots')
      .delete()
      .eq('signal_type', signal_type)
      .eq('symbol', symbol);

    const { data, error } = await supabase
      .from('signal_screenshots')
      .insert({ signal_type, symbol, screenshot_url })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ screenshot: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

// DELETE: remove a screenshot
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const signal_type = url.searchParams.get('signal_type');
  const symbol = url.searchParams.get('symbol');

  if (!signal_type || !symbol) {
    return NextResponse.json({ error: 'signal_type and symbol are required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('signal_screenshots')
    .delete()
    .eq('signal_type', signal_type)
    .eq('symbol', symbol);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
