export function resolveDateRange(message: string, filters: any) {
  const text = (message || "").toLowerCase();
  const now = new Date();
  let from: string | undefined = filters.from;
  let to: string | undefined = filters.to;
  let overrideApplied = false;

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const setCalendarMonth = (offsetMonths: number) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    from = iso(start);
    to = iso(end);
  };

  const setNamedMonth = (monthIndex: number, year?: number) => {
    const y = year ?? now.getUTCFullYear();
    const start = new Date(Date.UTC(y, monthIndex, 1));
    const end = new Date(Date.UTC(y, monthIndex + 1, 0));
    from = iso(start);
    to = iso(end);
  };

  const setWindow = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    from = iso(start);
    to = iso(end);
  };

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];

  const monthMatch = monthNames.findIndex((m) => text.includes(m));
  const yearMatch = text.match(/(20\d{2})/);

  // Detect explicit date phrases even if filters already set (override defaults)
  if (text.includes("last month") || text.includes("previous month")) {
    setCalendarMonth(-1);
    overrideApplied = true;
  } else if (monthMatch >= 0) {
    const year = yearMatch ? Number(yearMatch[1]) : undefined;
    setNamedMonth(monthMatch, year);
    overrideApplied = true;
  } else if (text.includes("this month") || text.includes("current month")) {
    setCalendarMonth(0);
    overrideApplied = true;
  } else if (text.includes("last 7") || text.includes("past 7") || text.includes("previous week")) {
    setWindow(7);
    overrideApplied = true;
  } else if (text.includes("last week")) {
    setWindow(7);
    overrideApplied = true;
  } else if (text.includes("last 30") || text.includes("past 30")) {
    setWindow(30);
    overrideApplied = true;
  }

  // Fallback when no range specified or override not applied
  if ((!from || !to) && !overrideApplied) {
    setWindow(30);
  }

  if (!from || !to) {
    const end = now;
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    from = from || iso(start);
    to = to || iso(end);
  }

  return { finalFrom: from, finalTo: to };
}
