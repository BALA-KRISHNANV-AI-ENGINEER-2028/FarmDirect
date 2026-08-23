import type { Category } from "../types";

export interface CategoryDef {
  name: Category;
  icon: string;
  color: string;
}

export const categories: CategoryDef[] = [
  { name: "Vegetables", icon: "eco", color: "#2d5a27" },
  { name: "Fruits", icon: "nutrition", color: "#c25b3b" },
  { name: "Grains", icon: "grain", color: "#a1752f" },
  { name: "Spices", icon: "local_fire_department", color: "#b23a2f" },
  { name: "Dairy", icon: "water_drop", color: "#5d7fa3" },
  { name: "Nuts & Oils", icon: "spa", color: "#7b4101" },
];
