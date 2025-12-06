import Head from "next/head";
import Router from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Error() {
  return (
    <>
      <Head>
        <title>404 — Page Not Found</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-4xl w-full bg-zinc-900/60 backdrop-blur-md rounded-2xl p-8 sm:p-12 text-center shadow-2xl border border-zinc-800"
        >
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-7xl font-extrabold text-[#ff0099]"
                aria-hidden
              >
                404
              </motion.div>
            </div>

            <div className="text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-200">Page not found</h1>
              <p className="mt-3 text-zinc-400 max-w-xl">
                Looks like you've ventured into uncharted space. The page you're
                looking for doesn't exist (or moved). No worries — here are a few
                options to get back on course.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => Router.push('/')}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-[#ff0099] text-white font-medium shadow-sm hover:brightness-105 transition"
                  aria-label="Return to home"
                >
                  Return to home
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => Router.back()}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-800/90 transition"
                  aria-label="Go back"
                >
                  Go back
                </motion.button>

                <Link
                  href="https://github.com/PlanetaryOrbit/orbit/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-zinc-300 hover:text-white border border-zinc-700"
                >
                  Report an issue
                </Link>
              </div>

              <p className="mt-4 text-sm text-zinc-500">Or try searching from the sidebar.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
