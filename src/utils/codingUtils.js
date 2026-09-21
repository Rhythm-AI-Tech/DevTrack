export function getProblemsThisWeek(problems) {
  const today = new Date();

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return problems.filter((problem) => {
    const solvedDate = new Date(problem.solvedAt);

    return solvedDate >= startOfWeek && solvedDate <= today;
  });
}


export function getCurrentStreak(problems) {
  const solvedDates = [
    ...new Set(
      problems.map((problem) => problem.solvedAt)
    ),
  ].sort().reverse();

  if (solvedDates.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayString = today.toISOString().split("T")[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayString =
    yesterday.toISOString().split("T")[0];

  let currentDate;

  if (solvedDates.includes(todayString)) {
    currentDate = today;
  } else if (solvedDates.includes(yesterdayString)) {
    currentDate = yesterday;
  } else {
    return 0;
  }

  let streak = 0;

  for (const date of solvedDates) {
    const expectedDate =
      currentDate.toISOString().split("T")[0];

    if (date !== expectedDate) {
      break;
    }

    streak++;

    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}