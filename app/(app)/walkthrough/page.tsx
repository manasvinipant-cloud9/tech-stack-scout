import type { Metadata } from "next";
import { Download, FileText } from "lucide-react";
import { PageHeader, Panel, btnPrimary, btnSecondary } from "@/components/ui";

export const metadata: Metadata = { title: "Walkthrough · Stack Scout" };

/** A narrated walkthrough of the whole project (problem, architecture, AI design, product, build story, limits) for the viva. */
export default function Walkthrough() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Project walkthrough" subtitle="A 14-minute narrated tour of Stack Scout: the problem, the architecture, how the AI is kept honest, the product, how it was built, and its limits."
        actions={<>
          <a href="/Stack_Scout_Walkthrough.mp4" download className={btnPrimary}><Download className="h-4 w-4" /> Download video</a>
          <a href="/Stack_Scout_Viva_Notes.pdf" download className={btnSecondary}><FileText className="h-4 w-4" /> Viva notes (PDF)</a>
        </>} />
      <Panel className="overflow-hidden p-0">
        <video controls preload="metadata" poster="/Stack_Scout_Walkthrough_poster.jpg" className="aspect-video w-full bg-black">
          <source src="/Stack_Scout_Walkthrough.mp4" type="video/mp4" />
          <track kind="subtitles" src="/Stack_Scout_Walkthrough.vtt" srcLang="en" label="English" default />
          Your browser cannot play this video. <a href="/Stack_Scout_Walkthrough.mp4">Download it instead.</a>
        </video>
      </Panel>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-3">
        <a className="link" href="/Stack_Scout_Walkthrough.srt" download>Subtitles (.srt)</a>
        <a className="link" href="/Stack_Scout_Viva_Notes.md" download>Viva notes (Markdown)</a>
        <a className="link" href="/components-map">Components map</a>
      </div>
    </div>
  );
}
