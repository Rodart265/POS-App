import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where
} from 'firebase/firestore'
import { auth, db } from '../../shared/firebase'
import { useAuth } from '../../shared/hooks/useAuth'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'mobile_money', label: 'Mobile Money' },
  { id: 'card', label: 'Card' }
]

const METHOD_LABEL = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  card: 'Card'
}

function formatMWK(amount) {
  return `MK ${Number(amount || 0).toLocaleString('en-US')}`
}

// An error whose message is safe to show to the cashier as it is.
class SaleError extends Error {}

// Runs inside a Firestore transaction: every product in the sale must still
// be active and have enough stock.
function checkLines(lines, snaps) {
  lines.forEach((line, i) => {
    const snap = snaps[i]
    if (!snap.exists() || snap.data().active !== true) {
      throw new SaleError(`${line.name} is no longer available.`)
    }
    const left = snap.data().stock || 0
    if (left < line.qty) {
      throw new SaleError(`Not enough stock for ${line.name} (${left} left).`)
    }
  })
}

// Runs inside a Firestore transaction: reduces stock and writes the stock log.
function deductStock(tx, lines, snaps, transactionId, userId) {
  lines.forEach((line, i) => {
    const snap = snaps[i]
    tx.update(snap.ref, {
      stock: (snap.data().stock || 0) - line.qty,
      updatedAt: serverTimestamp()
    })
    tx.set(doc(collection(db, 'stockLog')), {
      productId: line.id,
      productName: line.name,
      change: -line.qty,
      reason: 'sale',
      transactionId,
      userId,
      createdAt: serverTimestamp()
    })
  })
}

function timeOf(txn) {
  const date = txn.createdAt && txn.createdAt.toDate ? txn.createdAt.toDate() : null
  return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
}

