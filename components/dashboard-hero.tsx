import type { ButtonHTMLAttributes, ReactNode } from "react";

type HeroAction = {
  label: string;
  href?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  target?: string;
  rel?: string;
};

export type DashboardHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  statusLabel?: string;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  metrics?: Array<{
    label: string;
    value: ReactNode;
    detail?: ReactNode;
    tone?: "neutral" | "good" | "warn";
  }>;
  children?: ReactNode;
  className?: string;
};

function ActionChip({
  action,
  variant,
}: {
  action: HeroAction;
  variant: "primary" | "secondary";
}) {
  const sharedStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    minHeight: "42px",
    padding: "0 16px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
  } as const;

  const style =
    variant === "primary"
      ? {
          ...sharedStyle,
          color: "#100a04",
          background: "linear-gradient(135deg, #ffd08a 0%, #ff9a43 48%, #ff6f2d 100%)",
          boxShadow: "0 18px 30px rgba(255, 130, 54, 0.25)",
        }
      : {
          ...sharedStyle,
          color: "#f5f7fb",
          background: "rgba(255, 255, 255, 0.04)",
          borderColor: "rgba(255, 255, 255, 0.08)",
        };

  if (action.href) {
    return (
      <a href={action.href} target={action.target} rel={action.rel} style={style}>
        {action.label}
      </a>
    );
  }

  return (
    <button type="button" onClick={action.onClick} style={style}>
      {action.label}
    </button>
  );
}

export function DashboardHero({
  eyebrow = "Agentic workflow",
  title,
  description,
  statusLabel = "Live pipeline",
  primaryAction,
  secondaryAction,
  metrics = [],
  children,
  className,
}: DashboardHeroProps) {
  return (
    <section
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "28px",
        padding: "28px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)), radial-gradient(circle at 80% 0%, rgba(255, 150, 74, 0.28), transparent 32%)",
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.35)",
      }}
      >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-20% -10% auto auto",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 164, 77, 0.18), transparent 66%)",
          pointerEvents: "none",
        }}
      />

      <div className="dashboard-hero-content" style={{ position: "relative", display: "grid", gap: "24px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              color: "#f4b66a",
              fontSize: "12px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #ffd27f, #ff7e2f)",
                boxShadow: "0 0 20px rgba(255, 144, 52, 0.6)",
              }}
            />
            {eyebrow}
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "rgba(245, 247, 251, 0.78)",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                background: "#55d68a",
                boxShadow: "0 0 12px rgba(85, 214, 138, 0.75)",
              }}
            />
            {statusLabel}
          </div>
        </div>

        <div
          className="dashboard-hero-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.85fr)",
            gap: "20px",
            alignItems: "end",
          }}
        >
          <div style={{ display: "grid", gap: "16px" }}>
            <div
              style={{
                fontSize: "clamp(32px, 5vw, 58px)",
                lineHeight: 0.98,
                letterSpacing: "-0.04em",
                fontWeight: 800,
                maxWidth: "12ch",
              }}
            >
              {title}
            </div>
            {description ? (
              <div
                style={{
                  fontSize: "16px",
                  lineHeight: 1.7,
                  color: "rgba(245, 247, 251, 0.74)",
                  maxWidth: "68ch",
                }}
              >
                {description}
              </div>
            ) : null}

            {(primaryAction || secondaryAction) ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
                {primaryAction ? <ActionChip action={primaryAction} variant="primary" /> : null}
                {secondaryAction ? <ActionChip action={secondaryAction} variant="secondary" /> : null}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gap: "14px",
              justifyContent: "stretch",
            }}
          >
            {children ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "20px",
                  background: "rgba(6, 8, 12, 0.34)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {children}
              </div>
            ) : null}

            {metrics.length ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(metrics.length, 3)}, minmax(0, 1fr))`,
                  gap: "12px",
                }}
              >
                {metrics.slice(0, 3).map((metric) => {
                  const toneColor =
                    metric.tone === "good"
                      ? "#5ce08d"
                      : metric.tone === "warn"
                      ? "#ffd27f"
                      : "#f5f7fb";

                  return (
                    <div
                      key={metric.label}
                      style={{
                        borderRadius: "18px",
                        padding: "14px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.07)",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "rgba(245, 247, 251, 0.6)" }}>
                        {metric.label}
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px", color: toneColor }}>
                        {metric.value}
                      </div>
                      {metric.detail ? (
                        <div style={{ fontSize: "12px", marginTop: "6px", color: "rgba(245, 247, 251, 0.68)" }}>
                          {metric.detail}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .dashboard-hero-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        @media (max-width: 640px) {
          section {
            padding: 20px;
            border-radius: 22px;
          }
        }
      `}</style>
    </section>
  );
}
