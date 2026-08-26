import { NextRequest, NextResponse } from "next/server";
import { getCourseSettings, saveCourseSettings } from "@/lib/sheets";
import type { CourseSetting } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: await getCourseSettings() });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body?.settings)) {
      return NextResponse.json({ error: "settings must be an array." }, { status: 400 });
    }

    const settings: CourseSetting[] = body.settings.map((value: Partial<CourseSetting>) => {
      const course = String(value.course || "").trim();
      const rawLimit = value.scanLimitDays;
      const scanLimitDays = rawLimit === null || rawLimit === undefined
        ? null
        : Number(rawLimit);
      if (!course || (scanLimitDays !== null && (!Number.isFinite(scanLimitDays) || scanLimitDays < 0))) {
        throw new Error("Each setting needs a course and a non-negative scan limit.");
      }
      return {
        course,
        scanLimitDays,
        validUntil: String(value.validUntil || "").trim(),
        active: value.active !== false,
      };
    });

    const uniqueCourses = new Set(settings.map((setting) => setting.course.toLowerCase()));
    if (uniqueCourses.size !== settings.length) {
      return NextResponse.json({ error: "Each course may appear only once." }, { status: 400 });
    }

    await saveCourseSettings(settings);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("PUT /api/admin/settings failed:", error);
    return NextResponse.json(
      { error: "Could not save settings. Create an 'Admin Settings' sheet tab first." },
      { status: 500 },
    );
  }
}