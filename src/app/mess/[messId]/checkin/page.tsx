import prisma from "@/lib/prisma";
import { attendanceDay, dayKey, nearestMeal, MEAL_WINDOWS, type MealName } from "@/lib/mess";
import { CheckinList } from "./CheckinList";

export const metadata = { title: "Check-in" };

function parseMeal(raw: string | string[] | undefined, now: Date): MealName {
  const found = MEAL_WINDOWS.find((w) => w.meal === raw);
  return found?.meal ?? nearestMeal(now);
}

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ messId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { messId } = await params;
  const now = new Date();
  const day = attendanceDay(now);
  // Defaults to the meal being served, so staff at the door taps nothing extra.
  // Overridable, because catching up on this morning at noon is a real thing.
  const meal = parseMeal((await searchParams).meal, now);

  const students = await prisma.student.findMany({
    where: { messId, leftAt: null },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      attendance: { where: { day, meal }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <CheckinList
      // Remounts when the mess day or the chosen meal changes, so a tablet left
      // running all night starts the new day empty instead of showing yesterday.
      key={`${dayKey(day)}:${meal}`}
      messId={messId}
      meal={meal}
      students={students.map((s) => ({
        id: s.id,
        name: s.name,
        photoUrl: s.photoUrl,
        present: s.attendance.length > 0,
      }))}
    />
  );
}
