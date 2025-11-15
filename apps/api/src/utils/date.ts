export function parseDateRange(query: any) {
  const now = new Date();

  const end = query.end ? new Date(query.end) : now;
  const start = query.start
    ? new Date(query.start)
    : new Date(end.getTime() - 29 * 86400000);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid start or end date");
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  );

  return { start, end, days };
}