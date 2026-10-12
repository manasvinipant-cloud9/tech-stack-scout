// Tiny client-side event helpers so any component (command palette, buttons) can open shared UI hosted in the app shell.
export type AddMode = "add" | "research";
export const openAddCompany = (mode: AddMode) => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("stack-add-company", { detail: { mode } }));
export const openPalette = () => typeof window !== "undefined" && window.dispatchEvent(new Event("stack-open-palette"));
