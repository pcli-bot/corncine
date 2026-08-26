"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Structured logging — in production this would ship to Sentry/Logflare
    console.error("[ErrorBoundary]", error.message, { stack: error.stack, componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-[#0B0E15] border border-[#323947] rounded-xl m-4">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Something went wrong</h2>
          <p className="text-sm text-[#B3B7C1] mt-2 max-w-md">The application hit an unexpected error. Try refreshing the page. If the problem persists, check the logs.</p>
          <details className="mt-4 text-xs font-mono text-[#949AA5] bg-[#151922] border border-[#323947] rounded p-3 max-w-lg w-full text-left overflow-auto">
            <summary className="cursor-pointer text-[#B3B7C1]">Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error?.message}</pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-6 px-4 py-2 rounded-lg bg-[#EC69AE] text-[#0B0E15] text-sm font-semibold hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
