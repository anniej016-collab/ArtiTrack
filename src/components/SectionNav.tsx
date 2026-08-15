const LINKS = [
  { id: "to-listen", label: "To listen" },
  { id: "recently-listened", label: "Recent" },
  { id: "following", label: "Following" },
  { id: "paused", label: "Paused" },
];

/**
 * Sticks under the header so the lower sections stay reachable no matter how
 * long the queue grows.
 */
export function SectionNav({ available }: { available: string[] }) {
  const links = LINKS.filter((link) => available.includes(link.id));
  if (links.length < 2) return null;

  return (
    <nav
      aria-label="Jump to section"
      className="sticky top-[3.4rem] z-10 -mx-5 border-b border-line bg-bg/80 px-5 py-2 backdrop-blur-xl"
    >
      <ul className="flex gap-1.5 overflow-x-auto">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              className="btn-ghost block whitespace-nowrap px-3 py-1 text-xs"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
