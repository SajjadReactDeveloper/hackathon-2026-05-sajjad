import Link from 'next/link';

const FEATURES = [
  {
    icon: '🌐',
    title: 'Language-Mirrored AI',
    desc: 'Urdu in, Urdu out. English in, English out. Roman Urdu voice notes get a voice reply back — in your own cloned voice.',
  },
  {
    icon: '🎙',
    title: 'Voice Note to Order',
    desc: 'Customer sends a voice note. Whisper transcribes it. AI parses the items, address, and quantity into a real order row — no manual entry.',
  },
  {
    icon: '📸',
    title: 'Image to Order',
    desc: 'Customer sends a photo of dresses on a hanger. GPT-4o Vision reads the items. Order created in seconds.',
  },
  {
    icon: '🧠',
    title: 'Three-Layer Memory',
    desc: 'Recent conversation context, extracted customer facts (sizes, preferences, past complaints), and your uploaded knowledge base — all injected at reply time.',
  },
  {
    icon: '🛡',
    title: 'COD Fraud Scoring',
    desc: 'Every order gets a 0–100 fraud risk score based on contact history, order value, address quality, and recency signals.',
  },
  {
    icon: '💡',
    title: 'Lost Sale Detection',
    desc: 'AI identifies stale threads with buying intent and no order. Explains exactly why the sale was lost and suggests a recovery message.',
  },
  {
    icon: '🔧',
    title: 'Tool-Calling AI',
    desc: 'The LLM cannot hallucinate product prices or stock. It calls typed functions that query your DB in real time — structurally grounded.',
  },
  {
    icon: '⚡',
    title: 'Auto Rules + Flows',
    desc: 'Keyword-triggered rules run before the AI. Visual flow builder for complex automations. Demo-ready today.',
  },
];

const STATS = [
  { value: '< 10s', label: 'Voice note to order' },
  { value: '3-layer', label: 'Customer memory' },
  { value: '8 tools', label: 'Grounded AI calls' },
  { value: '0-100', label: 'COD fraud score' },
];

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-bold text-lg tracking-tight">FlowChat</span>
          <span className="text-xs text-green-400 font-semibold bg-green-400/10 px-2 py-0.5 rounded-full ml-1">
            Revenue Brain
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-green-500 hover:bg-green-400 transition-colors text-white px-5 py-2 rounded-lg"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-sm text-green-400 font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Built for Pakistani WhatsApp sellers
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Turn WhatsApp chaos into a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
            real business
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI that replies in Urdu, English, or Roman Urdu. Converts voice notes and product
          photos into orders automatically. Scores COD fraud. Explains lost sales. All inside
          WhatsApp — no app install for your customers.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 transition-colors text-white font-semibold px-7 py-3.5 rounded-xl text-base shadow-lg shadow-green-500/25"
          >
            Start free trial
            <span className="text-lg">&#8594;</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors text-white font-semibold px-7 py-3.5 rounded-xl text-base border border-white/10"
          >
            Sign in to dashboard
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-white tracking-tight">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-4 tracking-tight">
          Eight reasons sellers switch to FlowChat
        </h2>
        <p className="text-slate-500 text-center mb-14 max-w-xl mx-auto">
          Not a generic chatbot. A business cockpit built specifically for Pakistan&apos;s WhatsApp
          commerce.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-green-500/30 hover:bg-white/[0.05] transition-all"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-8 pb-24">
        <div className="relative bg-gradient-to-br from-green-900/40 to-emerald-900/20 border border-green-500/20 rounded-3xl p-10 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/20 via-transparent to-transparent pointer-events-none" />
          <h2 className="text-3xl font-extrabold mb-4 relative">Ready to see it live?</h2>
          <p className="text-slate-400 mb-8 relative max-w-md mx-auto">
            Send a voice note in Roman Urdu and watch it become an order with a fraud score
            in under 10 seconds.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 transition-colors text-white font-semibold px-8 py-4 rounded-xl text-base shadow-xl shadow-green-500/30 relative"
          >
            Create your account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-8 text-center text-sm text-slate-600">
        FlowChat v1.0 &mdash; Revenue Brain &mdash; ChainGPT Hackathon 2026
      </footer>
    </div>
  );
}
