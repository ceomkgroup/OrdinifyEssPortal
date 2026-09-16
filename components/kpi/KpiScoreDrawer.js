"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { FieldBlock, HintBanner } from "@/components/team/TeamDrawer";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatKpiNumber } from "@/lib/kpi";

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

export function KpiScoreDrawer({
  open,
  mode = "self",
  kpi = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const isSelf = mode === "self";
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setFormError("");
      const current = isSelf ? kpi?.selfScore : kpi?.managerScore;
      const note = isSelf ? kpi?.selfComment : kpi?.managerComment;
      setScore(current == null ? "" : String(current));
      setComment(note || "");
    });
    return () => {
      alive = false;
    };
  }, [open, isSelf, kpi?.scoreId, kpi?.selfScore, kpi?.managerScore, kpi?.selfComment, kpi?.managerComment]);

  async function handleSubmit() {
    setFormError("");
    const n = Number(score);
    if (!Number.isFinite(n)) {
      setFormError("Enter a numeric score.");
      return;
    }
    try {
      await onSubmit?.({
        score: n,
        comment: comment.trim(),
      });
    } catch (err) {
      setFormError(
        getApiErrorMessage(
          err,
          isSelf ? "Could not save self-assessment." : "Could not save rating."
        )
      );
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isSelf ? "Self-assessment" : "Rate KPI"}
      subtitle={kpi?.kpiName || ""}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-[100px] rounded-xl"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 min-w-[140px] rounded-xl"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving…" : isSelf ? "Save score" : "Save rating"}
          </Button>
        </div>
      }
    >
      {formError ? (
        <p className="mb-3 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]">
          {formError}
        </p>
      ) : null}

      <div className="space-y-4">
        <HintBanner>
          {isSelf
            ? "This is your self-assessment for a manually measured KPI. Target stays as set by HR."
            : "Rate this team member’s manual KPI. Your score is stored against this period."}
        </HintBanner>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Weight
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">
              {formatKpiNumber(kpi?.weight)}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Target
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">
              {formatKpiNumber(kpi?.target)}
            </p>
          </div>
        </div>

        <FieldBlock
          label={isSelf ? "Self score" : "Manager score"}
          required
          hint="Use the scale your company defined for this KPI"
        >
          <input
            className={fieldClass}
            type="number"
            inputMode="decimal"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="0"
          />
        </FieldBlock>

        <FieldBlock
          label="Comment"
          hint={isSelf ? "Optional note for your manager" : "Optional note for the employee"}
        >
          <textarea
            className={`${fieldClass} h-24 py-2.5`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isSelf
                ? "Anything your manager should know?"
                : "Feedback on this KPI"
            }
          />
        </FieldBlock>
      </div>
    </SlideOver>
  );
}
