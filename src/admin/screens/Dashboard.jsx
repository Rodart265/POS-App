import { useState } from 'react'

// TODO: replace with live Firestore aggregation queries
const TODAY_SUMMARY = {
  sales: 284600,
  transactions: 47,
  voided: 2
}

const RECENT_TRANSACTIONS = [
  { id: 'TXN-2201', time: '14:32', cashier: 'Mercy Banda', method: 'Cash', amount: 6100, status: 'confirmed' },
  { id: 'TXN-2200', time: '14:18', cashier: 'Mercy Banda', method: 'Mobile Money', amount: 12400, status: 'confirmed' },
  { id: 'TXN-2199', time: '13:57', cashier: 'James Phiri', method: 'Card', amount: 3200, status: 'pending_payment' },
  { id: 'TXN-2198', time: '13:40', cashier: 'James Phiri', method: 'Cash', amount: 900, status: 'confirmed' },
  { id: 'TXN-2197', time: '13:12', cashier: 'Mercy Banda', method: 'Mobile Money', amount: 18000, status: 'voided' }
]

const NAV_ITEMS = ['Overview', 'Products', 'Stock', 'Staff', 'Reports', 'Audit log']

function formatMWK(amount) {
  return `MK ${amount.toLocaleString('en-US')}`
}

const STATUS_STYLE = {
  confirmed: 'text-mint',
  pending_payment: 'text-amber-dim',
  voided: 'text-signal'
}

const STATUS_LABEL = {
  confirmed: 'Confirmed',
  pending_payment: 'Pending',
  voided: 'Voided'
}

export default function Dashboard() {
  const [active, setActive] = useState('Overview')

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar */}
      <aside className="w-56 bg-ink text-paper flex flex-col shrink-0">
        <div className="px-5 py-6">
          <p className="font-display text-lg tracking-tight">Chikondi Store</p>
          <p className="font-body text-xs text-slate-light mt-1">Admin</p>
        </div>
        <nav className="flex-1 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`w-full text-left px-3 py-2.5 rounded font-body text-sm transition-colors ${
                active === item
                  ? 'bg-ink-dim text-paper'
                  : 'text-slate-light hover:text-paper'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-8 max-w-5xl">
        <h1 className="font-display text-2xl text-ink tracking-tight mb-6">{active}</h1>

        {/* Summary ledger row */}
        <div className="grid grid-cols-3 border-t border-ink/10">
          <div className="border-b border-r border-ink/10 py-4 pr-6">
            <p className="font-body text-xs uppercase tracking-wide text-slate">Today's sales</p>
            <p className="font-mono font-tabular text-2xl text-ink mt-1">
              {formatMWK(TODAY_SUMMARY.sales)}
            </p>
          </div>
          <div className="border-b border-r border-ink/10 py-4 px-6">
            <p className="font-body text-xs uppercase tracking-wide text-slate">Transactions</p>
            <p className="font-mono font-tabular text-2xl text-ink mt-1">
              {TODAY_SUMMARY.transactions}
            </p>
          </div>
          <div className="border-b border-ink/10 py-4 pl-6">
            <p className="font-body text-xs uppercase tracking-wide text-slate">Voided</p>
            <p className="font-mono font-tabular text-2xl text-signal mt-1">
              {TODAY_SUMMARY.voided}
            </p>
          </div>
        </div>

        {/* Transaction ledger */}
        <div className="mt-8">
          <p className="font-body text-xs uppercase tracking-wide text-slate mb-2">
            Recent transactions
          </p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="text-left font-body text-xs text-slate font-medium py-2">ID</th>
                <th className="text-left font-body text-xs text-slate font-medium py-2">Time</th>
                <th className="text-left font-body text-xs text-slate font-medium py-2">Cashier</th>
                <th className="text-left font-body text-xs text-slate font-medium py-2">Method</th>
                <th className="text-right font-body text-xs text-slate font-medium py-2">Amount</th>
                <th className="text-right font-body text-xs text-slate font-medium py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {RECENT_TRANSACTIONS.map((txn) => (
                <tr key={txn.id}>
                  <td className="font-mono text-xs text-ink py-3">{txn.id}</td>
                  <td className="font-body text-sm text-slate py-3">{txn.time}</td>
                  <td className="font-body text-sm text-ink py-3">{txn.cashier}</td>
                  <td className="font-body text-sm text-slate py-3">{txn.method}</td>
                  <td className="font-mono font-tabular text-sm text-ink py-3 text-right">
                    {formatMWK(txn.amount)}
                  </td>
                  <td className={`font-body text-sm py-3 text-right ${STATUS_STYLE[txn.status]}`}>
                    {STATUS_LABEL[txn.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
