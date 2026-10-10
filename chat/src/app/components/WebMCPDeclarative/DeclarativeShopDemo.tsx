import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getModelContext } from '../../services/modelContext';
import './declarativeShop.css';

// Declarative WebMCP: each <form toolname tooldescription> below IS a tool.
// There is no registerTool() call — Chrome registers the forms when they enter
// the DOM, derives the input schema from the fields, and unregisters them when
// they leave (verified on Chrome Canary 157). The only JavaScript the tools need
// is the submit handler that returns a result via SubmitEvent.respondWith().

interface Product {
  sku: string;
  name: string;
  category: 'audio' | 'peripherals' | 'displays';
  price: number;
}

const PRODUCTS: readonly Product[] = [
  { sku: 'hp-100', name: 'Studio Headphones', category: 'audio', price: 89 },
  { sku: 'sp-020', name: 'Pocket Speaker', category: 'audio', price: 39 },
  { sku: 'kb-310', name: 'Mechanical Keyboard', category: 'peripherals', price: 79 },
  { sku: 'ms-050', name: 'Wireless Mouse', category: 'peripherals', price: 29 },
  { sku: 'mn-270', name: '27" 4K Monitor', category: 'displays', price: 349 },
  { sku: 'mn-150', name: 'Portable 15" Monitor', category: 'displays', price: 129 },
];

const SEARCH_TOOL = 'searchProducts';
const CART_TOOL = 'addToCart';
const OUR_TOOLS = [SEARCH_TOOL, CART_TOOL];

/** The standalone, zero-JavaScript version of this example (served from src/assets). */
const STANDALONE_URL = '/assets/examples/declarative-webmcp.html';

interface CartLine {
  sku: string;
  quantity: number;
}

interface LogEntry {
  id: number;
  tool: string;
  by: 'agent' | 'person';
  input: Record<string, string | number>;
  response: unknown;
}

const filterProducts = (category: string, maxPrice: string): Product[] =>
  PRODUCTS.filter(
    (p) =>
      (category === 'all' || p.category === category) &&
      (maxPrice === 'any' || p.price <= Number(maxPrice)),
  );

const cartSummary = (lines: CartLine[]) => {
  const items = lines.map((l) => {
    const p = PRODUCTS.find((x) => x.sku === l.sku);
    return { sku: l.sku, name: p?.name ?? l.sku, quantity: l.quantity, price: p?.price ?? 0 };
  });
  return {
    items,
    totalItems: items.reduce((n, i) => n + i.quantity, 0),
    total: items.reduce((n, i) => n + i.quantity * i.price, 0),
  };
};

const panel =
  'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 transition-colors duration-200';
const fieldClass =
  'mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-400';
const submitClass =
  'wmd-submit rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800';
const toolTag =
  'inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 font-mono text-xs text-gray-700 dark:text-gray-300';

