export default function Card({ children, className = "", as: Component = "div", ...props }) {
  return (
    <Component
      className={`bg-paper rounded-2xl border border-line shadow-[var(--shadow-card)] ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
