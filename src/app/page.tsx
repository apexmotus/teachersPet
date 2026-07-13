import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Clock,
  ShieldCheck,
  MessageSquare,
  BarChart2,
  Database,
  TrendingUp,
  CheckCircle,
  Phone,
  Mail,
  Globe,
  MapPin,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Clock,
    title: 'Time-saving automation',
    body: 'Attendance registers, marks recording, and parent communication — automated so teachers can focus on teaching.',
  },
  {
    icon: ShieldCheck,
    title: 'Accuracy & record keeping',
    body: 'Digital records are structured, backed up, and instantly retrievable. No more lost registers or spreadsheet errors.',
  },
  {
    icon: MessageSquare,
    title: 'Instant communication',
    body: 'Share academic progress, announcements, and updates with learners and parents in real time.',
  },
  {
    icon: BarChart2,
    title: 'Data-driven decisions',
    body: 'Spot struggling learners early through performance tracking — intervene before results suffer.',
  },
  {
    icon: Database,
    title: 'Centralised access',
    body: 'Lesson plans, learner records, and assessments in one place, accessible from any device.',
  },
  {
    icon: TrendingUp,
    title: 'Built to scale',
    body: 'Grows with your school — from a single classroom to multiple schools and districts without switching systems.',
  },
]

const IMPACT = [
  'Eliminates manual administration',
  'Improves accountability and transparency',
  'Enhances data-driven decision making',
  'Reduces teacher workload',
  'Creates a more efficient and productive education environment',
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[oklch(0.18_0.04_250)]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm select-none">
              🐾
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">Teacher&apos;s PET</p>
              <p className="text-[10px] text-white/50">by Innobuntu Group</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/70">
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#products" className="hover:text-white transition-colors">Products</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>

          {/* Auth CTAs */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-white/70 text-sm font-medium hover:text-white transition-colors px-2"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative bg-[oklch(0.18_0.04_250)] text-white overflow-hidden pt-16">
        {/* Decorative glow */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 py-28 md:py-40">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-5">
            Innobuntu Group
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl">
            Innovation Rooted<br />in{' '}
            <span className="text-primary">Ubuntu</span>
          </h1>
          <p className="mt-6 text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed">
            We build technology that empowers communities and transforms industries — guided by the African philosophy that{' '}
            <em className="text-white/80 not-italic">"I am because we are."</em>
          </p>
          <p className="mt-3 text-white/50 text-base max-w-xl leading-relaxed">
            Our flagship product, <strong className="text-white font-semibold">Teacher&apos;s PET</strong>, is digitising school administration across Africa — one classroom at a time.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#products"
              className="bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/80 transition-colors text-sm"
            >
              Explore Teacher&apos;s PET
            </a>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="border border-white/20 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
              >
                Open dashboard →
              </Link>
            ) : (
              <Link
                href="/register"
                className="border border-white/20 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
              >
                Create free account →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── ABOUT INNOBUNTU ─────────────────────────────────────────── */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Who we are</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 max-w-2xl leading-tight">
            We Are Innobuntu
          </h2>
          <p className="mt-5 text-gray-500 text-lg max-w-3xl leading-relaxed">
            Innobuntu Group is a forward-thinking technology company driven by the powerful combination of innovation and the African philosophy of Ubuntu — <em>"I am because we are."</em> We exist to create meaningful, impactful, and scalable tech solutions that improve lives, empower communities, and transform industries.
          </p>
          <p className="mt-3 text-gray-500 text-base max-w-3xl leading-relaxed">
            At Innobuntu, we believe technology should not only advance systems but also uplift people. Our solutions are designed with purpose — to simplify processes, increase efficiency, and unlock human potential.
          </p>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {/* Mission */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <span className="text-primary text-xl">🎯</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Our Mission</h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                To design and develop smart, user-friendly technology solutions that eliminate inefficiencies, empower users, and contribute to social and economic development through innovation guided by Ubuntu.
              </p>
            </div>
            {/* Vision */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <span className="text-primary text-xl">🌍</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Our Vision</h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                To become a leading African technology company that pioneers innovative digital solutions rooted in human-centered values and community impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ─────────────────────────────────────────────────── */}
      <section id="products" className="py-24 bg-[oklch(0.18_0.04_250)]">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Our solutions</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-12">Products</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Teacher's PET — flagship */}
            <div className="relative rounded-2xl bg-white/5 border border-white/10 p-8 md:col-span-2 md:grid md:grid-cols-2 md:gap-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-xl">🐾</div>
                  <div>
                    <p className="text-white font-bold text-lg">Teacher&apos;s PET</p>
                    <p className="text-white/40 text-xs">Flagship product</p>
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-white leading-tight mb-4">
                  The digital companion<br />for educators
                </h3>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  Teacher&apos;s PET is an innovative EdTech solution that transforms and modernises administrative processes within the education sector. Built with educators in mind, it addresses one of the biggest challenges in schools — the burden of manual administration.
                </p>
                <p className="text-white/60 text-sm leading-relaxed mb-8">
                  From record-keeping and reporting to communication and data management, Teacher&apos;s PET streamlines these processes into a single, user-friendly platform — enabling educators and institutions to operate more efficiently and effectively.
                </p>
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/80 transition-colors text-sm"
                  >
                    Open dashboard →
                  </Link>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/80 transition-colors text-sm"
                    >
                      Get started free
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 border border-white/20 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
                    >
                      Log in
                    </Link>
                  </div>
                )}
              </div>

              {/* Impact list */}
              <div className="relative mt-8 md:mt-0 flex flex-col justify-center">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-5 font-semibold">What it delivers</p>
                <ul className="space-y-3">
                  {IMPACT.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-white/70 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 rounded-xl bg-white/5 border border-white/10 p-5">
                  <p className="text-white/40 text-xs mb-1">Vision</p>
                  <p className="text-white/80 text-sm leading-relaxed italic">
                    "To become a leading digital companion for educators across Africa and beyond, revolutionising school administration and enabling education systems to thrive in the digital age."
                  </p>
                </div>
              </div>
            </div>

            {/* More coming soon */}
            <div className="rounded-2xl border border-white/10 border-dashed p-8 flex flex-col items-start justify-between min-h-[180px]">
              <p className="text-white/30 text-sm font-medium">More solutions</p>
              <div>
                <p className="text-white/50 text-lg font-semibold">Coming soon</p>
                <p className="text-white/30 text-sm mt-1">Innobuntu is building more tools rooted in Ubuntu.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Why Teacher&apos;s PET</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 max-w-2xl leading-tight">
            Everything your school needs — in one platform
          </h2>
          <p className="text-gray-500 mb-12 max-w-xl text-base">
            One of the biggest advantages is time-saving automation. Teachers often spend hours on repetitive admin work. Teacher&apos;s PET reduces this burden — allowing educators to focus more on actual teaching.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 p-7 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────────────────── */}
      <section className="py-20 bg-primary">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to transform your school?
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            Join educators already using Teacher&apos;s PET to reclaim their time and focus on what matters — teaching.
          </p>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center bg-white text-primary font-bold px-8 py-4 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              Open your dashboard →
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex items-center bg-white text-primary font-bold px-8 py-4 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              Get started free →
            </Link>
          )}
        </div>
      </section>

      {/* ── FOOTER / CONTACT ────────────────────────────────────────── */}
      <footer id="contact" className="bg-[oklch(0.18_0.04_250)] text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm">🐾</div>
              <div>
                <p className="text-sm font-bold text-white">Teacher&apos;s PET</p>
                <p className="text-[10px] text-white/50">by Innobuntu Group</p>
              </div>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Teacher&apos;s PET is more than a system — it is a complete ecosystem designed to empower educators, strengthen school management, and unlock the full potential of teaching and learning.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">Navigation</p>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'About Innobuntu', href: '#about' },
                { label: 'Products', href: '#products' },
                { label: 'Log in', href: '/login' },
                { label: 'Create account', href: '/register' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-white/50 hover:text-white transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">Contact us</p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 text-white/50">
                <Phone className="w-4 h-4 shrink-0 text-primary" />
                <span>065 840 4432 | 069 219 9227</span>
              </li>
              <li className="flex items-center gap-3 text-white/50">
                <Mail className="w-4 h-4 shrink-0 text-primary" />
                <span>info@innobuntu.co.za</span>
              </li>
              <li className="flex items-center gap-3 text-white/50">
                <Globe className="w-4 h-4 shrink-0 text-primary" />
                <span>www.innobuntu.co.za</span>
              </li>
              <li className="flex items-center gap-3 text-white/50">
                <MapPin className="w-4 h-4 shrink-0 text-primary" />
                <span>Rustenburg, South Africa</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-white/30">
          <p>&copy; {new Date().getFullYear()} Innobuntu Group. All rights reserved.</p>
          <p>Built with purpose. Guided by Ubuntu.</p>
        </div>
      </footer>

    </div>
  )
}
