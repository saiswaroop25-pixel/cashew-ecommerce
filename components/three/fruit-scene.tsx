"use client";

import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/lib/three/capability";
import { createBumpTexture, createCashewGeometry } from "@/lib/three/cashew-geometry";

/** A cashew apple (the fruit) with the nut hanging from its base - drag to rotate. */
function CashewFruit() {
  const { appleGeo, nutGeo, appleMat, nutMat, bump } = useMemo(() => {
    // Pear/bell profile revolved around the Y axis.
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24; // 0 = bottom, 1 = top
      const y = -0.9 + t * 1.7;
      // blunt (rounded) at both ends, wider toward the bottom like a real cashew apple
      const r = Math.pow(Math.sin(Math.PI * t), 0.55) * (0.34 + 0.22 * (1 - t)) + 0.0001;
      profile.push(new THREE.Vector2(r, y));
    }
    const appleGeo = new THREE.LatheGeometry(profile, 48);
    // Yellow at the top fading to red at the base, painted as vertex colours (no texture file).
    const pos = appleGeo.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color("#E6B93B");
    const bottom = new THREE.Color("#C23B22");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      c.copy(bottom).lerp(top, THREE.MathUtils.clamp((pos.getY(i) + 0.9) / 1.7, 0, 1));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    appleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const bump = createBumpTexture(mulberry32(11), 64);
    const appleMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, bumpMap: bump, bumpScale: 0.15 });
    const nutGeo = createCashewGeometry({ size: 0.62 });
    const nutMat = new THREE.MeshStandardMaterial({ color: "#7D8A63", roughness: 0.6, bumpMap: bump, bumpScale: 0.3 });
    return { appleGeo, nutGeo, appleMat, nutMat, bump };
  }, []);
  useEffect(
    () => () => {
      appleGeo.dispose(); nutGeo.dispose(); appleMat.dispose(); nutMat.dispose(); bump.dispose();
    },
    [appleGeo, nutGeo, appleMat, nutMat, bump],
  );

  return (
    <group rotation={[0.1, 0, 0]}>
      <mesh geometry={appleGeo} material={appleMat} />
      <mesh position={[0, 0.84, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.035, 0.05, 0.22, 10]} />
        <meshStandardMaterial color="#5B4A2E" roughness={0.8} />
      </mesh>
      <mesh geometry={nutGeo} material={nutMat} position={[0.1, -1.08, 0]} rotation={[0, 0, 1.9]} />
    </group>
  );
}

export default function FruitScene({ active, onReady, onFail }: { active: boolean; onReady: () => void; onFail: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0.2, 4.4], fov: 34 }}
      flat
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
      <directionalLight position={[3, 4, 4]} intensity={2.2} color="#FFF1DC" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -3]} scale={[10, 3, 1]} />
        <Lightformer form="circle" intensity={1.2} position={[-5, 1, -1]} scale={4} />
      </Environment>
      <CashewFruit />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.4} minPolarAngle={Math.PI / 3} maxPolarAngle={(2 * Math.PI) / 3} />
    </Canvas>
  );
}
