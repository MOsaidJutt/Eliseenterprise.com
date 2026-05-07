"""
Analytics engine: computes all 8 dashboard sections from parsed XER data.
"""

from datetime import datetime, timedelta
from collections import defaultdict
from xer_parser import XerData


def _parse_date(s: str) -> datetime | None:
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(s[:16], fmt)
        except ValueError:
            pass
    return None


def _fmt(d: datetime | None) -> str:
    return d.strftime("%d-%b-%y") if d else ""


def _week_start(d: datetime) -> datetime:
    return d - timedelta(days=d.weekday())


# ── 1. KPI Summary ──────────────────────────────────────────────────────────

def compute_kpis(xer: XerData, earliest_xer: "XerData | None" = None) -> dict:
    tasks = [t for t in xer.tasks if t.get("task_type") not in ("TT_LOE", "TT_WBS")]
    if not tasks:
        return {}

    total = len(tasks)
    completed = [t for t in tasks if t.get("status_code") == "TK_Complete"]
    in_progress = [t for t in tasks if t.get("status_code") == "TK_Active"]

    pct_values = []
    for t in tasks:
        try:
            pct_values.append(float(t.get("phys_complete_pct", 0)))
        except ValueError:
            pass
    overall_pct = round(sum(pct_values) / len(pct_values), 1) if pct_values else 0

    def _get_fa_date(xr: XerData) -> datetime | None:
        for t in xr.tasks:
            if t.get("task_type") == "TT_Mile" and (
                "-FA-F" in (t.get("task_code") or "")
                or "Final Acceptance" in (t.get("task_name") or "")
            ):
                return _parse_date(
                    t.get("early_start_date") or t.get("restart_date")
                    or t.get("target_start_date") or t.get("target_end_date")
                )
        return _parse_date(xr.project.get("scd_end_date", ""))

    fc_end = _get_fa_date(xer)
    bl_end = _get_fa_date(earliest_xer) if earliest_xer else fc_end

    delay_days = 0
    if bl_end and fc_end and fc_end > bl_end:
        delay_days = (fc_end - bl_end).days

    # SPI
    pv_total = 0.0
    ev_total = 0.0
    for t in tasks:
        try:
            pv_total += float(t.get("target_drtn_hr_cnt", 0) or 0)
            ev_total += float(t.get("target_drtn_hr_cnt", 0) or 0) * float(t.get("phys_complete_pct", 0) or 0) / 100
        except (ValueError, TypeError):
            pass

    bl_pct = overall_pct  # approximation when baseline not separate
    spi = round(ev_total / pv_total, 2) if pv_total > 0 else 1.0

    # Critical path
    critical = [t for t in tasks if _is_critical(t)]
    critical_pct = round(len(critical) / total * 100, 1) if total else 0

    # Negative float activities
    neg_float = [t for t in tasks if _total_float_days(t) < 0]

    return {
        "overall_pct_complete": overall_pct,
        "baseline_pct": 100.0,
        "spi": spi,
        "delay_days": delay_days,
        "total_activities": total,
        "completed_activities": len(completed),
        "in_progress_activities": len(in_progress),
        "critical_activities": len(critical),
        "critical_path_risk_pct": critical_pct,
        "neg_float_activities": len(neg_float),
        "data_date": xer.data_date,
        "project_name": xer.project.get("proj_short_name", ""),
        "planned_end": _fmt(bl_end),
        "forecast_end": _fmt(fc_end),
    }


def _is_critical(t: dict) -> bool:
    try:
        return float(t.get("total_float_hr_cnt", 1) or 1) <= 0
    except (ValueError, TypeError):
        return False


def _total_float_days(t: dict) -> float:
    try:
        return float(t.get("total_float_hr_cnt", 0) or 0) / 8
    except (ValueError, TypeError):
        return 0


# ── 2. SPI by Contractor (via RSRC) ──────────────────────────────────────────

