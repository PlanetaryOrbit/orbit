import { useEffect } from "react";
import Router from "next/router";
import { motion } from "framer-motion";

export default function Error() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <motion.h1 
          className="text-6xl font-bold text-[#ff0099] mb-4"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          500
        </motion.h1>
        <h2 className="text-3xl font-semibold text-gray-300 mb-4">
          Internal Server Error
        </h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Looks like you've ventured into uncharted space. Let's get you back on course.
		  <br />
        </p>
		<p className="text-gray-400 max-w-md mx-auto">
          Contact our support team if the issue persists.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => Router.push('/')}
          className="mt-8 px-6 py-3 bg-[#ff0099] hover:bg-[#ff0099]/90 text-white rounded-lg font-medium transition-colors duration-200 shadow-lg shadow-[#ff0099]/20"
        >
          Return to Home
        </motion.button>
      </motion.div>
    </div>
  );
}
