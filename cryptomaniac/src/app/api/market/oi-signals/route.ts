import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // Read latest OI signals from cache
    const { data, error } = await supabase
      .from('market_signals_cache')
      .select('signals, scanned, elapsed_ms, generated_at')
      .eq('signal_type', 'oi')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Market/OI] Cache read error:', error.message);
      return NextResponse.json({ signals: [], scanned: 0, elapsed_ms: 0, error: error.message });
    }

    if (!data) {
      return NextResponse.json({
        signals: [],
        scanned: 0,
        elapsed_ms: 0,
        cached: false,
        message: 'No cached signals yet. Trigger /api/market/refresh-signals to generate.',
      });
    }

    return NextResponse.json({
      signals: data.signals ?? [],
      scanned: data.scanned ?? 0,
      elapsed_ms: data.elapsed_ms ?? 0,
      cached: true,
      generated_at: data.generated_at,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Market/OI] GET handler error:', err?.message ?? err);
    return NextResponse.json({ error: `Internal server error: ${err?.message ?? 'unknown'}` }, { status: 500 });
  }
}