def compute_spi_by_contractor(xer: XerData) -> list[dict]:
    rsrc_map = {r["rsrc_id"]: r.get("rsrc_name", r["rsrc_id"]) for r in xer.rsrc}
    task_map = {t["task_id"]: t for t in xer.tasks}
    data_date = _parse_date(xer.data_date)

    # Filter to labour resources only (exclude roles)
    labour_ids = {r["rsrc_id"] for r in xer.rsrc if r.get("rsrc_type", "") == "RT_Labor"}

    groups: dict[str, dict] = defaultdict(lambda: {"pv": 0.0, "ev": 0.0})

    for tr in xer.taskrsrc:
        rsrc_id = tr.get("rsrc_id", "")
        if rsrc_id not in labour_ids:
            continue
        task = task_map.get(tr.get("task_id", ""), {})
        if task.get("task_type") in ("TT_LOE", "TT_WBS", "TT_Mile"):
            continue

        rsrc_name = rsrc_map.get(rsrc_id, rsrc_id)
        try:
            target_qty = float(tr.get("target_qty", 0) or 0)
            pct = float(task.get("phys_complete_pct", 0) or 0) / 100
            groups[rsrc_name]["pv"] += target_qty
            groups[rsrc_name]["ev"] += target_qty * pct
        except (ValueError, TypeError):
            pass

    result = []
    for name, g in groups.items():
        if g["pv"] < 10:  # skip tiny resources
            continue
        spi = round(g["ev"] / g["pv"], 2) if g["pv"] > 0 else 0
        result.append({
            "contractor": name,
            "pv": round(g["pv"], 0),
            "ev": round(g["ev"], 0),
            "spi": spi,
        })

    result.sort(key=lambda x: x["spi"])
    return result[:15]


# ── 3. PPC – Planned Percent Complete ────────────────────────────────────────

def compute_ppc(xers: list[XerData]) -> list[dict]:
    """
    For each consecutive pair of XER snapshots, compute PPC starts and finishes.
    PPC = activities that were planned to start/finish in the period and actually did.
    """
    if len(xers) < 2:
        return []

    rows = []
    sorted_xers = sorted(xers, key=lambda x: x.data_date)

    for i in range(1, len(sorted_xers)):
        prev = sorted_xers[i - 1]
        curr = sorted_xers[i]
        dd_prev = _parse_date(prev.data_date)
        dd_curr = _parse_date(curr.data_date)
        if not dd_prev or not dd_curr:
            continue

        prev_tasks = {t["task_id"]: t for t in prev.tasks}
        curr_tasks = {t["task_id"]: t for t in curr.tasks}

        planned_starts = planned_finishes = actual_starts = actual_finishes = 0

        for tid, ct in curr_tasks.items():
            if ct.get("task_type") in ("TT_LOE", "TT_WBS", "TT_Mile"):
                continue
            pt = prev_tasks.get(tid, {})

            # Planned start: target_start_date falls in window
            ts = _parse_date(ct.get("target_start_date", ""))
            tf = _parse_date(ct.get("target_end_date", ""))

            if ts and dd_prev <= ts < dd_curr:
                planned_starts += 1
                # Did it actually start within this period?
                acts = _parse_date(ct.get("act_start_date", ""))
                if acts and dd_prev <= acts <= dd_curr:
                    actual_starts += 1

            if tf and dd_prev <= tf < dd_curr:
                planned_finishes += 1
                actf = _parse_date(ct.get("act_end_date", ""))
                if actf and dd_prev <= actf <= dd_curr:
                    actual_finishes += 1

        total_planned = planned_starts + planned_finishes
        total_actual = actual_starts + actual_finishes
        ppc_s = round(actual_starts / planned_starts * 100) if planned_starts else 0
        ppc_f = round(actual_finishes / planned_finishes * 100) if planned_finishes else 0
        ppc_t = round(total_actual / total_planned * 100) if total_planned else 0

        rows.append({
            "data_date": curr.data_date,
            "activity_count": len(curr.tasks),
            "ppc_starts_actual": actual_starts,
            "ppc_starts_planned": planned_starts,
            "ppc_finishes_actual": actual_finishes,
            "ppc_finishes_planned": planned_finishes,
            "ppc_s_pct": ppc_s,
            "ppc_f_pct": ppc_f,
            "ppc_t_pct": ppc_t,
        })

    return rows


# ── 4. S-Curve ───────────────────────────────────────────────────────────────

