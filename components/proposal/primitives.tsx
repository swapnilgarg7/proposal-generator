import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared presentational primitives for the proposal document.
 *
 * Everything here is a server component and styled entirely with the --doc-*
 * token set, so the same tree renders correctly in the dark web viewer, the
 * light web viewer, and the print/PDF pass with no branching.
 */

export function Section({
  id,
  children,
  className,
  tight = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tight?: boolean;
}) {
  return (
    <section
      id={id}
      data-section
      className={cn(
        "doc-avoid-break relative mx-auto w-full max-w-[68rem] px-6 sm:px-10",
        tight ? "py-10 sm:py-14" : "py-16 sm:py-24",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--doc-accent)]">
      {children}
    </p>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--doc-fg)] sm:text-[2.5rem]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function SectionIntro({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-4 max-w-[46rem] text-pretty text-base leading-[1.7] text-[var(--doc-fg-muted)] sm:text-[1.0625rem]">
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <header className="mb-10 sm:mb-14">
      <Eyebrow>{eyebrow}</Eyebrow>
      <SectionTitle>{title}</SectionTitle>
      <SectionIntro>{intro}</SectionIntro>
    </header>
  );
}

export function Card({
  children,
  className,
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "doc-avoid-break relative rounded-2xl border bg-[var(--doc-bg-elevated)] p-6 sm:p-8",
        accent
          ? "border-[var(--doc-accent)]/40 shadow-[0_0_0_1px_var(--doc-accent)]/10"
          : "border-[var(--doc-border)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A thin gradient rule used to separate major movements of the document. */
export function GradientRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-px w-full", className)}
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, var(--doc-border-strong) 20%, var(--doc-border-strong) 80%, transparent 100%)",
      }}
    />
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border-[var(--doc-border-strong)] text-[var(--doc-fg-muted)]",
    accent: "border-[var(--doc-accent)]/50 text-[var(--doc-accent)]",
    success: "border-[var(--doc-success)]/50 text-[var(--doc-success)]",
    warning: "border-[var(--doc-warning)]/50 text-[var(--doc-warning)]",
    danger: "border-[var(--doc-danger)]/50 text-[var(--doc-danger)]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("h-4 w-4 shrink-0", className)}>
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("h-4 w-4 shrink-0", className)}>
      <path d="M4 8h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Wide content (tables, Gantt tracks) must scroll inside its own container.
 * The document body must never scroll horizontally on a phone.
 */
export function ScrollArea({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0", className)}>
      <div className="min-w-[38rem]">{children}</div>
    </div>
  );
}
