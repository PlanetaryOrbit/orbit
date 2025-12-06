"use client"

import type { NextPage } from "next"
import Head from "next/head"
import Link from "next/link"
import { motion } from "framer-motion"
import { IconHome, IconRefresh, IconRocket, IconBug } from "@tabler/icons-react"

const ServerError: NextPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Head>
        <title>500 - Server Error | Orbit</title>
        <meta name="description" content="Something went wrong on our end." />
      </Head>

      {/* Navigation */}
      <nav className="p-6">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <IconRocket className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">Orbit</span>
        </Link>
      </nav>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          {/* Animated Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-8 inline-block"
          >
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center mx-auto">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <IconBug className="w-16 h-16 text-red-500" />
              </motion.div>
            </div>
            
            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/30"
            />
            <motion.div
              animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-orange-500/30"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-sm font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Error 500
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Something went wrong
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              We're experiencing some technical difficulties. Our team has been notified
              and is working on a fix. Please try again in a moment.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-pink-700 shadow-lg shadow-indigo-500/20 transition-all"
              >
                <IconRefresh className="w-5 h-5" />
                Try Again
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <IconHome className="w-5 h-5" />
                Go to Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          If this problem persists,{" "}
          <a
            href="https://discord.gg/planetary"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 dark:text-pink-400 hover:underline"
          >
            contact support
          </a>
        </p>
      </footer>
    </div>
  )
}

export default ServerError