export default function Checkout() {
  const { user, role, profile } = useAuth()
  const [products, setProducts] = useState(null) // null while loading
  const [pending, setPending] = useState([])
  const [cart, setCart] = useState([])
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState(null) // { kind: 'ok' | 'error', text }

  // Live product list (only products shown in checkout).
  useEffect(() => {
    const q = query(collection(db, 'products'), where('active', '==', true))
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => String(a.name).localeCompare(String(b.name)))
        setProducts(list)
      },
      () => {
        setProducts([])
        setMessage({ kind: 'error', text: 'Could not load products. Check your connection.' })
      }
    )
  }, [])

  // This cashier's sales that are still waiting for payment.
  useEffect(() => {
    if (!user) return undefined
    const q = query(
      collection(db, 'transactions'),
      where('cashierId', '==', user.uid),
      where('status', '==', 'pending_payment')
    )
    return onSnapshot(
      q,
      (snap) => setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setMessage({ kind: 'error', text: 'Could not load sales waiting for payment.' })
    )
  }, [user])

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.qty, 0),
    [cart]
  )

  function qtyInCart(productId) {
    const line = cart.find((l) => l.id === productId)
    return line ? line.qty : 0
  }

  function addItem(product) {
    setMessage(null)
    setCart((prev) => {
      const existing = prev.find((l) => l.id === product.id)
      const have = existing ? existing.qty : 0
      if (have + 1 > (product.stock || 0)) return prev
      if (existing) {
        return prev.map((l) => (l.id === product.id ? { ...l, qty: l.qty + 1 } : l))
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }]
    })
  }

  function removeLine(id) {
    setCart((prev) => prev.filter((l) => l.id !== id))
  }

  async function handlePay(methodId) {
    if (busy || cart.length === 0 || !user) return
    setBusy(true)
    setMessage(null)

    const lines = cart
    const sale = {
      items: lines.map((l) => ({
        productId: l.id,
        name: l.name,
        price: l.price,
        qty: l.qty
      })),
      total,
      method: methodId,
      cashierId: user.uid,
      cashierName: (profile && profile.name) || user.email || '',
      createdAt: serverTimestamp()
    }
    const txnRef = doc(collection(db, 'transactions'))

    try {
      if (methodId === 'cash') {
        // Cash is confirmed straight away: save the sale and reduce stock together.
        await runTransaction(db, async (tx) => {
          const snaps = await Promise.all(
            lines.map((l) => tx.get(doc(db, 'products', l.id)))
          )
          checkLines(lines, snaps)
          tx.set(txnRef, {
            ...sale,
            status: 'confirmed',
            confirmedAt: serverTimestamp(),
            confirmedBy: user.uid
          })
          deductStock(tx, lines, snaps, txnRef.id, user.uid)
        })
        setMessage({ kind: 'ok', text: `Sale saved: ${formatMWK(sale.total)} cash.` })
      } else {
        // Mobile money and card wait until the cashier confirms the payment.
        // Stock is reduced at that point.
        await runTransaction(db, async (tx) => {
          tx.set(txnRef, { ...sale, status: 'pending_payment' })
        })
        setMessage({
          kind: 'ok',
          text: 'Sale saved as waiting for payment. Confirm it below once the customer has paid.'
        })
      }
      setCart([])
    } catch (err) {
      setMessage({
        kind: 'error',
        text:
          err instanceof SaleError
            ? err.message
            : 'Could not save the sale. Check your connection and try again.'
      })
    } finally {
      setBusy(false)
    }
  }

  async function confirmPending(txn) {
    if (busyId || !user) return
    setBusyId(txn.id)
    setMessage(null)

    try {
      const txnRef = doc(db, 'transactions', txn.id)
      await runTransaction(db, async (tx) => {
        const txnSnap = await tx.get(txnRef)
        if (!txnSnap.exists() || txnSnap.data().status !== 'pending_payment') {
          throw new SaleError('This sale was already confirmed or cancelled.')
        }
        const lines = (txnSnap.data().items || []).map((i) => ({
          id: i.productId,
          name: i.name,
          qty: i.qty
        }))
        const snaps = await Promise.all(
          lines.map((l) => tx.get(doc(db, 'products', l.id)))
        )
        checkLines(lines, snaps)
        tx.update(txnRef, {
          status: 'confirmed',
          confirmedAt: serverTimestamp(),
          confirmedBy: user.uid
        })
        deductStock(tx, lines, snaps, txn.id, user.uid)
      })
      setMessage({ kind: 'ok', text: `Payment confirmed: ${formatMWK(txn.total)}.` })
    } catch (err) {
      setMessage({
        kind: 'error',
        text:
          err instanceof SaleError
            ? err.message
            : 'Could not confirm the payment. Check your connection and try again.'
      })
    } finally {
      setBusyId(null)
    }
  }

  const roleLabel = role === 'admin' ? 'Admin' : 'Cashier'

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 border-b border-ink/10 flex items-start justify-between">
        <div>
          <p className="font-display text-lg text-ink tracking-tight">Chikondi Store</p>
          <p className="font-body text-sm text-slate">
            {roleLabel}
            {profile && profile.name ? ` · ${profile.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {role === 'admin' && (
            <Link
              to="/admin"
              className="min-h-[44px] px-3 flex items-center font-body text-sm text-ink underline"
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => signOut(auth)}
            className="min-h-[44px] px-3 font-body text-sm text-ink underline"
          >
            Sign out
          </button>
        </div>
      </header>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mx-5 mt-4 px-3 py-3 rounded border font-body text-sm ${
            message.kind === 'error'
              ? 'border-signal text-signal'
              : 'border-mint text-ink'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Quick-add products */}
      <section className="px-5 pt-4 pb-2">
        <p className="font-body text-xs uppercase tracking-wide text-slate mb-2">
          Tap to add
        </p>
        {products === null && (
          <p className="font-body text-sm text-slate py-4">Loading products…</p>
        )}
        {products && products.length === 0 && (
          <p className="font-body text-sm text-slate py-4">
            No products yet.{' '}
            {role === 'admin'
              ? 'Open Admin, then Products, to add them.'
              : 'Ask an admin to add products.'}
          </p>
        )}
        {products && products.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {products.map((product) => {
              const left = (product.stock || 0) - qtyInCart(product.id)
              const unavailable = left <= 0
              return (
                <button
                  key={product.id}
                  onClick={() => addItem(product)}
                  disabled={unavailable}
                  className="text-left border border-ink/10 rounded px-3 py-3 active:bg-ink/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <p className="font-body text-sm text-ink">{product.name}</p>
                  <p className="font-mono font-tabular text-sm text-slate mt-1">
                    {formatMWK(product.price)}
                  </p>
                  <p
                    className={`font-body text-xs mt-1 ${
                      (product.stock || 0) <= 0 ? 'text-signal' : 'text-slate'
                    }`}
                  >
                    {(product.stock || 0) <= 0 ? 'Out of stock' : `${left} left`}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Sales waiting for payment */}
      {pending.length > 0 && (
        <section className="px-5 pt-4">
          <p className="font-body text-xs uppercase tracking-wide text-slate mb-2">
            Waiting for payment
          </p>
          <div className="space-y-2">
            {pending.map((txn) => (
              <div key={txn.id} className="border border-amber rounded px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-body text-sm text-ink">
                    {METHOD_LABEL[txn.method] || txn.method} · {(txn.items || []).length}{' '}
                    {(txn.items || []).length === 1 ? 'item' : 'items'}
                    {timeOf(txn) ? ` · ${timeOf(txn)}` : ''}
                  </p>
                  <p className="font-mono font-tabular text-sm text-ink">
                    {formatMWK(txn.total)}
                  </p>
                </div>
                <button
                  onClick={() => confirmPending(txn)}
                  disabled={busyId !== null}
                  className="mt-3 w-full min-h-[44px] bg-ink text-paper font-body font-medium text-sm rounded active:bg-ink-light transition-colors disabled:opacity-60"
                >
                  {busyId === txn.id ? 'Confirming…' : 'Confirm payment received'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

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
                    className="min-h-[44px] px-2 text-signal text-xs font-body underline"
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

        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.id}
              disabled={cart.length === 0 || busy}
              onClick={() => handlePay(pm.id)}
              className="bg-amber text-ink font-body font-medium text-sm py-3 min-h-[48px] rounded disabled:opacity-30 disabled:cursor-not-allowed active:bg-amber-dim transition-colors"
            >
              {pm.label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