def compute_scurve(xer: XerData) -> dict:
    tasks = [t for t in xer.tasks if t.get("task_type") not in ("TT_LOE", "TT_WBS")]
    if not tasks:
        return {"baseline": [], "actual": [], "forecast": []}

    proj_start = _parse_date(xer.project.get("plan_start_date", ""))
    proj_end = _parse_date(xer.project.get("scd_end_date", ""))
    data_date = _parse_date(xer.data_date)

    if not proj_start or not proj_end:
        return {"baseline": [], "actual": [], "forecast": []}

    # Build weekly buckets
    week = timedelta(weeks=1)
    buckets = []
    d = proj_start
    while d <= proj_end + timedelta(weeks=12):
        buckets.append(d)
        d += week

    total_dur = sum(
        float(t.get("target_drtn_hr_cnt", 0) or 0) for t in tasks
    ) or 1

    def spread_pct(start: datetime | None, end: datetime | None, weight: float) -> list[float]:
        if not start or not end or end <= start:
            return [0.0] * len(buckets)
        span = (end - start).total_seconds()
        values = [0.0] * len(buckets)
        for i, b in enumerate(buckets):
            b_end = b + week
            overlap_start = max(b, start)
            overlap_end = min(b_end, end)
            if overlap_end > overlap_start:
                overlap = (overlap_end - overlap_start).total_seconds()
                values[i] = weight * overlap / span
        return values

    bl_weekly = [0.0] * len(buckets)
    act_weekly = [0.0] * len(buckets)
    fc_weekly = [0.0] * len(buckets)

    for t in tasks:
        dur = float(t.get("target_drtn_hr_cnt", 0) or 0)
        weight = dur / total_dur * 100

        # Baseline series: target dates
        t_start = _parse_date(t.get("target_start_date", ""))
        t_end = _parse_date(t.get("target_end_date", ""))
        for i, v in enumerate(spread_pct(t_start, t_end, weight)):
            bl_weekly[i] += v

        act_s = _parse_date(t.get("act_start_date", ""))
        act_e = _parse_date(t.get("act_end_date", ""))
        status = t.get("status_code", "")
        pct = float(t.get("phys_complete_pct", 0) or 0) / 100
        e_start = _parse_date(t.get("early_start_date", "") or t.get("restart_date", ""))
        e_end = _parse_date(t.get("early_end_date", "") or t.get("reend_date", ""))

        # Actual series: up to data date
        if status == "TK_Complete" and act_s and act_e:
            for i, v in enumerate(spread_pct(act_s, act_e, weight)):
                act_weekly[i] += v
        elif status == "TK_Active" and act_s and data_date:
            partial_end = min(data_date, act_e or data_date)
            for i, v in enumerate(spread_pct(act_s, partial_end, weight * pct)):
                act_weekly[i] += v

        # Forecast series: blend of actual (done) + projected (remaining)
        # Complete → use actual dates (same as actual series)
        # Active  → actual start→data date for done %, then data date→early end for remaining %
        # Not started → early dates for full weight
        if status == "TK_Complete" and act_s and act_e:
            for i, v in enumerate(spread_pct(act_s, act_e, weight)):
                fc_weekly[i] += v
        elif status == "TK_Active" and act_s and data_date:
            partial_end = min(data_date, act_e or data_date)
            for i, v in enumerate(spread_pct(act_s, partial_end, weight * pct)):
                fc_weekly[i] += v
            fc_end = e_end or t_end
            if fc_end and fc_end > data_date:
                for i, v in enumerate(spread_pct(data_date, fc_end, weight * (1 - pct))):
                    fc_weekly[i] += v
        else:
            for i, v in enumerate(spread_pct(e_start or t_start, e_end or t_end, weight)):
                fc_weekly[i] += v

    # Cumulative
    def cumsum(arr: list[float]) -> list[float]:
        result, s = [], 0.0
        for v in arr:
            s += v
            result.append(round(min(s, 100), 2))
        return result

    labels = [b.strftime("%Y-%m-%d") for b in buckets]
    return {
        "labels": labels,
        "baseline": cumsum(bl_weekly),
        "actual": cumsum(act_weekly),
        "forecast": cumsum(fc_weekly),
        "data_date": xer.data_date,
    }


