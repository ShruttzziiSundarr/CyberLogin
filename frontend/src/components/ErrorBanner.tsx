interface ErrorBannerProps {
  message: string;
  code?: string;
}

export function ErrorBanner({ message, code }: ErrorBannerProps) {
  return (
    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="font-medium">Error{code ? ` (${code})` : ''}:</span> {message}
    </div>
  );
}
