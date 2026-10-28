"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  showNotificationBadge?: boolean;
  children?: { href: string; label: string }[];
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({
  items,
  unreadCount,
}: {
  readonly items: readonly NavItem[];
  readonly unreadCount: number;
}) {
  const pathname = usePathname();

  // A section counts as "active" if the current page is its own page or
  // any of its children's — used both to highlight the parent row and
  // to auto-expand it so the active sub-item isn't hidden on load.
  const activeParentHref = items.find(
    (item) =>
      isActive(pathname, item.href) ||
      item.children?.some((c) => isActive(pathname, c.href))
  )?.href;

  // Collapsed by default except for the section containing the current
  // page. Items with children render as a plain button (toggle only,
  // no navigation) rather than a link — the row itself is the control,
  // with no separate arrow/chevron alongside it.
  const [openHref, setOpenHref] = useState<string | null>(activeParentHref ?? null);

  return (
    <nav className="flex-1 py-5 overflow-y-auto overflow-x-hidden">
      {items.map((item) => {
        const isOpen = openHref === item.href;
        // Parent buttons don't navigate (they only expand/collapse), so
        // basing "active" purely on the URL meant the highlight never
        // appeared until a child was actually clicked. Clicking the
        // parent itself should highlight it immediately, same moment
        // it expands — not only once a child page is the current route.
        const active = activeParentHref === item.href || isOpen;
        return (
          <div key={item.href}>
            {item.children ? (
              <button
                type="button"
                onClick={() => setOpenHref(isOpen ? null : item.href)}
                aria-expanded={isOpen}
                className={`w-[calc(100%-1rem)] flex items-center justify-between gap-2 px-4 py-3 mx-2 rounded-lg text-[13px] transition-colors text-left min-w-0 ${
                  active ? "bg-steel-600 text-white shadow-[0_7px_18px_rgba(239,104,72,0.22)]" : "text-white/62 hover:text-white hover:bg-white/[0.07]"
                }`}
              >
                <span className="truncate">{item.label}</span>
                {item.showNotificationBadge && unreadCount > 0 && (
                  <span className="bg-urgent text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shrink-0">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ) : (
              <Link
                href={item.href}
                className={`flex items-center justify-between gap-2 px-4 py-3 mx-2 w-[calc(100%-1rem)] rounded-lg text-[13px] transition-colors min-w-0 ${
                  active ? "bg-steel-600 text-white shadow-[0_7px_18px_rgba(239,104,72,0.22)]" : "text-white/62 hover:text-white hover:bg-white/[0.07]"
                }`}
              >
                <span className="truncate">{item.label}</span>
                {item.showNotificationBadge && unreadCount > 0 && (
                  <span className="bg-urgent text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shrink-0">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            {item.children && isOpen && (
              <div className="pb-2 pt-1">
                {item.children.map((child) => {
                  const childActive = isActive(pathname, child.href);
                  return (
                    <Link
                      key={`${item.href}-${child.href}-${child.label}`}
                      href={child.href}
                      className={`flex items-center gap-2 pl-9 pr-5 py-1.5 text-xs transition-colors min-w-0 ${
                        childActive
                          ? "text-white font-semibold bg-white/10 border-l-2 border-steel-400"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full shrink-0 ${childActive ? "bg-white" : "bg-steel-400"}`} />
                      <span className="truncate">{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
