// Market quote edge function
// Fetches quote data with a 15-minute cache in market_quotes_cache.
// Provider abstraction — default: brapi (public). Swap via MARKET_DATA_PROVIDER.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CACHE_TTL_MS = 15 * 60 * 1000;

interface Quote {
  ticker: string;
  name?: string | null;
  price?: number | null;
  last_dividend?: number | null;
  dividend_yield?: number | null;
  segment?: string | null;
  liquidity?: number | null;
  com_date?: string | null;
  pay_date?: string | null;
  patrimonial_value?: number | null;
  provider?: string | null;
  updated_at?: string;
  available: boolean;
}

async function fetchFromBrapi(ticker: string): Promise<Quote> {
  const token = Deno.env.get("BRAPI_TOKEN");
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?fundamental=false&dividends=true${token ? `&token=${token}` : ""}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return { ticker, available: false, provider: "brapi" };
    const j = await r.json();
    const res = j?.results?.[0];
    if (!res) return { ticker, available: false, provider: "brapi" };
    const divs = res?.dividendsData?.cashDividends ?? [];
    const last = divs?.[0];
    const price = res.regularMarketPrice ?? null;

    // Dividend yield: sum of cash dividends paid in the last 12 months / current price.
    let dividendYield: number | null = null;
    if (price && price > 0 && Array.isArray(divs) && divs.length > 0) {
      const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const sum12m = divs.reduce((acc: number, d: any) => {
        const dateStr = d?.paymentDate ?? d?.lastDatePrior;
        const ts = dateStr ? new Date(dateStr).getTime() : NaN;
        const rate = Number(d?.rate);
        if (!Number.isFinite(ts) || !Number.isFinite(rate)) return acc;
        return ts >= cutoff ? acc + rate : acc;
      }, 0);
      if (sum12m > 0) dividendYield = Number(((sum12m / price) * 100).toFixed(2));
    }

    return {
      ticker,
      name: res.longName ?? res.shortName ?? null,
      price,
      last_dividend: last?.rate ?? null,
      dividend_yield: dividendYield,
      segment: res.sector ?? null,
      liquidity: res.regularMarketVolume ?? null,
      com_date: last?.lastDatePrior ?? null,
      pay_date: last?.paymentDate ?? null,
      patrimonial_value: null,
      provider: "brapi",
      available: true,
    };
  } catch (_e) {
    return { ticker, available: false, provider: "brapi" };
  }
}

async function fetchProvider(ticker: string): Promise<Quote> {
  const provider = (Deno.env.get("MARKET_DATA_PROVIDER") ?? "brapi").toLowerCase();
  if (provider === "brapi") return fetchFromBrapi(ticker);
  // Future providers plug in here.
  return fetchFromBrapi(ticker);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const rawTickers: string[] = body.tickers ?? (body.ticker ? [body.ticker] : []);
    const tickers = rawTickers.map((t) => String(t || "").trim().toUpperCase()).filter(Boolean);
    if (tickers.length === 0) {
      return new Response(JSON.stringify({ error: "ticker required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = Date.now();
    const { data: cached } = await supabase
      .from("market_quotes_cache")
      .select("*")
      .in("ticker", tickers);

    const cacheMap = new Map<string, any>();
    (cached ?? []).forEach((c) => cacheMap.set(c.ticker, c));

    const out: Quote[] = [];
    for (const t of tickers) {
      const c = cacheMap.get(t);
      const fresh = c && (now - new Date(c.updated_at).getTime()) < CACHE_TTL_MS;
      if (fresh) {
        out.push({ ...c, available: c.price != null });
        continue;
      }
      const q = await fetchProvider(t);
      if (q.available) {
        const row = {
          ticker: t,
          name: q.name ?? null,
          price: q.price ?? null,
          last_dividend: q.last_dividend ?? null,
          dividend_yield: q.dividend_yield ?? null,
          segment: q.segment ?? null,
          liquidity: q.liquidity ?? null,
          com_date: q.com_date ?? null,
          pay_date: q.pay_date ?? null,
          patrimonial_value: q.patrimonial_value ?? null,
          provider: q.provider ?? null,
          updated_at: new Date().toISOString(),
        };
        await supabase.from("market_quotes_cache").upsert(row);
        out.push({ ...row, available: true });
      } else if (c) {
        // fallback to stale cache
        out.push({ ...c, available: c.price != null });
      } else {
        out.push(q);
      }
    }

    return new Response(JSON.stringify({ quotes: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("market-quote error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
