"use client"

import type { NextPage } from "next"
import Head from "next/head"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  IconRocket, 
  IconUsers, 
  IconChartBar, 
  IconShield, 
  IconClock,
  IconCloud,
  IconServer,
  IconCheck,
  IconArrowRight,
  IconBrandDiscord,
  IconBrandGithub,
  IconMenu2,
  IconX,
  IconStar,
  IconBolt,
  IconLock,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconQuote
} from "@tabler/icons-react"

// ============================================
// DESIGN SYSTEM
// ============================================
// Color Palette:
// - Primary: #6366F1 (Indigo) - Trust, Innovation
// - Secondary: #8B5CF6 (Violet) - Creativity
// - Accent: #EC4899 (Pink) - Energy, CTAs
// - Success: #10B981 (Emerald)
// - Background: #0F0F1A (Dark) / #FAFAFA (Light)
// - Surface: #1A1A2E (Dark cards)
// - Text: #F8FAFC (Light on dark) / #1E293B (Dark on light)

// Typography:
// - Font: Inter (clean, modern, highly readable)
// - H1: 4rem/64px, 700 weight
// - H2: 3rem/48px, 700 weight
// - H3: 1.5rem/24px, 600 weight
// - Body: 1rem/16px, 400 weight
// - Small: 0.875rem/14px

