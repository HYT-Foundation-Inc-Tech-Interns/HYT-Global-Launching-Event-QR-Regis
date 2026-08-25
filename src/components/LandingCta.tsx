"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingCta() {
  const [passportId, setPassportId] = useState("");

  useEffect(() => {
    setPassportId(localStorage.getItem("hyt_passport_id") || "");
  }, []);

  return (
    <Link
      href={passportId ? `/passport/${encodeURIComponent(passportId)}` : "/register"}
      className="w-full rounded-xl bg-[#0C005B] px-6 py-3 font-semibold text-white shadow transition hover:bg-[#ffd301] hover:text-[#0C005B] sm:w-auto"
    >
      {passportId ? "Open Passport" : "Register as a Guest"}
    </Link>
  );
}