# ── 5. Resource Histogram ────────────────────────────────────────────────────

def compute_resource_histogram(xer: XerData) -> list[dict]:
    rsrc_map = {r["rsrc_id"]: r for r in xer.rsrc}
    task_map = {t["task_id"]: t for t in xer.tasks}

    monthly: dict[str, dict] = defaultdict(lambda: {"planned": 0.0, "actual": 0.0})

    for tr in xer.taskrsrc:
        task = task_map.get(tr.get("task_id", ""), {})
        t_start = _parse_date(task.get("target_start_date", "")) or _parse_date(task.get("act_start_date", ""))
        if not t_start:
            continue
        month_key = t_start.strftime("%b-%y")
        try:
            planned = float(tr.get("target_qty", 0) or 0)
            actual = float(tr.get("act_reg_qty", 0) or 0)
            monthly[month_key]["planned"] += planned / 8  # convert hours → days
            monthly[month_key]["actual"] += actual / 8
        except (ValueError, TypeError):
            pass

    # Sort chronologically
    def month_order(k: str) -> datetime:
        try:
            return datetime.strptime(k, "%b-%y")
        except ValueError:
            return datetime.max

    result = [
        {"month": k, "planned": round(v["planned"]), "actual": round(v["actual"])}
        for k, v in sorted(monthly.items(), key=lambda x: month_order(x[0]))
    ]
    return result


# ── 6. Float Erosion ─────────────────────────────────────────────────────────

def compute_float_erosion(xers: list[XerData]) -> list[dict]:
    if len(xers) < 2:
        return []

    sorted_xers = sorted(xers, key=lambda x: x.data_date)
    baseline = sorted_xers[0]
    current = sorted_xers[-1]
    previous = sorted_xers[-2] if len(sorted_xers) > 2 else sorted_xers[0]

    def build_float_map(xer: XerData) -> dict[str, float]:
        return {
            t["task_id"]: float(t.get("total_float_hr_cnt", 0) or 0) / 8
            for t in xer.tasks
            if t.get("task_type") not in ("TT_LOE", "TT_WBS")
        }

    bl_map = build_float_map(baseline)
    prev_map = build_float_map(previous)
    curr_map = build_float_map(current)

    def erosion_stats(old: dict, new: dict, old_label: str, new_label: str) -> dict:
        eroded_total = 0.0
        eroded_count = 0
        increased_count = 0
        common_ids = set(old) & set(new)
        for tid in common_ids:
            diff = new[tid] - old[tid]
            if diff < 0:
                eroded_total += diff
                eroded_count += 1
            elif diff > 0:
                increased_count += 1
        total = len(common_ids)
        pct_eroded = round(eroded_count / total * 100, 1) if total else 0
        return {
            "comparison": f"{old_label} vs {new_label}",
            "previous_dd": old_label,
            "current_dd": new_label,
            "eroded_float_days": round(eroded_total, 0),
            "eroded_activities": eroded_count,
            "increased_activities": increased_count,
            "total_compared": total,
            "pct_eroded": pct_eroded,
        }

    return [
        erosion_stats(bl_map, curr_map, baseline.data_date, current.data_date),
        erosion_stats(prev_map, curr_map, previous.data_date, current.data_date),
    ]


# ── 7. Milestone Tracker ─────────────────────────────────────────────────────

def compute_milestones(xer: XerData) -> list[dict]:
    milestones = [t for t in xer.tasks if t.get("task_type") == "TT_Mile"]
    rows = []
    for m in milestones:
        bl = _parse_date(m.get("target_start_date", ""))
        act = _parse_date(m.get("act_start_date", ""))
        fc = _parse_date(m.get("early_start_date", "") or m.get("restart_date", ""))
        status = m.get("status_code", "")

        if status == "TK_Complete":
            variance = (act - bl).days if act and bl else 0
            status_label = "Hit" if variance >= 0 else "Missed"
            if variance > 0:
                status_label = "Hit (early)"
        else:
            variance = (fc - bl).days if fc and bl else 0
            status_label = "Not Started (Delayed)" if variance < 0 else "Forecast On Track"

        rows.append({
            "task_code": m.get("task_code", ""),
            "task_name": m.get("task_name", ""),
            "baseline": _fmt(bl),
            "actual": _fmt(act),
            "forecast": _fmt(fc if status != "TK_Complete" else None),
            "variance_days": variance,
            "status": status_label,
        })

    rows.sort(key=lambda x: x["variance_days"])
    return rows


