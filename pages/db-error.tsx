import { useEffect } from "react";
import Router from "next/router";

export default function DatabaseErrorPage() {
  const isDbConfigured = process.env.NEXT_PUBLIC_DATABASE_CHECK === "true";

  useEffect(() => {
    if (isDbConfigured) {
      Router.replace("/");
    }
  }, [isDbConfigured]);

  return (
    <>
      <div className="db-container">
        <div className="db-card">
          <h1 className="db-title">Database Not Configured</h1>

          <p className="db-message">
            Please set the{" "}
            <code className="db-code">DATABASE_URL</code>{" "}
            environment variable in your deployment.
          </p>

          <button className="db-btn" onClick={() => location.reload()}>
            Reload Page
          </button>
        </div>
      </div>

      <style jsx>{`
        .db-container {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
          font-family: system-ui, sans-serif;
          background: linear-gradient(to bottom, #18181b, #09090b, #18181b);
        }

        .db-card {
          width: 100%;
          max-width: 480px;
          padding: 40px 36px;
          text-align: center;
          border-radius: 20px;
          background: rgba(24, 24, 27, 0.55);
          border: 1px solid rgba(63, 63, 70, 0.8);
          backdrop-filter: blur(12px);
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.4);
          animation: fadeIn 0.45s ease forwards;
          transform: translateY(12px);
          opacity: 0;
        }

        @keyframes fadeIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .db-title {
          font-size: 32px;
          font-weight: 800;
          color: #ff2b55;
          margin-bottom: 16px;
        }

        .db-message {
          color: #d4d4d8;
          font-size: 16px;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .db-code {
          background: rgba(63, 63, 70, 0.7);
          border: 1px solid rgba(82, 82, 91, 0.7);
          padding: 2px 6px;
          border-radius: 6px;
          font-family: monospace;
          color: #e4e4e7;
        }

        .db-btn {
          padding: 10px 20px;
          font-size: 15px;
          background: #ff2b55;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          transition: 0.2s ease;
          box-shadow: 0 0 12px rgba(255, 43, 85, 0.35);
        }

        .db-btn:hover {
          filter: brightness(1.1);
          transform: scale(1.03);
        }

        .db-btn:active {
          transform: scale(0.97);
        }

        /* Light mode */
        @media (prefers-color-scheme: light) {
          .db-container {
            background: linear-gradient(to bottom, #ffffff, #f4f4f5);
          }

          .db-card {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid #e4e4e7;
            box-shadow: 0 0 25px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
          }

          .db-message {
            color: #3f3f46;
          }

          .db-code {
            background: #e4e4e7;
            color: #18181b;
            border: 1px solid #d4d4d8;
          }
        }
      `}</style>
    </>
  );
}
