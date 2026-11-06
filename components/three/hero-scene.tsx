"use client";

import { Environment, Float, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/lib/three/capability";
import { createBumpTexture, createCashewGeometry } from "@/lib/three/cashew-geometry";

/** Floating cashew kernels with natural lighting, mouse parallax and scroll-linked drift. */
function Cashews() {
  const group = useRef<THREE.Group>(null);
  const { size } = useThree();

  // One shared geometry/material/texture for every kernel; disposed on unmount.
  const { geometry, material, bump } = useMemo(() => {
    const geometry = createCashewGeometry();
    const bump = createBumpTexture(mulberry32(7));
    const material = new THREE.MeshPhysicalMaterial({
      color: "#EBD3A8", // warm cashew beige (brand palette, slightly warmer so it survives lighting)
      roughness: 0.52,
      metalness: 0,
      clearcoat: 0.22,
      clearcoatRoughness: 0.55,
      sheen: 0.5,
      sheenColor: new THREE.Color("#C5A46D"),
      bumpMap: bump,
      bumpScale: 0.5,
    });
    return { geometry, material, bump };
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      bump.dispose();
    },
    [geometry, material, bump],
  );

  // Deterministic layout (same on every load): varied depth, scale and orientation.
  const nuts = useMemo(() => {
    const r = mulberry32(2024);
    return Array.from({ length: 11 }, (_, i) => ({
      key: i,
      position: [(r() - 0.5) * 5.2, (r() - 0.5) * 3.4, -1.8 + r() * 3.2] as [number, number, number],
      // mostly face-on (small tilt) with a random spin, so the kidney shape reads from the camera
      rotation: [(r() - 0.5) * 0.9, (r() - 0.5) * 0.9, r() * Math.PI * 2] as [number, number, number],
      scale: 0.5 + r() * 0.5,
      speed: 0.7 + r() * 1.1,
    }));
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    // Pointer parallax (smoothly damped) + scroll-linked drift: the cluster lifts and turns as you scroll.
    const scroll = Math.min(window.scrollY / 700, 1);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.4 + scroll * 0.6, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.25, 3, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, scroll * 1.4, 3, delta);
    const s = size.width < 480 ? 0.72 : 1; // smaller cluster on phones
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 4, delta));
  });

  return (
    <group ref={group}>
      {nuts.map((n) => (
        <Float key={n.key} speed={n.speed} rotationIntensity={0.45} floatIntensity={1.1} floatingRange={[-0.15, 0.15]}>
          <mesh geometry={geometry} material={material} position={n.position} rotation={n.rotation} scale={n.scale} />
        </Float>
      ))}
    </group>
  );
}

export default function HeroScene({ active, onReady, onFail }: { active: boolean; onReady: () => void; onFail: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"} // no GPU work while off-screen or in a background tab
      camera={{ position: [0, 0, 6.2], fov: 34 }}
      flat // no filmic tone-mapping: keeps the brand beige true instead of washing it to grey
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onFail();
        });
        onReady();
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={1.0} />
      <directionalLight position={[3, 5, 4]} intensity={2.3} color="#FFF1DC" />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#BFD8C4" />
      {/* Soft studio reflections built from light panels - no external HDR file to download */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -3]} scale={[10, 3, 1]} />
        <Lightformer form="circle" intensity={1.4} position={[-5, 1, -1]} scale={4} />
        <Lightformer form="rect" intensity={1} position={[5, -1, 2]} scale={[3, 5, 1]} />
      </Environment>
      <Cashews />
    </Canvas>
  );
}