# ── 8. Critical Path ─────────────────────────────────────────────────────────

def compute_critical_path(xer: XerData) -> list[dict]:
    critical = []
    for t in xer.tasks:
        if t.get("task_type") in ("TT_LOE", "TT_WBS"):
            continue
        tf = _total_float_days(t)
        if tf <= 0:
            e_end = _parse_date(t.get("early_end_date", "") or t.get("reend_date", ""))
            critical.append({
                "task_code": t.get("task_code", ""),
                "task_name": t.get("task_name", ""),
                "total_float_days": round(tf, 1),
                "status": t.get("status_code", ""),
                "pct_complete": t.get("phys_complete_pct", "0"),
                "forecast_end": _fmt(e_end),
            })
    critical.sort(key=lambda x: x["total_float_days"])
    return critical[:50]


# ── 9. Observations / Risk ───────────────────────────────────────────────────

def compute_observations(kpis: dict, ppc_rows: list, float_erosion: list) -> list[str]:
    obs = []
    pct = kpis.get("overall_pct_complete", 0)
    spi = kpis.get("spi", 1)
    delay = kpis.get("delay_days", 0)
    crit_pct = kpis.get("critical_path_risk_pct", 0)

    obs.append(
        f"Current progress is {pct}% against a baseline of 100% — a gap of {round(100 - pct, 1)}%."
    )

    if spi < 1:
        obs.append(
            f"Overall SPI is {spi}, indicating the project is earning value at {round(spi * 100)}% of the planned rate."
        )

    if delay > 0:
        obs.append(
            f"Phase 1 Final Acceptance is forecast {delay} calendar days behind the baseline."
        )

    if crit_pct > 50:
        obs.append(
            f"Critical path risk is very high ({crit_pct}%) — there is a high probability of further slippage to the FA date."
        )

    if ppc_rows:
        last = ppc_rows[-1]
        ppc_t = last.get("ppc_t_pct", 0)
        obs.append(
            f"Last period total PPC is {ppc_t}% of scheduled starts/finishes achieved "
            f"({last['ppc_finishes_actual'] + last['ppc_starts_actual']} / "
            f"{last['ppc_finishes_planned'] + last['ppc_starts_planned']})."
        )

    if float_erosion:
        fe = float_erosion[0]
        obs.append(
            f"Float erosion vs baseline: {fe['eroded_float_days']} days consumed across "
            f"{fe['eroded_activities']} activities ({fe['pct_eroded']}% of schedule)."
        )

    neg = kpis.get("neg_float_activities", 0)
    if neg > 0:
        obs.append(
            f"{neg} activities have negative total float, confirming delays cannot be absorbed within the current schedule."
        )

    return obs


# ── Master compute ────────────────────────────────────────────────────────────

def compute_all(xers: list[XerData]) -> dict:
    if not xers:
        return {"error": "No XER files provided"}

    sorted_xers = sorted(xers, key=lambda x: x.data_date)
    latest = sorted_xers[-1]

    earliest = sorted_xers[0]
    kpis = compute_kpis(latest, earliest_xer=earliest if len(sorted_xers) > 1 else None)
    spi_contractors = compute_spi_by_contractor(latest)
    ppc = compute_ppc(sorted_xers)
    scurve = compute_scurve(latest)
    resources = compute_resource_histogram(latest)
    float_erosion = compute_float_erosion(sorted_xers)
    milestones = compute_milestones(latest)
    critical = compute_critical_path(latest)
    observations = compute_observations(kpis, ppc, float_erosion)

    return {
        "kpis": kpis,
        "spi_by_contractor": spi_contractors,
        "ppc": ppc,
        "scurve": scurve,
        "resources": resources,
        "float_erosion": float_erosion,
        "milestones": milestones,
        "critical_path": critical,
        "observations": observations,
        "files_analyzed": [x.filename for x in sorted_xers],
        "data_dates": [x.data_date for x in sorted_xers],
    }
