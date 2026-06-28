export default function SectionHeader({ eyebrow, title, description, icon: Icon, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-azure mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl sm:text-3xl text-ink font-semibold flex items-center gap-3">
          {Icon && (
            <span className="inline-flex w-9 h-9 rounded-xl bg-navy items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-turquoise-light" />
            </span>
          )}
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ink-soft mt-2 max-w-2xl text-balance">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
