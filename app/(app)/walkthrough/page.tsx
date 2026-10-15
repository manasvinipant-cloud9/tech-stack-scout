import type { Metadata } from "next";
import { Download, FileText } from "lucide-react";
import { PageHeader, Panel, SectionHeader, btnPrimary, btnSecondary } from "@/components/ui";

export const metadata: Metadata = { title: "Videos · Stack Scout" };

function Player({ base, poster }: { base: string; poster: string }) {
  return (
    <Panel className="overflow-hidden p-0">
      <video controls preload="metadata" poster={poster} className="aspect-video w-full bg-black">
        <source src={`${base}.mp4`} type="video/mp4" />
        <track kind="subtitles" src={`${base}.vtt`} srcLang="en" label="English" default />
        Your browser cannot play this video. <a href={`${base}.mp4`}>Download it instead.</a>
      </video>
    </Panel>
  );
}

/** Two narrated videos: a day-in-the-life product demo, and a technical walkthrough for the viva. */
export default function Videos() {
  return (
    <div className="max-w-5xl space-y-10">
      <PageHeader title="Videos" subtitle="See Stack Scout used on a real working day, then how it was built." />

      <section>
        <SectionHeader title="A day in Nikhil's life" hint="Product demo · 4 min 42 s · recorded on this live app" action={<a href="/Stack_Scout_Demo.mp4" download className={btnPrimary}><Download className="h-4 w-4" /> Download</a>} />
        <p className="mb-3 max-w-3xl text-sm text-ink-3">From &ldquo;which accounts matter today?&rdquo; to a call brief, a new lead researched in about twenty seconds, an opening line, and planning next week&apos;s outreach.</p>
        <Player base="/Stack_Scout_Demo" poster="/Stack_Scout_Demo_poster.jpg" />
        <p className="mt-2 text-[13px] text-ink-3"><a className="link" href="/Stack_Scout_Demo.srt" download>Subtitles (.srt)</a></p>
      </section>

      <section>
        <SectionHeader title="Technical walkthrough" hint="Architecture, AI design and build story · 14 min" action={<a href="/Stack_Scout_Walkthrough.mp4" download className={btnSecondary}><Download className="h-4 w-4" /> Download</a>} />
        <p className="mb-3 max-w-3xl text-sm text-ink-3">The problem, the components, how the AI is kept honest, the product tour, the problems we hit, and the limits.</p>
        <Player base="/Stack_Scout_Walkthrough" poster="/Stack_Scout_Walkthrough_poster.jpg" />
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-3">
          <a className="link" href="/Stack_Scout_Walkthrough.srt" download>Subtitles (.srt)</a>
          <a className="link" href="/Stack_Scout_Viva_Notes.pdf" download><FileText className="mr-1 inline h-3.5 w-3.5" />Viva notes (PDF)</a>
          <a className="link" href="/components-map">Components map</a>
        </div>
      </section>
    </div>
  );
}
