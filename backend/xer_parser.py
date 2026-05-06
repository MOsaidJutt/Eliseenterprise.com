"""
Primavera P6 XER file parser.
XER format: tab-delimited text with %T (table), %F (fields), %R (record) markers.
"""

import io
from dataclasses import dataclass, field
from typing import Any


@dataclass
class XerData:
    project: dict = field(default_factory=dict)
    tasks: list[dict] = field(default_factory=list)
    wbs: list[dict] = field(default_factory=list)
    taskrsrc: list[dict] = field(default_factory=list)
    rsrc: list[dict] = field(default_factory=list)
    projwbs: list[dict] = field(default_factory=list)
    calendars: list[dict] = field(default_factory=list)
    data_date: str = ""
    filename: str = ""


def parse_xer(content: bytes, filename: str = "") -> XerData:
    text = content.decode("utf-8", errors="replace")
    lines = text.splitlines()

    tables: dict[str, list[dict]] = {}
    current_table = None
    current_fields: list[str] = []

    for line in lines:
        if not line.strip():
            continue
        parts = line.split("\t")
        marker = parts[0].strip()

        if marker == "%T":
            current_table = parts[1].strip() if len(parts) > 1 else ""
            tables[current_table] = []
            current_fields = []
        elif marker == "%F":
            current_fields = [p.strip() for p in parts[1:]]
        elif marker == "%R":
            if current_table and current_fields:
                values = parts[1:]
                record: dict[str, Any] = {}
                for i, f in enumerate(current_fields):
                    record[f] = values[i].strip() if i < len(values) else ""
                tables[current_table].append(record)
        # %E marks end of file — ignore

    xer = XerData(filename=filename)
    xer.tasks = tables.get("TASK", [])
    xer.wbs = tables.get("PROJWBS", [])
    xer.projwbs = tables.get("PROJWBS", [])
    xer.taskrsrc = tables.get("TASKRSRC", [])
    xer.rsrc = tables.get("RSRC", [])
    xer.calendars = tables.get("CALENDAR", [])

    projects = tables.get("PROJECT", [])
    if projects:
        xer.project = projects[0]
        xer.data_date = projects[0].get("last_recalc_date", "")[:10]

    return xer
