export function Panel({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <section className={`bg-bezel-gradient rounded-xl p-3.5 ${className}`}>
      <div className="bezel overflow-hidden rounded-md">{children}</div>
    </section>
  );
}
