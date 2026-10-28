"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three/examples/jsm/controls/OrbitControls.js";

// Renders a real, interactive 3D model (rotate/zoom/pan) for equipment
// part files. Browsers cannot parse proprietary CAD formats like
// .SLDPRT directly — no native or open way to do that client-side.
// This viewer works with the two formats that CAD software can export
// to and that browsers *can* actually render: .glb/.gltf (preferred —
// compact, preserves materials) and .stl (geometry only, no color/
// material data, but universally supported as an export target).
//
// A few touches below (ground grid, softer hemisphere-based lighting,
// loading-percentage feedback, the mouse-controls hint text) are
// borrowed from a small reference SLDPRT viewer the person shared —
// genuinely nice, simple ideas worth carrying over rather than
// reinventing.
//
// Requires the "three" package (`npm install three` — and
// `npm install -D @types/three` for TypeScript).
export function Model3DViewer({ url, className }: { url: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadPct, setLoadPct] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function init() {
      const container = containerRef.current;
      if (!container) return;

      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

        const ext = url.split(".").pop()?.toLowerCase();
        let object: THREE.Object3D;

        if (ext === "stl") {
          const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
          const geometry = await new STLLoader().loadAsync(url, (evt) => {
            if (evt.total) setLoadPct(Math.round((evt.loaded / evt.total) * 100));
          });
          geometry.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({ color: 0xb8bec7, metalness: 0.2, roughness: 0.5 });
          object = new THREE.Mesh(geometry, material);
        } else {
          // .glb / .gltf — anything else is attempted the same way,
          // since GLTFLoader is the sane default for exported CAD data.
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const gltf = await new GLTFLoader().loadAsync(url, (evt) => {
            if (evt.total) setLoadPct(Math.round((evt.loaded / evt.total) * 100));
          });
          object = gltf.scene;
        }

        if (disposed) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf3f1ee);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100000);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // Hemisphere light (sky/ground tint) reads as more natural on
        // machined-part geometry than plain ambient + directional alone.
        scene.add(new THREE.HemisphereLight(0xffffff, 0x555049, 1.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight2.position.set(-5, -5, -5);
        scene.add(dirLight2);

        scene.add(object);

        // Auto-fit: center the model and place the camera far enough
        // to see the whole bounding box, regardless of the part's real
        // scale (a small bolt and a large chassis both need this).
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const distance = maxDim * 2.2;

        const grid = new THREE.GridHelper(maxDim * 4, 20, 0xb0a89e, 0xd8d2c8);
        grid.position.y = -size.y / 2;
        scene.add(grid);

        function resetView() {
          camera.position.set(distance, distance * 0.7, distance);
          camera.lookAt(0, 0, 0);
          controlsRef.current?.target.set(0, 0, 0);
          controlsRef.current?.update();
        }
        resetView();
        resetViewRef.current = resetView;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotateSpeed = 2.5;
        controlsRef.current = controls;

        let frameId: number;
        function animate() {
          frameId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        }
        animate();

        function handleResize() {
          if (!container) return;
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
        window.addEventListener("resize", handleResize);

        setLoading(false);

        cleanup = () => {
          cancelAnimationFrame(frameId);
          window.removeEventListener("resize", handleResize);
          controls.dispose();
          renderer.dispose();
          controlsRef.current = null;
          resetViewRef.current = null;
        };
      } catch (err) {
        if (!disposed) {
          console.error("3D model load failed:", err);
          setError("Impossible de charger le modèle 3D. Vérifiez que le fichier est accessible et au format .glb/.gltf/.stl.");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [url]);

  // Keeps the live OrbitControls instance's autoRotate flag in sync
  // with the button state, without needing to re-run the whole init
  // effect (and re-load the model) on every toggle.
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (resetSignal === 0) return;
    resetViewRef.current?.();
  }, [resetSignal]);

  return (
    <div className={`relative bg-paper rounded border border-hairline overflow-hidden ${className ?? "h-96"}`}>
      <div ref={containerRef} className="w-full h-full" />

      {!loading && !error && (
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            title="Rotation automatique"
            className={`w-8 h-8 flex items-center justify-center rounded border text-sm transition-colors ${
              autoRotate
                ? "bg-steel-600 border-steel-600 text-white"
                : "bg-surface/90 border-hairline text-muted hover:text-ink"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setResetSignal((n) => n + 1)}
            title="Réinitialiser la vue"
            className="w-8 h-8 flex items-center justify-center rounded border border-hairline bg-surface/90 text-muted hover:text-ink text-sm transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute bottom-2 right-2 bg-ink/70 text-white/90 text-[10px] px-2 py-1 rounded">
          Glisser : rotation · molette : zoom · clic droit : déplacer
        </div>
      )}

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted bg-paper/80">
          {loadPct != null ? `Chargement du modèle 3D — ${loadPct}%…` : "Chargement du modèle 3D…"}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-urgent bg-paper/90 px-4 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
