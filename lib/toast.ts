export type ToastTone = "success" | "error" | "info";
/** Fire-and-forget toast; the <Toaster /> in the app shell listens for it. */
export const toast = (message: string, tone: ToastTone = "success") => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("stack-toast", { detail: { message, tone } }));
};
