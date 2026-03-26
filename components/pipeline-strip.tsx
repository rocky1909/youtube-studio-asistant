import type { ReactNode } from "react";

export type PipelineStageStatus = "complete" | "active" | "queued" | "blocked" | "error";

export type PipelineStage = {
  label: string;
  detail?: ReactNode;
  count?: ReactNode;
  status?: PipelineStageStatus;
};

export type PipelineStripProps = {
  title?: string;
  description?: string;
  stages: PipelineStage[];
  activeIndex?: number;
  children?: ReactNode;
  className?: string;
};

const statusConfig: Record<PipelineStageStatus, { label: string; color: string; glow: string }> = {
  complete: { label: "Complete", color: "#5ce08d", glow: "rgba(92, 224, 141, 0.22)" },
  active: { label: "Working", color: "#ffd27f", glow: "rgba(255, 210, 127, 0.24)" },
  queued: { label: "Queued", color: "#9aa6bd", glow: "rgba(154, 166, 189, 0.14)" },
  blocked: { label: "Blocked", color: "#ff9b6b", glow: "rgba(255, 155, 107, 0.16)" },
  error: { label: "Error", color: "#ff7a7a", glow: "rgba(255, 122, 122, 0.18)" },
};

export function PipelineStrip({
  title = "Pipeline",
  description,
  stages,
  activeIndex = 0,
  children,
  className,
}: PipelineStripProps) {
  return (
    <section
      className={className}
      style={{
        padding: "20px",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03))",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#f4b66a",
            }}
          >
            Workflow strip
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "8px" }}>{title}</div>
          {description ? (
            <div style={{ fontSize: "13px", color: "rgba(245, 247, 251, 0.68)", marginTop: "6px" }}>
              {description}
            </div>
          ) : null}
        </div>
        {children ? <div>{children}</div> : null}
      </div>

      <div
        className="pipeline-strip-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(0, 1fr))`,
          gap: "12px",
        }}
      >
        {stages.map((stage, index) => {
          const status =
            stage.status ??
            (index < activeIndex ? "complete" : index === activeIndex ? "active" : "queued");
          const config = statusConfig[status];

          return (
            <div
              key={stage.label}
              style={{
                position: "relative",
                borderRadius: "18px",
                padding: "16px",
                background: `linear-gradient(180deg, ${config.glow}, rgba(255, 255, 255, 0.04))`,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                minHeight: "112px",
                display: "grid",
                gap: "10px",
                alignContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "grid", gap: "6px" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      width: "fit-content",
                      gap: "8px",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      color: config.color,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${config.color}33`,
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "999px",
                        background: config.color,
                        boxShadow: `0 0 12px ${config.glow}`,
                      }}
                    />
                    {config.label}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>{stage.label}</div>
                </div>
                {stage.count != null ? (
                  <div
                    style={{
                      minWidth: "42px",
                      padding: "8px 10px",
                      borderRadius: "12px",
                      textAlign: "center",
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#f5f7fb",
                      background: "rgba(0, 0, 0, 0.18)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {stage.count}
                  </div>
                ) : null}
              </div>

              {stage.detail ? (
                <div style={{ fontSize: "13px", lineHeight: 1.55, color: "rgba(245, 247, 251, 0.72)" }}>
                  {stage.detail}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .pipeline-strip-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </section>
  );
}