export const DeclarativeShopDemo: React.FC = () => {
  const [filters, setFilters] = useState({ category: 'all', maxPrice: 'any' });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tools, setTools] = useState<ModelContextToolInfo[]>([]);
  const [webmcpReady, setWebmcpReady] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  const [agentReceived, setAgentReceived] = useState<{ tool: string; value: string } | null>(null);
  const logId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const pushLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    logId.current += 1;
    const next = { ...entry, id: logId.current };
    setLog((prev) => [next, ...prev].slice(0, 6));
  }, []);

  // "What the agent sees": ask the browser for the tools it registered from the
  // forms below. Registration is asynchronous, so re-read on every `toolchange`.
  useEffect(() => {
    const mc = getModelContext();
    if (!mc || typeof mc.getTools !== 'function') return;
    setWebmcpReady(true);
    let cancelled = false;
    const refresh = (): void => {
      mc.getTools?.()
        .then((all) => {
          if (!cancelled) setTools(all.filter((t) => OUR_TOOLS.includes(t.name)));
        })
        .catch(() => {
          /* listing is best-effort; the forms still work */
        });
    };
    refresh();
    mc.addEventListener('toolchange', refresh);
    return () => {
      cancelled = true;
      mc.removeEventListener('toolchange', refresh);
    };
  }, []);

  // Tool 1 — searchProducts (toolautosubmit: the agent fills AND submits).
  const handleSearch = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault(); // stay on the page (no navigation)
    const data = new FormData(e.currentTarget);
    const category = String(data.get('category') ?? 'all');
    const maxPrice = String(data.get('maxPrice') ?? 'any');
    const results = filterProducts(category, maxPrice);
    setFilters({ category, maxPrice });

    const response = {
      category,
      maxPrice,
      count: results.length,
      results: results.map(({ sku, name, category: c, price }) => ({ sku, name, category: c, price })),
    };
    const submit = e.nativeEvent as SubmitEvent;
    // respondWith() must be called synchronously, during the submit event.
    if (submit.agentInvoked) submit.respondWith?.(Promise.resolve(response));
    pushLog({
      tool: SEARCH_TOOL,
      by: submit.agentInvoked ? 'agent' : 'person',
      input: { category, maxPrice },
      response,
    });
  };

  // Tool 2 — addToCart (no toolautosubmit: the agent fills, the person confirms).
  const handleAdd = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const sku = String(data.get('sku') ?? '');
    const quantity = Number(data.get('quantity'));
    const submit = e.nativeEvent as SubmitEvent;
    const by = submit.agentInvoked ? 'agent' : 'person';
    const product = PRODUCTS.find((p) => p.sku === sku);

    // Chrome already rejects agent input that fails the form's constraints
    // (unknown option, out of min/max, missing required). This check is defense
    // in depth — the same one a real backend would do.
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      const response = { error: 'Pick a listed SKU and a whole quantity from 1 to 10.' };
      if (submit.agentInvoked) submit.respondWith?.(Promise.resolve(response));
      pushLog({ tool: CART_TOOL, by, input: { sku, quantity }, response });
      return;
    }

    const existing = cart.find((l) => l.sku === sku);
    const nextCart = existing
      ? cart.map((l) => (l.sku === sku ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l))
      : [...cart, { sku, quantity }];
    setCart(nextCart);

    const response = { added: { sku, name: product.name, quantity }, cart: cartSummary(nextCart) };
    if (submit.agentInvoked) submit.respondWith?.(Promise.resolve(response));
    pushLog({ tool: CART_TOOL, by, input: { sku, quantity }, response });
  };

  // Run a tool exactly as an agent would — through the browser, not our handlers.
  const runAsAgent = async (toolName: string, input: Record<string, string | number>): Promise<void> => {
    const mc = getModelContext();
    if (!mc?.getTools || !mc.executeTool) return;
    setAgentReceived(null);
    setPendingTool(toolName);
    try {
      const tool = (await mc.getTools()).find((t) => t.name === toolName);
      if (!tool) throw new Error(`${toolName} is not registered`);
      const value = await mc.executeTool(tool, input);
      if (mounted.current) setAgentReceived({ tool: toolName, value: value ?? 'null' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (mounted.current) setAgentReceived({ tool: toolName, value: `Error: ${message}` });
    } finally {
      if (mounted.current) setPendingTool(null);
    }
  };

  const visible = filterProducts(filters.category, filters.maxPrice);
  const summary = cartSummary(cart);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <section className={panel}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Declarative WebMCP: the form is the tool
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Add <code className="font-mono">toolname</code> and <code className="font-mono">tooldescription</code> to a
          plain HTML <code className="font-mono">&lt;form&gt;</code> and Chrome exposes it to AI agents. There is no{' '}
          <code className="font-mono">registerTool()</code> call: the browser builds the input schema from the fields.
          The two forms below are live tools on this page.
        </p>
        <p className="mt-3 text-sm">
          <a
            href={STANDALONE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            Open the zero-JavaScript version of this example ↗
          </a>
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: the shop — two declarative tools + what they act on */}
        <div className="lg:col-span-7 space-y-6">
          <form
            className={`wmd-form ${panel}`}
            toolname={SEARCH_TOOL}
            tooldescription="Search the Gadget Shop catalog by category and maximum price. Returns the matching products with SKU, name, category and price."
            toolautosubmit=""
            onSubmit={handleSearch}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className={toolTag}>{SEARCH_TOOL}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">toolautosubmit · agent submits</span>
            </div>
            <p className="wmd-agent-note mb-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              An agent is using this form.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <label className={labelClass}>
                Category
                <select
                  name="category"
                  defaultValue="all"
                  required
                  className={fieldClass}
                  toolparamdescription="Product category to search. Use 'all' for every category."
                >
                  <option value="all">All categories</option>
                  <option value="audio">Audio</option>
                  <option value="peripherals">Peripherals</option>
                  <option value="displays">Displays</option>
                </select>
              </label>
              <label className={labelClass}>
                Max price
                <select
                  name="maxPrice"
                  defaultValue="any"
                  className={fieldClass}
                  toolparamdescription="Maximum price in US dollars. Use 'any' for no limit."
                >
                  <option value="any">Any price</option>
                  <option value="50">Up to $50</option>
                  <option value="100">Up to $100</option>
                  <option value="200">Up to $200</option>
                </select>
              </label>
              <button type="submit" className={submitClass}>
                Search
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-live="polite">
            {visible.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No products match that category and price.</p>
            ) : (
              visible.map((p) => (
                <article key={p.sku} className={panel}>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    SKU {p.sku} · {p.category}
                  </p>
                  <p className="mt-2 font-bold text-gray-900 dark:text-white">${p.price}</p>
                </article>
              ))
            )}
          </div>

          <form
            className={`wmd-form ${panel}`}
            toolname={CART_TOOL}
            tooldescription="Add a product to the shopping cart by SKU, with a quantity from 1 to 10. The person confirms before it is added."
            onSubmit={handleAdd}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className={toolTag}>{CART_TOOL}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">no toolautosubmit · you confirm</span>
            </div>
            <p className="wmd-agent-note mb-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              An agent filled this form. Check it, then press Add to cart.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-3 items-end">
              <label className={labelClass}>
                Product
                <select
                  name="sku"
                  defaultValue="hp-100"
                  required
                  className={fieldClass}
                  toolparamdescription="The product to add, identified by its SKU."
                >
                  {PRODUCTS.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} — ${p.price}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Quantity
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  max={10}
                  defaultValue={1}
                  required
                  className={fieldClass}
                  toolparamdescription="How many units to add, from 1 to 10."
                />
              </label>
              <button type="submit" className={submitClass}>
                Add to cart
              </button>
            </div>
          </form>

          <section className={panel} aria-live="polite">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Cart</h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Clear
                </button>
              )}
            </div>
            {cart.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Empty. Nothing is stored — this is a demo.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {summary.items.map((i) => (
                  <li key={i.sku} className="flex justify-between">
                    <span>
                      {i.quantity} × {i.name}
                    </span>
                    <span>${i.quantity * i.price}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 font-semibold text-gray-900 dark:text-white">
                  <span>{summary.totalItems} items</span>
                  <span>${summary.total}</span>
                </li>
              </ul>
            )}
          </section>
        </div>

        {/* RIGHT: what the browser exposes, and agent calls */}
        <aside className="lg:col-span-5 space-y-6">
          <section className={panel}>
            <h3 className="font-semibold text-gray-900 dark:text-white">What the agent sees</h3>
            {!webmcpReady ? (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                WebMCP isn&apos;t enabled in this browser, so no tools are registered. The forms still work for people.
              </p>
            ) : tools.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Waiting for the browser to register the forms…</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Read live from <code className="font-mono">document.modelContext.getTools()</code>. Chrome generated
                  these schemas from the HTML.
                </p>
                <div className="mt-3 space-y-2">
                  {tools.map((t) => (
                    <details key={t.name} className="rounded-lg border border-gray-200 dark:border-gray-700">
                      <summary className="cursor-pointer px-3 py-2 text-sm">
                        <span className={toolTag}>{t.name}</span>
                      </summary>
                      <p className="px-3 text-xs text-gray-600 dark:text-gray-300">{t.description}</p>
                      <pre className="m-3 max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
                        {JSON.stringify(t.inputSchema, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              </>
            )}
          </section>

          {webmcpReady && (
            <section className={panel}>
              <h3 className="font-semibold text-gray-900 dark:text-white">Try it as an agent</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Calls <code className="font-mono">document.modelContext.executeTool()</code>, the same path an agent uses.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={pendingTool !== null || tools.length === 0}
                  onClick={() => runAsAgent(SEARCH_TOOL, { category: 'audio', maxPrice: '100' })}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  searchProducts — audio up to $100
                </button>
                <button
                  type="button"
                  disabled={pendingTool !== null || tools.length === 0}
                  onClick={() => runAsAgent(CART_TOOL, { sku: 'kb-310', quantity: 2 })}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  addToCart — 2 × Mechanical Keyboard
                </button>
              </div>
              {pendingTool === CART_TOOL && (
                <p className="mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  The agent filled the cart form. Press Add to cart to confirm — the call waits for you.
                </p>
              )}
              {pendingTool === SEARCH_TOOL && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Running searchProducts…</p>
              )}
              {agentReceived && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    The agent received from <span className="font-mono">{agentReceived.tool}</span>:
                  </p>
                  <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
                    {agentReceived.value}
                  </pre>
                </div>
              )}
            </section>
          )}

          <section className={panel}>
            <h3 className="font-semibold text-gray-900 dark:text-white">Tool call log</h3>
            {log.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Submit a form, or let an agent do it. Each entry shows who submitted and what the page returned.
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {log.map((entry) => (
                  <li key={entry.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className={toolTag}>{entry.tool}</span>
                      <span
                        className={
                          entry.by === 'agent'
                            ? 'rounded bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 font-medium text-indigo-700 dark:text-indigo-300'
                            : 'rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-medium text-gray-600 dark:text-gray-300'
                        }
                      >
                        {entry.by === 'agent' ? 'agentInvoked' : 'person'}
                      </span>
                    </div>
                    <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-gray-100 dark:bg-gray-900 p-2 text-gray-800 dark:text-gray-200">
                      {JSON.stringify({ input: entry.input, response: entry.response }, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DeclarativeShopDemo;
