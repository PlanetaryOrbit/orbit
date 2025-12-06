"use client"

import type { NextPage } from "next"
import Head from "next/head"
import Link from "next/link"
import { motion } from "framer-motion"
import { IconHome, IconArrowLeft, IconRocket } from "@tabler/icons-react"

const NotFound: NextPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Head>
        <title>404 - Page Not Found | Orbit</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
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
          {/* Animated 404 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-8"
          >
            <div className="text-[12rem] font-extrabold leading-none bg-gradient-to-br from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent select-none">
              404
            </div>
            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-0 w-8 h-8 rounded-full bg-pink-500/20 blur-sm"
            />
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/3 right-0 w-12 h-12 rounded-full bg-pink-500/20 blur-sm"
            />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-1/4 left-1/4 w-6 h-6 rounded-full bg-purple-500/20 blur-sm"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Page not found
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Oops! The page you're looking for doesn't exist or has been moved.
              Let's get you back on track.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-pink-700 shadow-lg shadow-indigo-500/20 transition-all"
              >
                <IconHome className="w-5 h-5" />
                Go to Dashboard
              </Link>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <IconArrowLeft className="w-5 h-5" />
                Go Back
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Need help?{" "}
          <a
            href="https://discord.gg/planetary"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 dark:text-pink-400 hover:underline"
          >
            Contact support
          </a>
        </p>
      </footer>
    </div>
  )
}

export default NotFound
