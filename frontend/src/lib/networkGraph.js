export const PERSON_COLOR = "#465FFF";
export const COMPANY_COLOR = "#F79009";
export const ME_COLOR = "#12B76A";

// Builds { nodes, links } for react-force-graph-2d from a contacts array and
// the logged-in user. Node shape: { id, label, type: "me"|"person"|"company", val }.
// Link shape: { source, target } (node ids). When currentUser is set, "me" links
// to each distinct company (once) rather than to every person directly; a contact
// with no company links straight to "me" instead, so nobody is left unreachable.
export function buildNetworkGraph(contacts, currentUser) {
  const nodes = [];
  const links = [];
  const companyIds = new Map();

  if (currentUser) {
    nodes.push({ id: "me", label: `${currentUser.firstName} ${currentUser.lastName}`, type: "me", val: 9 });
  }

  for (const c of contacts) {
    const personId = `person-${c._id}`;
    nodes.push({ id: personId, label: `${c.firstName} ${c.lastName}`, type: "person", val: 4, photoUrl: c.photoUrl || null });

    const company = c.company?.trim();
    if (!company) {
      if (currentUser) links.push({ source: "me", target: personId });
      continue;
    }

    let companyId = companyIds.get(company);
    if (!companyId) {
      companyId = `company-${company}`;
      companyIds.set(company, companyId);
      nodes.push({ id: companyId, label: company, type: "company", val: 7 });
      if (currentUser) links.push({ source: "me", target: companyId });
    }
    links.push({ source: personId, target: companyId });
  }

  return { nodes, links };
}

// Deterministic radial layout: fixes fx/fy on every node instead of letting
// d3-force settle them, so the geometry is exact and reproducible rather than
// "physics happens to land somewhere reasonable". `centerId` is anchored at
// the origin; nodes linked directly FROM it (its "ring") are spread evenly
// around 360° at `ringDist`; each ring node of type "company" gets its own
// linked people (excluding the center itself) fanned further out at
// `leafDist`, centered on that company's angle — a lone colleague lands
// exactly on the center→company line, several fan out around it.
export function applyRadialLayout(graph, centerId, { ringDist = 200, leafDist = 380, fan = Math.PI / 9 } = {}) {
  const { nodes, links } = graph;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const center = byId.get(centerId);
  if (center) {
    center.fx = 0;
    center.fy = 0;
  }

  const ring = links.filter((l) => l.source === centerId).map((l) => byId.get(l.target)).filter(Boolean);

  ring.forEach((ringNode, i) => {
    const baseAngle = (2 * Math.PI * i) / ring.length;
    ringNode.fx = Math.cos(baseAngle) * ringDist;
    ringNode.fy = Math.sin(baseAngle) * ringDist;

    if (ringNode.type !== "company") return;

    const leaves = links
      .filter((l) => l.target === ringNode.id && l.source !== centerId)
      .map((l) => byId.get(l.source))
      .filter(Boolean);
    leaves.forEach((leafNode, j) => {
      const spread = leaves.length > 1 ? (j - (leaves.length - 1) / 2) * (fan / (leaves.length - 1)) : 0;
      const angle = baseAngle + spread;
      leafNode.fx = Math.cos(angle) * leafDist;
      leafNode.fy = Math.sin(angle) * leafDist;
    });
  });

  return graph;
}

// Module-level so a photo is fetched once and reused across every graph
// instance (mini-card + full page) instead of re-requesting it each frame.
const imageCache = new Map();

function getCachedImage(url) {
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imageCache.set(url, img);
  }
  return img;
}

// `opts.companyRadius` lets a caller (e.g. the full Network page) draw bigger
// company bubbles than the default/mini-graph size without affecting it.
export function getNodeRadius(node, opts = {}) {
  if (node.type === "me") return 12;
  if (node.type === "company") return opts.companyRadius ?? 10;
  return 8;
}

// Full custom node renderer (circle + optional contact photo + label below
// the bubble) for react-force-graph-2d's nodeCanvasObject with mode "replace".
// An image only draws once it has actually finished loading with real pixels
// (img.complete && naturalWidth > 0); until then, or if there's no photo, it
// falls back to a plain colored circle — so a slow/broken image never leaves
// the node blank.
export function drawNode(node, ctx, scale, opts = {}) {
  const r = getNodeRadius(node, opts);
  const color = node.type === "company" ? COMPANY_COLOR : node.type === "me" ? ME_COLOR : PERSON_COLOR;
  const imageUrl = node.type === "person" && node.photoUrl ? node.photoUrl : null;
  const img = imageUrl ? getCachedImage(imageUrl) : null;

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, true);
    ctx.closePath();
    ctx.clip();
    // object-fit: cover — crop a centered square from the source so the
    // circle shows a true aspect ratio instead of a squashed image.
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, node.x - r, node.y - r, r * 2, r * 2);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, true);
    ctx.fillStyle = color;
    ctx.fill();
  }

  const fontSize = (node.type === "me" ? 12 : 11) / scale;
  ctx.font = `${node.type === "me" ? "bold " : ""}${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const labelY = node.y + r + 4 / scale;
  const padding = 2 / scale;
  const textWidth = ctx.measureText(node.label).width;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(node.x - textWidth / 2 - padding, labelY - padding, textWidth + padding * 2, fontSize + padding * 2);
  ctx.fillStyle = "#344054";
  ctx.fillText(node.label, node.x, labelY);
}

// Points the camera (zoom + pan) at the exact bounding box of the given
// fixed-position nodes. react-force-graph's own default view/zoomToFit proved
// unreliable here (it measures its container via a ResizeObserver and resets
// the view on every detected resize, racing anything called right after
// mount) — call this once dimensions are known and stable instead.
export function frameGraph(fgInstance, nodes, width, height, { padding = 60, maxScale = 2 } = {}) {
  if (!fgInstance || nodes.length === 0 || !width || !height) return;
  const xs = nodes.map((n) => n.fx);
  const ys = nodes.map((n) => n.fy);
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;
  const boxW = maxX - minX || 1;
  const boxH = maxY - minY || 1;
  const scale = Math.min(width / boxW, height / boxH, maxScale);
  fgInstance.centerAt((minX + maxX) / 2, (minY + maxY) / 2, 0);
  fgInstance.zoom(scale, 0);
}
