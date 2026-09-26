export function SampleBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`sample-badge ${className}`}
      title="Sample content shown until real users add content"
    >
      Sample
    </span>
  );
}