const Landing: NextPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: IconUsers,
      title: "Staff Management",
      description: "Effortlessly manage your team with intuitive tools for scheduling, tracking, and organizing staff members."
    },
    {
      icon: IconChartBar,
      title: "Activity Tracking",
      description: "Monitor staff activity in real-time with comprehensive analytics and detailed performance insights."
    },
    {
      icon: IconClock,
      title: "Session Scheduling",
      description: "Plan and schedule sessions with ease. Automated reminders keep your team on track."
    },
    {
      icon: IconShield,
      title: "Role Management",
      description: "Create custom roles with granular permissions. Control access levels with precision."
    },
    {
      icon: IconBolt,
      title: "Instant Actions",
      description: "Promote, demote, warn, or manage members with one-click actions. No delays."
    },
    {
      icon: IconLock,
      title: "Secure & Private",
      description: "Enterprise-grade security with encrypted data and secure authentication protocols."
    }
  ]

  const testimonials = [
    {
      company: "FreshGoods PLC",
      quote: "At FreshGoods PLC, staying organized and efficient is key to our success. Planetary's clear, easy-to-navigate interface helps us seamlessly manage staff schedules and monitor activity. It's more than just a tool—it's a reliable partner in our growth.",
      author: "BAGCISCOOL",
      role: "Vice-President",
      avatar: "🏢"
    },
    {
      company: "Burger Queen",
      quote: "Planetary has helped us tremendously with our group operations. We love the customization options and the feature for adding our own documents. Highly recommend for your group management needs!",
      author: "Zirthes",
      role: "Group Owner",
      avatar: "🍔"
    },
    {
      company: "Osaka Hibachi",
      quote: "Planetary's intuitive interface streamlines our processes and greatly reduces the workload for our HR Department. From exceptional support to talented developers, Planetary has proven to be a trusted partner.",
      author: "BAGCISCOOL",
      role: "Chairman",
      avatar: "🍱"
    },
    {
      company: "Kelva Support Center",
      quote: "This platform has made a real difference. It helps us track member activity, schedule sessions, and stay on top of performance. The layout is clear and keeps everything organized without being complicated.",
      author: "exppireed",
      role: "President",
      avatar: "🎧"
    }
  ]

  const faqs = [
    {
      question: "How do I get started with Planetary?",
      answer: "Getting started is simple! Click 'Get Started Free' to create your account. You can either use Planetary Cloud (recommended for instant setup) or self-host using our open-source code on GitHub."
    },
    {
      question: "Is Planetary really free?",
      answer: "Yes! Planetary Cloud offers a generous free tier that's perfect for most groups. Our platform is also fully open-source, so you can self-host at no cost if you prefer."
    },
    {
      question: "What's the difference between Cloud and Self-Hosted?",
      answer: "Planetary Cloud is our managed service—instant setup, automatic updates, and optimized performance. Self-hosted gives you full control over your data and infrastructure but requires technical knowledge to maintain."
    },
    {
      question: "Can I migrate from Tovy to Planetary?",
      answer: "Absolutely! Planetary is a modern fork of Tovy with improved features and active maintenance. We provide migration guides to help you transition smoothly."
    },
    {
      question: "How secure is my data?",
      answer: "Security is our priority. We use industry-standard encryption, secure authentication via Roblox OAuth, and follow best practices for data protection. Your data is never shared with third parties."
    }
  ]

  const stats = [
    { value: "10K+", label: "Active Users" },
    { value: "500+", label: "Groups Managed" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" }
  ]

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white overflow-x-hidden">
      <Head>
        <title>Planetary - Modern Staff Management for Roblox Groups</title>
        <meta name="description" content="The better way to manage your Roblox group. Powerful, intuitive, and free staff management platform." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #6366F1 0%, #EC4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .gradient-border {
          position: relative;
          background: linear-gradient(135deg, #1A1A2E 0%, #1A1A2E 100%);
          border-radius: 1rem;
        }
        
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: 1rem;
          background: linear-gradient(135deg, #6366F1 0%, #EC4899 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
        
        .glow {
          box-shadow: 0 0 60px rgba(99, 102, 241, 0.3);
        }
        
        .card-hover {
          transition: all 0.3s ease;
        }
        
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
        }
        
        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0F0F1A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
                <IconRocket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Planetary</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Features</a>
              <a href="#testimonials" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Testimonials</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Pricing</a>
              <a href="#faq" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">FAQ</a>
              <a href="https://docs.planetaryapp.us" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Docs</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <a href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Sign In
              </a>
              <a 
                href="/login" 
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Get Started Free
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <IconX className="w-6 h-6" /> : <IconMenu2 className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#1A1A2E] border-t border-white/5"
            >
              <div className="px-4 py-6 space-y-4">
                <a href="#features" className="block text-gray-300 hover:text-white transition-colors py-2">Features</a>
                <a href="#testimonials" className="block text-gray-300 hover:text-white transition-colors py-2">Testimonials</a>
                <a href="#pricing" className="block text-gray-300 hover:text-white transition-colors py-2">Pricing</a>
                <a href="#faq" className="block text-gray-300 hover:text-white transition-colors py-2">FAQ</a>
                <a href="https://docs.planetaryapp.us" className="block text-gray-300 hover:text-white transition-colors py-2">Docs</a>
                <div className="pt-4 space-y-3">
                  <a href="/login" className="block text-center py-3 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">
                    Sign In
                  </a>
                  <a href="/login" className="block text-center py-3 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-lg text-sm font-semibold">
                    Get Started Free
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-500/5 to-pink-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8"
            >
              <IconStar className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Trusted by 500+ Roblox groups</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-tight mb-6"
            >
              Manage your team,
              <br />
              <span className="gradient-text">your way.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              The modern staff management platform for Roblox groups. 
              Powerful features, intuitive design, completely free.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <a 
                href="/login"
                className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-xl text-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center space-x-2 pulse-glow"
              >
                <span>Get Started Free</span>
                <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="https://github.com/PlanetaryOrbit/orbit"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-lg font-semibold hover:bg-white/10 transition-colors flex items-center justify-center space-x-2"
              >
                <IconBrandGithub className="w-5 h-5" />
                <span>View on GitHub</span>
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-3xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-20 relative"
          >
            <div className="gradient-border glow p-1 rounded-2xl">
              <div className="bg-[#1A1A2E] rounded-2xl p-4 lg:p-8">
                {/* Mock Dashboard */}
                <div className="bg-[#0F0F1A] rounded-xl overflow-hidden border border-white/5">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500" />
                      <span className="font-semibold">Your Workspace</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gray-700" />
                    </div>
                  </div>
                  {/* Dashboard Content */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Stat Cards */}
                    {[
                      { label: "Active Staff", value: "127", change: "+12%" },
                      { label: "Sessions This Week", value: "34", change: "+8%" },
                      { label: "Activity Rate", value: "94%", change: "+3%" }
                    ].map((item, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-sm text-gray-400">{item.label}</div>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-2xl font-bold">{item.value}</span>
                          <span className="text-emerald-400 text-sm">{item.change}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURES SECTION */}
      {/* ============================================ */}
      <section id="features" className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-indigo-400 font-semibold text-sm uppercase tracking-wider"
            >
              Features
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-5xl font-bold mt-4 mb-6"
            >
              Everything you need to
              <br />
              <span className="gradient-text">manage your group</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-gray-400 text-lg"
            >
              Powerful tools designed to streamline your workflow and keep your team organized.
            </motion.p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-hover bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 lg:p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* COMPARISON SECTION */}
      {/* ============================================ */}
      <section id="pricing" className="py-20 lg:py-32 relative bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-indigo-400 font-semibold text-sm uppercase tracking-wider"
            >
              Choose Your Path
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-5xl font-bold mt-4 mb-6"
            >
              Cloud or Self-Hosted
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-gray-400 text-lg"
            >
              Choose the deployment option that works best for your group.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Cloud Option */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur opacity-20" />
              <div className="relative bg-[#1A1A2E] border border-white/10 rounded-2xl p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
                    <IconCloud className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Planetary Cloud</h3>
                    <span className="text-indigo-400 text-sm font-medium">Recommended</span>
                  </div>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold">Free</span>
                  <span className="text-gray-400 ml-2">forever</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "Instant setup in minutes",
                    "Automatic updates & maintenance",
                    "Optimized performance",
                    "99.9% uptime guarantee",
                    "Free SSL certificate",
                    "24/7 support"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center space-x-3">
                      <IconCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
                <a 
                  href="/login"
                  className="block w-full py-4 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-xl text-center font-semibold hover:opacity-90 transition-opacity"
                >
                  Get Started Free
                </a>
              </div>
            </motion.div>

            {/* Self-Hosted Option */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-8"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                  <IconServer className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Self-Hosted</h3>
                  <span className="text-gray-500 text-sm font-medium">For developers</span>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">Free</span>
                <span className="text-gray-400 ml-2">open source</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Full control over your data",
                  "Customize to your needs",
                  "Host anywhere you want",
                  "Community support",
                  "Requires technical knowledge",
                  "Manual updates required"
                ].map((item, i) => (
                  <li key={i} className="flex items-center space-x-3">
                    <IconCheck className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-400">{item}</span>
                  </li>
                ))}
              </ul>
              <a 
                href="https://github.com/PlanetaryOrbit/orbit"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 bg-white/5 border border-white/10 rounded-xl text-center font-semibold hover:bg-white/10 transition-colors"
              >
                View on GitHub
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* TESTIMONIALS SECTION */}
      {/* ============================================ */}
      <section id="testimonials" className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-indigo-400 font-semibold text-sm uppercase tracking-wider"
            >
              Testimonials
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-5xl font-bold mt-4 mb-6"
            >
              Loved by groups
              <br />
              <span className="gradient-text">everywhere</span>
            </motion.h2>
          </div>

          {/* Testimonial Carousel */}
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-8 lg:p-12 text-center"
              >
                <IconQuote className="w-12 h-12 text-indigo-500/30 mx-auto mb-6" />
                <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed mb-8">
                  "{testimonials[activeTestimonial].quote}"
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-2xl">
                    {testimonials[activeTestimonial].avatar}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{testimonials[activeTestimonial].author}</div>
                    <div className="text-sm text-gray-400">
                      {testimonials[activeTestimonial].role} at {testimonials[activeTestimonial].company}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex items-center justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeTestimonial 
                      ? "w-8 bg-gradient-to-r from-indigo-500 to-pink-500" 
                      : "bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`View testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FAQ SECTION */}
      {/* ============================================ */}
      <section id="faq" className="py-20 lg:py-32 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-indigo-400 font-semibold text-sm uppercase tracking-wider"
            >
              FAQ
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-5xl font-bold mt-4"
            >
              Questions? Answers.
            </motion.h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#1A1A2E] border border-white/5 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                  aria-expanded={openFaq === index}
                >
                  <span className="font-semibold pr-4">{faq.question}</span>
                  {openFaq === index ? (
                    <IconChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <IconChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA SECTION */}
      {/* ============================================ */}
      <section className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-pink-600" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <div className="relative px-8 py-16 lg:px-16 lg:py-24 text-center">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">
                Ready to transform your
                <br />
                group management?
              </h2>
              <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
                Join thousands of groups already using Planetary to streamline their operations.
                Get started in minutes, completely free.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Get Started Free</span>
                  <IconArrowRight className="w-5 h-5" />
                </a>
                <a 
                  href="https://discord.gg/planetary"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/20 rounded-xl text-lg font-semibold hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
                >
                  <IconBrandDiscord className="w-5 h-5" />
                  <span>Join Discord</span>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
                  <IconRocket className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">Planetary</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                The modern staff management platform for Roblox groups.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</a></li>
                <li><a href="https://docs.planetaryapp.us" className="text-gray-400 hover:text-white transition-colors text-sm">Documentation</a></li>
                <li><a href="https://changelog.planetaryapp.us" className="text-gray-400 hover:text-white transition-colors text-sm">Changelog</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="https://github.com/PlanetaryOrbit/orbit" className="text-gray-400 hover:text-white transition-colors text-sm">GitHub</a></li>
                <li><a href="https://discord.gg/planetary" className="text-gray-400 hover:text-white transition-colors text-sm">Discord</a></li>
                <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors text-sm">FAQ</a></li>
                <li><a href="https://status.planetaryapp.us" className="text-gray-400 hover:text-white transition-colors text-sm">Status</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy Policy</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">Terms of Service</a></li>
                <li><a href="/security" className="text-gray-400 hover:text-white transition-colors text-sm">Security</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Planetary. Open source under GPL-3.0.
            </p>
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/PlanetaryOrbit/orbit" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <IconBrandGithub className="w-5 h-5" />
              </a>
              <a 
                href="https://discord.gg/planetary" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Discord"
              >
                <IconBrandDiscord className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
