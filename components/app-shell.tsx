import type { ReactNode } from "react";

export type AppShellNavItem = {
  label: string;
  href: string;
  active?: boolean;
  meta?: ReactNode;
};

export type AppShellProps = {
  brand?: string;
  title?: string;
  subtitle?: string;
  navItems?: AppShellNavItem[];
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AppShell({
  brand = "Agentic YouTube Studio",
  title,
  subtitle,
  navItems = [],
  headerRight,
  footer,
  children,
  className,
}: AppShellProps) {
  return (
    <div
      className={className}
      style={{
        minHeight: "100vh",
        color: "#f5f7fb",
        backgroundImage:
          "radial-gradient(circle at top, rgba(246, 133, 31, 0.18), transparent 34%), radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08), transparent 18%), linear-gradient(180deg, #090b12 0%, #0c1018 45%, #07090d 100%)",
      }}
      >
      <div
        className="app-shell-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 292px) minmax(0, 1fr)",
          minHeight: "100vh",
        }}
      >
        <aside
          className="app-shell-aside"
          style={{
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))",
            padding: "24px",
            backdropFilter: "blur(18px)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              position: "sticky",
              top: "24px",
            }}
          >
            <div
              style={{
                borderRadius: "20px",
                padding: "18px",
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 18px 50px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                  color: "#ffd08a",
                  fontSize: "12px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, #ff8c42, #ffcf7a)",
                    boxShadow: "0 0 20px rgba(255, 140, 66, 0.55)",
                  }}
                />
                Studio command
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.1 }}>
                  {brand}
                </div>
                {title ? (
                  <div style={{ fontSize: "14px", color: "rgba(245, 247, 251, 0.82)" }}>
                    {title}
                  </div>
                ) : null}
                {subtitle ? (
                  <div style={{ fontSize: "13px", color: "rgba(245, 247, 251, 0.66)", lineHeight: 1.5 }}>
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>

            {navItems.length ? (
              <nav
                aria-label="Primary"
                style={{
                  display: "grid",
                  gap: "8px",
                }}
              >
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      textDecoration: "none",
                      color: item.active ? "#ffffff" : "rgba(245, 247, 251, 0.74)",
                      background: item.active
                        ? "linear-gradient(135deg, rgba(255, 140, 66, 0.22), rgba(255, 255, 255, 0.08))"
                        : "rgba(255, 255, 255, 0.03)",
                      border: item.active
                        ? "1px solid rgba(255, 190, 120, 0.35)"
                        : "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>{item.label}</span>
                    {item.meta ? (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#fdd7a2",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.meta}
                      </span>
                    ) : null}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        </aside>

        <div className="app-shell-main-column" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header
            className="app-shell-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              padding: "20px 28px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(9, 11, 18, 0.72)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#f4b66a",
                }}
              >
                Production board
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "6px" }}>
                {brand}
              </div>
            </div>
            {headerRight ? <div style={{ flexShrink: 0 }}>{headerRight}</div> : null}
          </header>

          <main
            className="app-shell-main"
            style={{
              flex: 1,
              padding: "28px",
            }}
          >
            <div style={{ display: "grid", gap: "24px", width: "100%" }}>{children}</div>
          </main>

          {footer ? (
            <footer
              className="app-shell-footer"
              style={{
                padding: "0 28px 28px",
                color: "rgba(245, 247, 251, 0.64)",
              }}
            >
              {footer}
            </footer>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
          .app-shell-layout {
            grid-template-columns: minmax(0, 1fr);
          }

          .app-shell-aside {
            border-right: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
        }

        @media (max-width: 640px) {
          .app-shell-main {
            padding: 18px;
          }

          .app-shell-header {
            padding: 16px 18px;
            align-items: flex-start;
            flex-direction: column;
          }

          .app-shell-footer {
            padding: 0 18px 18px;
          }
        }
      `}</style>
    </div>
  );
}
