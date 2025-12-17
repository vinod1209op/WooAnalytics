export function resolveDateRange(message: string, filters: any) {
  const text = (message || "").toLowerCase();
  const now = new Date();
  let from: string | undefined = filters.from;
  let to: string | undefined = filters.to;

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const setWindow = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    from = iso(start);
    to = iso(end);
  };

  if (!from || !to) {
    if (text.includes("last 7") || text.includes("past 7") || text.includes("previous week")) {
      setWindow(7);
    } else if (text.includes("last week")) {
      setWindow(7);
    } else if (text.includes("last 30") || text.includes("past 30") || text.includes("last month")) {
      setWindow(30);
    } else {
      setWindow(30);
    }
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
