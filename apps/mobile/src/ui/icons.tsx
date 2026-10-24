import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
export type IconName =
  | "home"
  | "search"
  | "pin"
  | "clock"
  | "ticket"
  | "user"
  | "arrow"
  | "check"
  | "utensils"
  | "shield"
  | "close"
  | "leaf"
  | "locate"
  | "filter";
const paths: Record<IconName, string> = {
  filter: "M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6",
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  search: "m21 21-4.4-4.4",
  pin: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z",
  clock: "M12 7v5l3 2",
  ticket: "M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6Z M14 4v3m0 3v3m0 3v4",
  user: "M4 21v-2a8 8 0 0 1 16 0v2",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 4 4 10-10",
  utensils: "M4 3v5a3 3 0 0 0 6 0V3M7 3v18M20 3c-4 0-6 5-6 9h6m0-9v18",
  shield: "M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7Z m-5 9 3 3 6-6",
  close: "m6 6 12 12M18 6 6 18",
  leaf: "M20 3c-3 3-7 0-12 3-5 3-4 10 0 12 5 3 12-3 12-15ZM4 21 15 10",
  locate: "M12 2v3m0 14v3M2 12h3m14 0h3",
};
export function Icon({
  name,
  size = 20,
  color = "#202429",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <Path d={paths[name]} />
      {name === "search" && <Circle cx={10.8} cy={10.8} r={7.2} />}
      {name === "clock" && <Circle cx={12} cy={12} r={9} />}
      {name === "user" && <Circle cx={12} cy={7} r={4} />}
      {name === "pin" && <Circle cx={12} cy={10} r={2.5} />}
      {name === "locate" && <Circle cx={12} cy={12} r={7} />}
    </Svg>
  );
}
