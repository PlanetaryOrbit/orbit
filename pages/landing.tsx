"use client"

import type { NextPage } from "next"
import Head from "next/head"
import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"
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
  IconChevronDown,
  IconChevronUp,
  IconStar,
  IconHeart
} from "@tabler/icons-react"

const LandingPage: NextPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
    { name: "Docs", href: "https://docs.planetaryapp.us" },
  ]

  const features = [
    {
      icon: IconUsers,
      title: "Staff Management",
      description: "Organize your team with intuitive tools for tracking and managing staff members."
    },
    {
      icon: IconChartBar,
      title: "Activity Analytics",
      description: "Monitor performance with real-time analytics and detailed activity insights."
    },
    {
      icon: IconClock,
      title: "Session Scheduling",
      description: "Plan sessions with automated reminders to keep your team on track."
    },
    {
      icon: IconShield,
      title: "Role Permissions",
      description: "Create custom roles with granular access control for your workspace."
    },
  ]

  const pricingPlans = [
    {
      name: "Cloud Hosted",
      price: "Free",
      description: "Get started instantly with our managed cloud solution.",
      features: [
        "Unlimited workspaces",
        "Real-time activity tracking",
        "Session scheduling",
        "Role management",
        "Discord integration",
        "Automatic updates",
      ],
      cta: "Get Started",
      href: "/login",
      highlighted: true,
    },
    {
      name: "Self-Hosted",
      price: "Free",
      description: "Host on your own infrastructure for full control.",
      features: [
        "Full source code access",
        "Custom domain support",
        "Database control",
        "No usage limits",
        "Community support",
        "Docker deployment",
      ],
      cta: "View on GitHub",
      href: "https://github.com/PlanetaryOrbit/orbit",
      highlighted: false,
    },
  ]

  const faqs = [
    {
      question: "What is Orbit?",
      answer: "Orbit is a comprehensive staff management platform designed for Roblox groups. It helps you track activity, manage roles, schedule sessions, and organize your team efficiently."
    },
    {
      question: "Is Orbit really free?",
      answer: "Yes! Orbit is completely free to use. We offer both a cloud-hosted version and a self-hosted option at no cost."
    },
    {
      question: "How do I get started?",
      answer: "Simply click 'Get Started', log in with your Roblox account, and create your first workspace. You'll be up and running in minutes."
    },
    {
      question: "Can I self-host Orbit?",
      answer: "Absolutely! Orbit is open-source and can be self-hosted using Docker. Check our GitHub repository for deployment instructions."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. We use industry-standard encryption and security practices. Your data is stored securely and never shared with third parties."
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Orbit - Staff Management for Roblox Groups</title>
        <meta name="description" content="The modern way to manage your Roblox group. Track activity, schedule sessions, and organize your team." />
      </Head>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-pink-500 flex items-center justify-center">
                <IconRocket className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">Orbit</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              {mobileMenuOpen ? <IconX className="w-5 h-5" /> : <IconMenu2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block py-2 text-gray-600 hover:text-gray-900"
              >
                {link.name}
              </a>
            ))}
            <Link
              href="/login"
              className="block mt-4 px-4 py-2 text-center text-sm font-medium text-white bg-pink-500 rounded-lg"
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 mb-6 text-xs font-medium text-pink-600 bg-pink-50 rounded-full">
              Free & Open Source
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              The modern way to manage your{" "}
              <span className="text-pink-500">Roblox group</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Track staff activity, schedule sessions, manage roles, and keep your team organized — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 text-base font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors flex items-center justify-center gap-2"
              >
                Get Started Free
                <IconArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/PlanetaryOrbit/orbit"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <IconBrandGithub className="w-5 h-5" />
                View on GitHub
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {[
              { value: "10K+", label: "Users" },
              { value: "500+", label: "Groups" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to manage your group
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help you run your Roblox community efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl p-6 border border-gray-100"
              >
                <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-600">
              Choose the option that works best for you. Both are completely free.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {plan.highlighted ? (
                    <IconCloud className="w-6 h-6 text-pink-400" />
                  ) : (
                    <IconServer className="w-6 h-6 text-gray-600" />
                  )}
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlighted ? "text-gray-300" : "text-gray-600"}`}>
                  {plan.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <IconCheck className={`w-4 h-4 ${plan.highlighted ? "text-pink-400" : "text-pink-500"}`} />
                      <span className={plan.highlighted ? "text-gray-200" : "text-gray-700"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  className={`block w-full py-3 text-center text-sm font-medium rounded-lg transition-colors ${
                    plan.highlighted
                      ? "bg-pink-500 text-white hover:bg-pink-600"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  {openFaq === i ? (
                    <IconChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <IconChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-8">
            Join thousands of groups already using Orbit to manage their teams.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-3 text-base font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors"
            >
              Get Started Free
            </Link>
            <a
              href="https://discord.gg/planetary"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <IconBrandDiscord className="w-5 h-5" />
              Join Discord
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
                <IconRocket className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Orbit</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <a href="https://docs.planetaryapp.us" className="hover:text-gray-900">Docs</a>
              <a href="https://github.com/PlanetaryOrbit/orbit" className="hover:text-gray-900">GitHub</a>
              <a href="https://discord.gg/planetary" className="hover:text-gray-900">Discord</a>
            </div>
            <div className="text-sm text-gray-500">
              Made with <IconHeart className="w-4 h-4 inline text-pink-500" /> by Planetary
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
