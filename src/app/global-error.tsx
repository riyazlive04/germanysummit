"use client";

// Catches errors in the root layout itself (rare). Must render its own
// <html>/<body>. Kept dependency-free with inline styles since the normal
// theme/layout may not be available here.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0B0B0D",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#A39E93", marginBottom: "1.5rem" }}>
            Please try again - your results are safe.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#E6A817",
              color: "#0B0B0D",
              border: "none",
              borderRadius: "0.6rem",
              padding: "0.7rem 1.4rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
