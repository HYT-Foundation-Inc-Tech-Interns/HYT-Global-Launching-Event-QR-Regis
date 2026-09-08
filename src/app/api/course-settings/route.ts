import { NextResponse } from "next/server";
import { getCourseSettings } from "@/lib/sheets-new";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCourseSettings();
    return NextResponse.json({
      courses: settings.filter((setting) => setting.active).map((setting) => setting.course),
    });
  } catch (error) {
    console.error("GET /api/course-settings failed:", error);
    return NextResponse.json({ error: "Could not load courses." }, { status: 500 });
  }
}