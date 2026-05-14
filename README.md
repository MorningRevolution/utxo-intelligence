# UTXO Intelligence

A thought experiment, not a product.

This is the prototype I built while learning to "vibecode": letting an AI
agent (Lovable) put a working UI together while I focused on what the
experience should feel like. The goal was never to ship a UTXO management
app. The goal was to spark a conversation about what one could look like if
it took regular Bitcoin holders seriously.

## What is UTXO management, and why does it matter?

Every Bitcoin transaction leaves a trail of "leftover change" called UTXOs
(Unspent Transaction Outputs). Most wallets hide them. Most users never see
them. But UTXOs are how Bitcoin actually works under the hood, and they
carry real consequences:

- **Privacy**: spending two UTXOs together permanently links them in public
  view, leaking information about who you are.
- **Cost**: smart UTXO selection can dramatically lower the fees you pay
  when sending Bitcoin.
- **Tax**: in most jurisdictions each UTXO carries its own cost basis,
  which matters at tax time.

Bitcoiners who care about these things use specialty wallets (Sparrow,
Specter, Wasabi) that surface UTXOs but assume technical fluency.
Everyone else flies blind.

## What I prototyped

The repo holds 12 routes exploring what a friendlier UTXO experience could
look like:

| Route | What I was exploring |
|---|---|
| Dashboard | A summary view of your full UTXO portfolio |
| UTXO Map | Visual layout of all your UTXOs by age, size, source |
| UTXO Table | Sortable, filterable detail view |
| Portfolio | Cost basis and unrealized gain or loss per UTXO |
| Risk Simulator | "What happens if I spend these together?" privacy preview |
| AI Assistant | Plain English UTXO coaching ("you should probably consolidate these three") |
| Tax Settings | FIFO vs LIFO vs HIFO selection per jurisdiction |
| Wallet Import | View only xpub import flow |
| Settings | The usual |
| Report Export | CSV or PDF for accountants |

## What I learned (and where this is going)

The exercise convinced me UTXO awareness belongs inside a broader Bitcoin
native finance app, not as a standalone tool. The categories the prototype
surfaced (privacy cost, tax basis, fee optimization) are exactly what a
sovereign Bitcoin holder needs at decision time, not as a separate
dashboard they have to remember to open.

That thinking now lives on inside a bigger project I'm building elsewhere.
This repo stays public as a record of the question that started it.

## Status

**Paused.** Not in development. No issues, no PRs, no support.

## License

Apache 2.0
