import { useState } from 'react';

interface CopyFieldProps {
  label: string;
  value: string;
  mono?: boolean;
  sensitive?: boolean;
}

export function CopyField({ label, value, mono = true, sensitive = false }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; fail silently
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={value}
          className={`min-w-0 flex-1 rounded border px-2 py-1.5 text-sm ${
            sensitive ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-slate-50'
          } ${mono ? 'font-mono' : ''}`}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
