import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import toast from "react-hot-toast";
import { apiFetch } from "../api";
import { useAuth } from "../context/useAuth";
import {
  buildNetworkGraph,
  applyRadialLayout,
  drawNode,
  frameGraph,
  resolveCompanyDomains,
  PERSON_COLOR,
  COMPANY_COLOR,
  ME_COLOR,
} from "../lib/networkGraph";

export default function Network() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState(null);
  const [companyDomains, setCompanyDomains] = useState(new Map());
  const fgRef = useRef();
  const containerRef = useRef();
  const [width, setWidth] = useState(0);

  // Auto-sizing by react-force-graph-2d measures its container via a
  // ResizeObserver and re-centers on every resize it detects — the
  // feedback loop that caused never fit/zoom correctly. Measure the
  // container ourselves and pass fixed dimensions instead (same fix as
  // MiniNetworkGraph.jsx).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    apiFetch("/api/contacts?limit=1000")
      .then(async (data) => {
        // Resolve real domains (Brand Search API) before the graph is built
        // (and before the "Chargement…" gate below clears) — otherwise a
        // guessed ".com", or worse the wrong company's logo, would flash
        // briefly before being replaced once the search resolves.
        const names = data.contacts.map((c) => c.company?.trim()).filter(Boolean);
        setCompanyDomains(await resolveCompanyDomains(names));
        setContacts(data.contacts);
      })
      .catch((err) => toast.error(err.message));
  }, []);

  const graph = useMemo(() => {
    const g = buildNetworkGraph(contacts || [], user, companyDomains);
    return applyRadialLayout(g, "me", { ringDist: 220, leafDist: 410 });
  }, [contacts, user, companyDomains]);

  useEffect(() => {
    // Default view isn't reliably centered on our fixed-position nodes — frame
    // it explicitly once the canvas has its real, stable dimensions.
    const t = setTimeout(() => frameGraph(fgRef.current, graph.nodes, width, 600), 150);
    return () => clearTimeout(t);
  }, [graph, width]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Réseau</h1>
        <p className="mt-1 text-sm text-ink-500">
          Vos contacts reliés par entreprise commune — deux personnes dans la même entreprise se retrouvent connectées à la même bulle.
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: ME_COLOR }} />
          Vous
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: PERSON_COLOR }} />
          Personne
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: COMPANY_COLOR }} />
          Entreprise
        </span>
      </div>

      <div ref={containerRef} className="h-[600px] overflow-hidden rounded-xl border border-ink-300/60 bg-white">
        {!contacts ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">Chargement…</div>
        ) : graph.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">Aucun contact pour l'instant.</div>
        ) : width > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            width={width}
            height={600}
            graphData={graph}
            nodeId="id"
            nodeLabel="label"
            nodeColor={(n) => (n.type === "company" ? COMPANY_COLOR : n.type === "me" ? ME_COLOR : PERSON_COLOR)}
            nodeVal="val"
            linkColor={() => "#E4E7EC"}
            nodeCanvasObjectMode={() => "replace"}
            nodeCanvasObject={(node, ctx, scale) => drawNode(node, ctx, scale, { companyRadius: 15, showCompanyLogo: true })}
            // Not 0: positions are fixed so physics does nothing either way,
            // but the render loop keeps repainting for these ~60 frames —
            // long enough for async company logo loads (Brandfetch) to land
            // without needing a user interaction (zoom/pan) to redraw.
            cooldownTicks={60}
          />
        ) : null}
      </div>
    </div>
  );
}
