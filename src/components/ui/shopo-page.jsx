import React from 'react';
import { cn } from '@/lib/utils';

const widths = {
  wide: 'max-w-7xl',
  standard: 'max-w-6xl',
  narrow: 'max-w-4xl',
};

export function ShopoPageShell({ as: Component = 'div', className, children, ...props }) {
  return <Component className={cn('min-h-full w-full bg-slate-50 font-sans text-slate-900 dark:bg-slate-900 dark:text-slate-100', className)} {...props}>{children}</Component>;
}

export function ShopoPageContainer({ as: Component = 'div', width = 'wide', className, children, ...props }) {
  return <Component className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', widths[width] || widths.wide, className)} {...props}>{children}</Component>;
}

export function ShopoPageHero({ eyebrow, title, titleAddon, meta, description, actions, children, className }) {
  const side = children || actions;
  return <section className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[var(--shopo-brand-blue)] to-blue-700 p-6 text-white shadow-xl md:p-8', className)}>
    <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
    <div className={cn('relative min-w-0', side && 'grid gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center')}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-orange-200">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>{titleAddon}</div>
        {meta && <p className="mt-3 break-words text-xl font-semibold text-orange-200 sm:text-2xl">{meta}</p>}
        {description && <div className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">{description}</div>}
      </div>
      {side && <div className="min-w-0">{side}</div>}
    </div>
  </section>;
}

export function ShopoSectionHeader({ eyebrow, title, description, actions, className }) {
  return <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="min-w-0">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
  </div>;
}

export function ShopoContentCard({ as: Component = 'section', className, children, ...props }) {
  return <Component className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800', className)} {...props}>{children}</Component>;
}

export function ShopoProse({ as: Component = 'div', className, children, ...props }) {
  return <Component className={cn('space-y-3 text-[15px] leading-7 text-slate-600 dark:text-slate-300 [&_a]:font-semibold [&_a]:text-blue-700 [&_a]:underline-offset-4 [&_a:hover]:underline dark:[&_a]:text-blue-300 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white', className)} {...props}>{children}</Component>;
}
