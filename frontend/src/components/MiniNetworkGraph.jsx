import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { buildNetworkGraph, applyRadialLayout, drawNode, frameGraph, PERSON_COLOR, COMPANY_COLOR } from "../lib/networkGraph";

const COMPANY_DIST = 75;
const PERSON_DIST = 150;

export default function MiniNetworkGraph({ contacts, contact }) {
  const company = contact.company?.trim();
  const fgRef = useRef();
  const containerRef = useRef();
  const [width, setWidth] = useState(0);

  // Auto-sizing by react-force-graph-2d can measure 0 here: this box sits
  // inside a CSS-transformed slide-in drawer with overflow-y-auto, so we
  // size the canvas explicitly from the wrapper's real width instead.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const graph = useMemo(() => {
    // No "me" node here: this mini-graph centers on the contact being viewed,
    // not on the logged-in user (that's what the full Réseau page is for).
    const full = buildNetworkGraph(contacts, null);
    const personId = `person-${contact._id}`;
    const companyId = company ? `company-${company}` : null;

    const keepIds = new Set([personId]);
    if (companyId) {
      keepIds.add(companyId);
      for (const link of full.links) {
        if (link.target === companyId) keepIds.add(link.source);
      }
    }

    const nodes = full.nodes.filter((n) => keepIds.has(n.id));
    const links = full.links.filter((l) => companyId && l.target === companyId && keepIds.has(l.source));

    return applyRadialLayout({ nodes, links }, personId, { ringDist: COMPANY_DIST, leafDist: PERSON_DIST });
  }, [contacts, contact, company]);

  useEffect(() => {
    // Default view isn't reliably centered on our fixed-position nodes (same
    // issue fixed on the full Réseau page) — frame it explicitly once the
    // canvas has its real, stable dimensions.
    const t = setTimeout(() => frameGraph(fgRef.current, graph.nodes, width, 220, { padding: 30 }), 150);
    return () => clearTimeout(t);
  }, [graph, width]);

  return (
    <div>
      <div ref={containerRef} className="h-[220px] overflow-hidden rounded-xl border border-ink-300/60 bg-white">
        {width > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={width}
            height={220}
            graphData={graph}
            nodeId="id"
            nodeLabel="label"
            nodeColor={(n) => (n.type === "company" ? COMPANY_COLOR : PERSON_COLOR)}
            nodeVal="val"
            linkColor={() => "#E4E7EC"}
            nodeCanvasObjectMode={() => "replace"}
            nodeCanvasObject={drawNode}
            cooldownTicks={100}
          />
        )}
      </div>
      {!company && <p className="mt-2 text-xs text-ink-500">Pas d'entreprise renseignée — aucun lien à afficher pour ce contact.</p>}
    </div>
  );
}
