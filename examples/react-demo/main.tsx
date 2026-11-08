import { createRoot } from "react-dom/client";
import { ScrollCanvasStage, StageBand, useStageSnapshot } from "../../engine/react/ScrollCanvasStage";
import { framesFromManifest, type FrameManifest } from "../../engine/core/manifest";

function StepLabel() {
  const s = useStageSnapshot();
  return <p className="step" aria-hidden="true">{s.status} · {Math.round(s.progress * 100)}%</p>;
}

async function boot() {
  const [lg, sm] = await Promise.all(["../static-demo/film/lg/manifest.json", "../static-demo/film/sm/manifest.json"]
    .map((u) => fetch(u).then((r) => r.json() as Promise<FrameManifest>)));
  createRoot(document.getElementById("root")!).render(
    <main>
      <ScrollCanvasStage
        label="Filme de teste sintético (React)"
        spanVh={500}
        spanVhMobile={420}
        keys={[[0, 0], [0.3, 70], [0.62, 70], [1, 119]]}
        poster={{ src: "../static-demo/film/poster.webp", width: 1600, height: 900 }}
        variants={[
          { media: "(max-aspect-ratio: 3/4)", frames: framesFromManifest(sm, "../static-demo/film/sm"), focal: [0.45, 0.5] },
          { frames: framesFromManifest(lg, "../static-demo/film/lg") },
        ]}
      >
        <StageBand at="0 0.22 0 0.08" className="band"><h1>Mesmo motor, em React.</h1><StepLabel /></StageBand>
        <StageBand at="0.34 0.6" className="band trail"><h2>Pausa com texto.</h2><p>O quadro segura entre 0,30 e 0,62.</p></StageBand>
        <StageBand at="0.78" className="band"><h2>Uma ação.</h2><p><a className="btn" href="#depois">Ver o restante</a></p></StageBand>
      </ScrollCanvasStage>
      <section className="after" id="depois"><h2>Depois do palco</h2><p>O pin libera sem salto.</p></section>
    </main>,
  );
}
void boot();
