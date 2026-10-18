// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

// Dashboard: built next.
export default function Dashboard() {
  return <h1 className="font-serif text-3xl">Dashboard</h1>;
}
