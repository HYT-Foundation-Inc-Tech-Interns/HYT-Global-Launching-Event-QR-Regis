import type { SVGProps } from "react";
import {
  BriefcaseBusiness,
  GraduationCap,
  Handshake,
  Lightbulb,
  Rocket,
} from "lucide-react";

type StampIconProps = SVGProps<SVGSVGElement> & {
  floor: number;
};

export default function StampIcon({ floor, ...props }: StampIconProps) {
  const Icon = {
    1: Handshake,
    2: Lightbulb,
    3: GraduationCap,
    4: BriefcaseBusiness,
    5: Rocket,
  }[floor as 1 | 2 | 3 | 4 | 5] ?? Lightbulb;

  return <Icon {...props} aria-hidden="true" />;
}