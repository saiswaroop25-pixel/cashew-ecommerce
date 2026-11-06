import * as THREE from "three";

/**
 * Procedural cashew kernel: a crescent ("kidney") centre-line with a swollen head and a tapering
 * tail, swept with a slightly flattened elliptical cross-section. No model file needed.
 *
 * Built once and shared by every cashew in the scene (one geometry, many meshes).
 */
export function createCashewGeometry(opts: { radial?: number; tubular?: number; size?: number } = {}): THREE.BufferGeometry {
  const radial = opts.radial ?? 28;
  const tubular = opts.tubular ?? 72;
  const size = opts.size ?? 1;

  const R = 0.95; // radius of the bending arc
  const sweep = 1.65; // total angle of the crescent (radians): a gentle kidney bend, not a claw
  const centre = (t: number) => {
    const a = (t - 0.35) * sweep; // head sits a little before the arc's middle
    return new THREE.Vector3(Math.sin(a) * R, (Math.cos(a) - 1) * R * 0.9, 0);
  };
  // Radius profile: 0 at both ends (rounded caps), fat near the head, long taper to the tail.
  const profile = (t: number) => {
    const body = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.5);
    const taper = 1 - 0.42 * t * t;
    return 0.5 * body * taper; // plump: a real kernel is only ~1.5x as long as it is thick
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // For a planar centre-line, the tangent lies in XY, the binormal is +Z, the normal is in-plane.
  const eps = 1e-3;
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const p = centre(t);
    const tan = centre(Math.min(1, t + eps)).sub(centre(Math.max(0, t - eps))).normalize();
    const normal = new THREE.Vector3(-tan.y, tan.x, 0); // in-plane, perpendicular to the tangent
    const binormal = new THREE.Vector3(0, 0, 1);
    const r = profile(t);

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      // Slightly flatter across the thickness, and a gentle organic ripple.
      const ripple = 1 + 0.035 * Math.sin(a * 3 + t * 9) + 0.02 * Math.sin(t * 17);
      const v = p
        .clone()
        .addScaledVector(normal, Math.cos(a) * r * ripple)
        .addScaledVector(binormal, Math.sin(a) * r * 0.72 * ripple);
      positions.push(v.x * size, v.y * size, v.z * size);
      uvs.push(j / radial, t);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.center(); // pivot at the middle so it rotates naturally
  return geo;
}

/** Fine speckled bump texture so the surface reads as a natural nut, not plastic. Browser only. */
export function createBumpTexture(seedFn: () => number, px = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, px, px);
  for (let i = 0; i < px * px * 0.5; i++) {
    const g = 100 + Math.floor(seedFn() * 60);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(Math.floor(seedFn() * px), Math.floor(seedFn() * px), 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  return tex;
}
