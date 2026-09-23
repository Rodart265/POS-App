import { useState, useMemo } from 'react'

// TODO: replace with a live Firestore query (onSnapshot on `products`)
const SAMPLE_PRODUCTS = [
  { id: 'p1', name: 'Cooking oil 1L', price: 4500 },
  { id: 'p2', name: 'Sugar 1kg', price: 1800 },
  { id: 'p3', name: 'Soap bar', price: 900 },
  { id: 'p4', name: 'Rice 2kg', price: 3200 },
  { id: 'p5', name: 'Maize flour 5kg', price: 6100 },
  { id: 'p6', name: 'Salt 500g', price: 600 }
]

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'mobile_money', label: 'Mobile Money' },
  { id: 'card', label: 'Card' }
]

function formatMWK(amount) {
  return `MK ${amount.toLocaleString('en-US')}`
}

export default function Checkout() {
  const [cart, setCart] = useState([])
  const [method, setMethod] = useState(null)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.qty, 0),
    [cart]
  )

  function addItem(product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === product.id)
      if (existing) {
        return prev.map((l) =>
          l.id === product.id ? { ...l, qty: l.qty + 1 } : l
        )
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  function removeLine(id) {
    setCart((prev) => prev.filter((l) => l.id !== id))
  }

  function startPayment(methodId) {
    setMethod(methodId)
    if (methodId === 'cash') {
      // Cash is confirmed immediately — no external verification needed.
      setAwaitingConfirm(false)
      // TODO: write transaction with status "confirmed"
    } else {
      // Mobile money / card go into pending_payment until the cashier
      // visually confirms the customer's payment notification (Phase A).
      setAwaitingConfirm(true)
      // TODO: write transaction with status "pending_payment"
    }
  }

  function confirmPaymentReceived() {
    setAwaitingConfirm(false)
    // TODO: update transaction status to "confirmed", deduct stock,
    // write stockLog entries, clear cart
    setCart([])
    setMethod(null)
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 border-b border-ink/10">
        <p className="font-display text-lg text-ink tracking-tight">Chikondi Store</p>
        <p className="font-body text-sm text-slate">Cashier · Mercy Banda</p>
      </header>

      {/* Quick-add products */}
      <section className="px-5 pt-4 pb-2">
        <p className="font-body text-xs uppercase tracking-wide text-slate mb-2">
          Tap to add
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_PRODUCTS.map((product) => (
            <button
              key={product.id}
              onClick={() => addItem(product)}
              className="text-left border border-ink/10 rounded px-3 py-3 active:bg-ink/5 transition-colors"
            >
              <p className="font-body text-sm text-ink">{product.name}</p>
              <p className="font-mono font-tabular text-sm text-slate mt-1">
                {formatMWK(product.price)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Cart ledger */}
      <section className="flex-1 px-5 pt-4">
        <p className="font-body text-xs uppercase tracking-wide text-slate mb-2">
          Current sale
        </p>
        {cart.length === 0 ? (
          <p className="font-body text-sm text-slate py-6 text-center">
            No items yet — tap a product above to start the sale.
          </p>
        ) : (
          <div className="divide-y divide-ink/10 border-t border-ink/10">
            {cart.map((line) => (
              <div key={line.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-body text-sm text-ink">{line.name}</p>
                  <p className="font-mono font-tabular text-xs text-slate">
                    {line.qty} × {formatMWK(line.price)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono font-tabular text-sm text-ink">
                    {formatMWK(line.price * line.qty)}
                  </p>
                  <button
                    onClick={() => removeLine(line.id)}
                    className="text-signal text-xs font-body underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Total + payment */}
      <footer className="px-5 pb-6 pt-4 border-t border-ink/10 bg-paper-dim">
        <div className="flex items-baseline justify-between mb-4">
          <p className="font-body text-sm text-slate">Total</p>
          <p className="font-display font-tabular text-3xl text-ink">
            {formatMWK(total)}
          </p>
        </div>

        {awaitingConfirm ? (
          <div className="border border-amber rounded px-4 py-4">
            <p className="font-body text-sm text-ink mb-3">
              Waiting for customer's {method === 'card' ? 'card' : 'mobile money'} confirmation.
            </p>
            <button
              onClick={confirmPaymentReceived}
              className="w-full bg-ink text-paper font-body font-medium text-sm py-3 rounded active:bg-ink-light transition-colors"
            >
              Confirm payment received
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.id}
                disabled={cart.length === 0}
                onClick={() => startPayment(pm.id)}
                className="bg-amber text-ink font-body font-medium text-sm py-3 rounded disabled:opacity-30 disabled:cursor-not-allowed active:bg-amber-dim transition-colors"
              >
                {pm.label}
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  )
}
