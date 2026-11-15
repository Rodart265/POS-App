import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../../shared/firebase'
import { useAuth } from '../../shared/hooks/useAuth'

function formatMWK(amount) {
  return `MK ${Number(amount || 0).toLocaleString('en-US')}`
}

function ProductForm({ product, userId, onClose }) {
  const isNew = !product
  const [name, setName] = useState(product ? product.name : '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [stock, setStock] = useState(product ? String(product.stock ?? 0) : '')
  const [active, setActive] = useState(product ? product.active !== false : true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    const priceText = price.trim()
    const stockText = stock.trim()
    const priceNum = Number(priceText)
    const stockNum = Number(stockText)

    if (!name.trim()) return setError('Enter the product name.')
    if (priceText === '' || !Number.isInteger(priceNum) || priceNum <= 0) {
      return setError('Price must be a whole number above 0.')
    }
    if (stockText === '' || !Number.isInteger(stockNum) || stockNum < 0) {
      return setError('Stock must be a whole number, 0 or more.')
    }

    setSaving(true)
    try {
      const batch = writeBatch(db)
      const ref = isNew ? doc(collection(db, 'products')) : doc(db, 'products', product.id)
      const data = {
        name: name.trim(),
        price: priceNum,
        stock: stockNum,
        active,
        updatedAt: serverTimestamp()
      }

      if (isNew) {
        batch.set(ref, { ...data, createdAt: serverTimestamp() })
      } else {
        batch.update(ref, data)
      }

      // Every stock change made here is written to the stock log.
      const oldStock = isNew ? 0 : product.stock || 0
      if (stockNum !== oldStock) {
        batch.set(doc(collection(db, 'stockLog')), {
          productId: ref.id,
          productName: data.name,
          change: stockNum - oldStock,
          reason: isNew ? 'initial_stock' : 'admin_adjustment',
          userId,
          createdAt: serverTimestamp()
        })
      }

      await batch.commit()
      onClose()
    } catch (err) {
      setError('Could not save. Check your connection and try again.')
      setSaving(false)
    }
  }

  const inputClass =
    'w-full min-h-[44px] px-3 rounded border border-ink/20 bg-white font-body text-ink'

  return (
    <form onSubmit={handleSave} className="border border-ink/10 rounded px-5 py-5 mb-6 bg-paper-dim">
      <p className="font-display text-lg text-ink tracking-tight mb-4">
        {isNew ? 'Add product' : 'Edit product'}
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <label htmlFor="p-name" className="block font-body text-sm text-ink mb-1">
            Name
          </label>
          <input
            id="p-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="p-price" className="block font-body text-sm text-ink mb-1">
            Price (MK)
          </label>
          <input
            id="p-price"
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="p-stock" className="block font-body text-sm text-ink mb-1">
            Stock
          </label>
          <input
            id="p-stock"
            type="text"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 min-h-[44px] font-body text-sm text-ink">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5"
            />
            Show in checkout
          </label>
        </div>
      </div>

      {error && (
        <p className="font-body text-sm text-signal mt-4" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-5">
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-6 rounded bg-ink text-paper font-body font-medium text-sm active:bg-ink-light disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="min-h-[44px] px-6 rounded border border-ink/20 font-body text-sm text-ink active:bg-ink/5"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState(null) // null while loading
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | a product

  useEffect(() => {
    return onSnapshot(
      collection(db, 'products'),
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoadError('')
      },
      () => setLoadError('Could not load products. Check your connection and the security rules.')
    )
  }, [])

  const sorted = useMemo(() => {
    if (!products) return []
    return [...products].sort((a, b) => {
      const aHidden = a.active === false ? 1 : 0
      const bHidden = b.active === false ? 1 : 0
      if (aHidden !== bHidden) return aHidden - bHidden
      return String(a.name).localeCompare(String(b.name))
    })
  }, [products])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-body text-sm text-slate">
          {products ? `${products.length} product${products.length === 1 ? '' : 's'}` : 'Loading…'}
        </p>
        {!editing && (
          <button
            onClick={() => setEditing('new')}
            className="min-h-[44px] px-5 rounded bg-amber text-ink font-body font-medium text-sm active:bg-amber-dim"
          >
            Add product
          </button>
        )}
      </div>

      {editing && (
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          userId={user ? user.uid : ''}
          onClose={() => setEditing(null)}
        />
      )}

      {loadError && (
        <p className="font-body text-sm text-signal mb-4" role="alert">
          {loadError}
        </p>
      )}

      {products && products.length === 0 && !loadError && (
        <p className="font-body text-sm text-slate py-8 text-center">
          No products yet. Tap "Add product" to add your first one.
        </p>
      )}

      {sorted.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="text-left font-body text-xs text-slate font-medium py-2">Product</th>
              <th className="text-right font-body text-xs text-slate font-medium py-2">Price</th>
              <th className="text-right font-body text-xs text-slate font-medium py-2">Stock</th>
              <th className="text-right font-body text-xs text-slate font-medium py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {sorted.map((p) => (
              <tr key={p.id}>
                <td className="font-body text-sm text-ink py-3">{p.name}</td>
                <td className="font-mono font-tabular text-sm text-ink py-3 text-right">
                  {formatMWK(p.price)}
                </td>
                <td
                  className={`font-mono font-tabular text-sm py-3 text-right ${
                    (p.stock || 0) <= 0 ? 'text-signal' : 'text-ink'
                  }`}
                >
                  {p.stock || 0}
                </td>
                <td
                  className={`font-body text-sm py-3 text-right ${
                    p.active === false ? 'text-slate' : 'text-mint'
                  }`}
                >
                  {p.active === false ? 'Hidden' : 'Active'}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => setEditing(p)}
                    className="min-h-[44px] px-3 font-body text-sm text-ink underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
