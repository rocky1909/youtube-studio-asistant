import type { ReactNode } from "react";

export type StatCardProps = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  delta?: ReactNode;
  deltaTone?: "positive" | "negative" | "neutral" | "warning";
  icon?: ReactNode;
  status?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const deltaColors: Record<NonNullable<StatCardProps["deltaTone"]>, string> = {
  positive: "#5ce08d",
  negative: "#ff7a7a",
  neutral: "#d6deeb",
  warning: "#ffd27f",
};

export function StatCard({
  label,
  value,
  description,
  delta,
  deltaTone = "neutral",
  icon,
  status,
  footer,
  className,
}: StatCardProps) {
  const accent = deltaColors[deltaTone];

  return (
    <article
      className={className}
      style={{
        height: "100%",
        padding: "18px",
        borderRadius: "22px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background:
          "linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03)), radial-gradient(circle at top right, rgba(255, 150, 74, 0.16), transparent 42%)",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.24)",
      }}
    >
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "grid", gap: "8px", minWidth: 0 }}>
            <div
              style={{
                fontSize: "12px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(245, 247, 251, 0.58)",
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: "clamp(24px, 3.2vw, 38px)", lineHeight: 1, fontWeight: 800 }}>
              {value}
            </div>
          </div>

          {icon ? (
            <div
              aria-hidden="true"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                display: "grid",
                placeItems: "center",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#ffd08a",
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          ) : null}
        </div>

        {description || delta || status ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            {delta ? (
              <div
                style={{
                  color: accent,
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {delta}
              </div>
            ) : null}
            {status ? (
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(245, 247, 251, 0.68)",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.04)",
                }}
              >
                {status}
              </div>
            ) : null}
          </div>
        ) : null}

        {description ? (
          <div style={{ fontSize: "13px", lineHeight: 1.55, color: "rgba(245, 247, 251, 0.68)" }}>
            {description}
          </div>
        ) : null}

        {footer ? (
          <div
            style={{
              paddingTop: "12px",
              marginTop: "4px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "13px",
              color: "rgba(245, 247, 251, 0.74)",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </article>
  );
}

