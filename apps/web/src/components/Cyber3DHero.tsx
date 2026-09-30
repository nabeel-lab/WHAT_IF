"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  RotateCcw,
  Play,
  Pause,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Maximize2
} from "lucide-react";

/* ─── Domain Colors ──────────────────────────────────────────────────────── */
const GREEN_CYBER = "#60F1D0";
const GREEN_NEON = "#00FF88";
const GREEN_EMERALD = "#10B981";

interface StageInfo {
  id: number;
  name: string;
  badge: string;
  cardLeft: {
    title: string;
    file: string;
    code: string[];
    tag: string;
    tagColor: string;
  };
  cardRight: {
    title: string;
    status: string;
    metrics: { label: string; value: string }[];
    verdict: string;
    verdictColor: string;
  };
}

const STAGES: StageInfo[] = [
  {
    id: 0,
    name: "01 DISCOVERY",
    badge: "AST SYNTAX · RAW FINDING",
    cardLeft: {
      title: "ALGORITHM DETECTED",
      file: "services/auth/token_engine.py:84",
      code: [
        "def issue_session_token(principal):",
        "    # Detected: RSA-2048 PKCS#1 v1.5",
        "    signer = RSA.generate(2048)",
        "    return signer.encrypt(principal.id)",
      ],
      tag: "PRESENCE DETECTED",
      tagColor: "#FFBF72",
    },
    cardRight: {
      title: "STATIC BASELINE",
      status: "Classical Primitive",
      metrics: [
        { label: "Algorithm", value: "RSA-2048" },
        { label: "PQC Horizon", value: "Shor Vulnerable" },
        { label: "Confidence", value: "100% AST Match" },
      ],
      verdict: "Presence alone does not indicate exploitability.",
      verdictColor: "#FFBF72",
    },
  },
  {
    id: 1,
    name: "02 REACHABILITY",
    badge: "CALL-GRAPH CFG · EXPOSURE",
    cardLeft: {
      title: "LIVE INGRESS TRACE",
      file: "callgraph/trace_cfg_04.json",
      code: [
        "POST /api/v1/auth/session [Public Gateway]",
        "  ↳ Gateway::authenticate_client()",
        "    ↳ TokenEngine::issue_token()",
        "      ↳ RSA_encrypt() [Target Primitive]",
      ],
      tag: "CFG REACHABLE (4 HOPS)",
      tagColor: "#8B7CFF",
    },
    cardRight: {
      title: "PATH VERIFICATION",
      status: "Exposed Handler",
      metrics: [
        { label: "Entrypoint", value: "Public HTTPS API" },
        { label: "Graph Depth", value: "4 Interprocedural Hops" },
        { label: "Dead Code?", value: "False (Live Route)" },
      ],
      verdict: "Reachable from external network perimeter.",
      verdictColor: "#8B7CFF",
    },
  },
  {
    id: 2,
    name: "03 RUNTIME EVIDENCE",
    badge: "DYNAMIC TELEMETRY · EXECUTION",
    cardLeft: {
      title: "STACK FRAME INTERCEPT",
      file: "eBPF/process_4128_trace.log",
      code: [
        "#0 0x7f4a20b libcrypto.so.3:RSA_public_encrypt()",
        "#1 0x7f4a31a TokenService::sign() at auth.c:112",
        "// Live invocations: 142 calls/sec verified",
        "// Memory buffer: heap allocated, non-enclave",
      ],
      tag: "RUNTIME OBSERVED",
      tagColor: "#60F1D0",
    },
    cardRight: {
      title: "EMPIRICAL PROOF",
      status: "Active Execution",
      metrics: [
        { label: "Process ID", value: "PID 4128 (auth-srv)" },
        { label: "Payload TTL", value: "15 Minutes (Ephemeral)" },
        { label: "HNDL Risk", value: "Negligible (Short-lived)" },
      ],
      verdict: "Active in runtime — but payload is ephemeral.",
      verdictColor: "#60F1D0",
    },
  },
  {
    id: 3,
    name: "04 INTERVENTION",
    badge: "DECISION RULE · SUFFICIENT ACTION",
    cardLeft: {
      title: "SUFFICIENT INTERVENTION",
      file: "policy/decision_engine.yaml",
      code: [
        "intervention:",
        "  action: SCOPE_KMS_ENCLAVE",
        "  avoid: FULL_ALGORITHM_MIGRATION",
        "  reason: Short payload TTL; hardware isolation suffices",
        "  effort: LOW_EFFORT (1 Day Config)",
      ],
      tag: "CHEAPEST SUFFICIENT",
      tagColor: "#00FF88",
    },
    cardRight: {
      title: "DECISION VERDICT",
      status: "Harden & Scope Enclave",
      metrics: [
        { label: "Recommended", value: "AWS KMS Isolation" },
        { label: "Code Rewrite", value: "0 Lines Changed" },
        { label: "Security Goal", value: "Blast Radius = 0" },
      ],
      verdict: "Cheapest sufficient intervention determined.",
      verdictColor: "#00FF88",
    },
  },
];

export default function Cyber3DHero() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [isRotating, setIsRotating] = useState(true);
  const [loadingModel, setLoadingModel] = useState(true);
  const [rotationAngle, setRotationAngle] = useState(0);

  // References for Three.js state
  const rotationYRef = useRef(0);
  const targetRotationYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);
  const autoRotateRef = useRef(true);
  const modelRef = useRef<THREE.Group | null>(null);
  const floatingGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Mouse Parallax references (no React re-renders)
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });

  // Sync autoRotateRef
  useEffect(() => {
    autoRotateRef.current = isRotating;
  }, [isRotating]);

  // Set explicit target stage
  const goToStage = useCallback((stageIndex: number) => {
    setActiveStage(stageIndex);
    // Each stage corresponds to 90 degrees (Math.PI / 2)
    const target = stageIndex * (Math.PI / 2);
    // Find closest equivalent rotation
    const current = rotationYRef.current;
    const fullTurns = Math.floor(current / (Math.PI * 2)) * (Math.PI * 2);
    targetRotationYRef.current = fullTurns + target;
    // If difference is greater than PI, adjust turn
    if (targetRotationYRef.current - current > Math.PI) {
      targetRotationYRef.current -= Math.PI * 2;
    } else if (current - targetRotationYRef.current > Math.PI) {
      targetRotationYRef.current += Math.PI * 2;
    }
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 700;

    // ─── Scene, Camera, Renderer ───
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04070d, 0.1);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    // Position camera closer for a prominent, expanded 3D view
    camera.position.set(0, 0.06, 2.65);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ─── Cyber Green & Obsidian Lighting ───
    const ambientLight = new THREE.AmbientLight(0x06110f, 1.3);
    scene.add(ambientLight);

    // Key Light: Radiant Cyber Mint Green
    const keyLight = new THREE.DirectionalLight(0x60f1d0, 3.4);
    keyLight.position.set(3, 4, 3.5);
    scene.add(keyLight);

    // Rim Light: Vivid Emerald Neon Green
    const rimLight = new THREE.DirectionalLight(0x00ff88, 3.8);
    rimLight.position.set(-3, -2, -2.5);
    scene.add(rimLight);

    // Back Light: Electric Cyan/Green
    const backLight = new THREE.DirectionalLight(0x10b981, 2.2);
    backLight.position.set(0, -3, 2);
    scene.add(backLight);

    // Core Point Light: Glowing emerald pulse in the center
    const pointLight = new THREE.PointLight(0x60f1d0, 2.8, 7);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // ─── Root Rotation Pivot ───
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // ─── Floating Geometry Around the Model (as in reference image) ───
    const floatingGroup = new THREE.Group();
    rootGroup.add(floatingGroup);
    floatingGroupRef.current = floatingGroup;

    // Torus / Black Metallic Cyber Ring
    const torusGeo = new THREE.TorusGeometry(0.24, 0.045, 16, 32);
    const darkMetallicMat = new THREE.MeshStandardMaterial({
      color: 0x090f14,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x021a14,
      emissiveIntensity: 0.4,
    });
    const torus = new THREE.Mesh(torusGeo, darkMetallicMat);
    torus.position.set(0.85, 0.95, 0.2);
    torus.rotation.set(0.8, 0.4, 0.2);
    floatingGroup.add(torus);

    // Mini Floating Pyramid / Cone
    const coneGeo = new THREE.ConeGeometry(0.14, 0.25, 4);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x0a1618,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x60f1d0,
      emissiveIntensity: 0.2,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(-1.05, -0.25, 0.4);
    cone.rotation.set(2.1, 0.5, 1.2);
    floatingGroup.add(cone);

    // Floating Emerald Cyber Octahedron
    const octGeo = new THREE.OctahedronGeometry(0.14);
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      metalness: 0.75,
      roughness: 0.2,
      emissive: 0x00ff88,
      emissiveIntensity: 0.55,
    });
    const octahedron = new THREE.Mesh(octGeo, greenMat);
    octahedron.position.set(1.1, -0.75, 0.2);
    floatingGroup.add(octahedron);

    // Small Floating Satellite Cube
    const cubeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const satCube = new THREE.Mesh(cubeGeo, darkMetallicMat);
    satCube.position.set(-0.95, 0.85, -0.2);
    satCube.rotation.set(0.4, 0.6, 0.8);
    floatingGroup.add(satCube);

    // ─── Fallback / Loading Wireframe Cube ───
    const wireGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x60f1d0,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    const loadingWireCube = new THREE.Mesh(wireGeo, wireMat);
    rootGroup.add(loadingWireCube);

    // ─── Load GLB Model (3d2_model.glb) ───
    const loader = new GLTFLoader();
    loader.load(
      "/3d2_model.glb",
      (gltf) => {
        setLoadingModel(false);
        // Remove loading wireframe
        rootGroup.remove(loadingWireCube);

        const model = gltf.scene;
        modelRef.current = model;

        // Black & Green Color Customization as requested:
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;

              // Tune material for deep black obsidian + emerald reflections
              mat.roughness = 0.22;
              mat.metalness = 0.85;
              mat.envMapIntensity = 1.5;

              // Shader customization: Convert blueish tones to cyber-emerald/mint green
              mat.onBeforeCompile = (shader) => {
                shader.fragmentShader = shader.fragmentShader.replace(
                  "#include <map_fragment>",
                  `
                  #include <map_fragment>
                  // Black & Green Cyber Transformation:
                  // Shift blueish facets to neon mint / cyber green (#60F1D0 / #00FF88)
                  if (diffuseColor.b > diffuseColor.r + 0.05) {
                    float b = diffuseColor.b;
                    // Luminous green-emerald tone
                    diffuseColor.rgb = vec3(diffuseColor.r * 0.15, b * 1.1, (b + diffuseColor.r) * 0.5);
                  } else {
                    // Deep obsidian slate
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.07, 0.09), 0.35);
                  }
                  `
                );
              };
              mat.needsUpdate = true;
            }
          }
        });

        // Compute Bounding Box to center and EXPAND size as requested:
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        // Expanded scale: 2.35 gives a bold, cinematic, prominent 3D cube
        const scale = 2.35 / (maxDim || 1);

        model.scale.set(scale, scale, scale);
        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        rootGroup.add(model);
      },
      undefined,
      (err) => {
        console.error("Error loading 3D model:", err);
        setLoadingModel(false);
      }
    );

    // ─── Mouse Drag to Rotate ───
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
    };

    const onMouseMove = (e: MouseEvent) => {
      // Global smooth parallax tracking
      mouseTargetRef.current.x = (e.clientX / window.innerWidth - 0.5) * 0.25;
      mouseTargetRef.current.y = (e.clientY / window.innerHeight - 0.5) * 0.15;

      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;

      rotationYRef.current += deltaX * 0.0055;
      targetRotationYRef.current = rotationYRef.current;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    // ─── Touch Drag for Mobile/Tablet ───
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        prevMouseXRef.current = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.touches[0].clientX;

      rotationYRef.current += deltaX * 0.0055;
      targetRotationYRef.current = rotationYRef.current;
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domEl.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    // ─── Resize Handler ───
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    // ─── Smooth Animation Loop ───
    let lastTime = performance.now();
    let tickCounter = 0;

    const animate = (now: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = (now - lastTime) * 0.001;
      lastTime = now;

      // Slow, smooth auto-rotation: ~6.8 seconds per quadrant, ~27 seconds full revolution
      if (autoRotateRef.current && !isDraggingRef.current) {
        targetRotationYRef.current += delta * 0.23;
      }

      // Silky-smooth interpolation to target rotation
      rotationYRef.current += (targetRotationYRef.current - rotationYRef.current) * 0.045;
      rootGroup.rotation.y = rotationYRef.current;

      // Fluid, subtle mouse parallax lerping (without React re-renders)
      mouseCurrentRef.current.x += (mouseTargetRef.current.x - mouseCurrentRef.current.x) * 0.04;
      mouseCurrentRef.current.y += (mouseTargetRef.current.y - mouseCurrentRef.current.y) * 0.04;

      rootGroup.rotation.x = Math.sin(now * 0.0005) * 0.05 + 0.08 + mouseCurrentRef.current.y;
      rootGroup.rotation.z = Math.cos(now * 0.0004) * 0.03 + mouseCurrentRef.current.x * 0.4;

      // Orbit floating geometric shapes gently
      if (floatingGroupRef.current) {
        floatingGroupRef.current.rotation.y = -rotationYRef.current * 0.35;
      }

      // Calculate active quadrant (0, 1, 2, 3) based on normalized angle
      tickCounter++;
      if (tickCounter % 5 === 0) {
        const twoPi = Math.PI * 2;
        let normalizedAngle = rotationYRef.current % twoPi;
        if (normalizedAngle < 0) normalizedAngle += twoPi;

        // Quadrant size: pi / 2 (90 deg)
        const stageIndex = Math.floor(((normalizedAngle + Math.PI / 4) % twoPi) / (Math.PI / 2)) % 4;

        setActiveStage(stageIndex);
        setRotationAngle(Math.round((normalizedAngle * 180) / Math.PI));
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      domEl.removeEventListener("mousedown", onMouseDown);
      domEl.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      renderer.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, []);

  const currentStage = STAGES[activeStage] || STAGES[0];

  return (
    <div className="relative w-full min-h-[680px] lg:min-h-[780px] flex items-center justify-center overflow-hidden select-none">
      
      {/* ─── Backside Giant Bold ECDAT Typography (Takes Up The Whole Screen) ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden w-screen left-1/2 -translate-x-1/2">
        <span
          className="text-[25vw] font-black tracking-tighter text-white/[0.04] leading-none select-none text-center w-full block transition-opacity duration-1000"
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "-0.06em",
            textShadow: "0 0 140px rgba(96, 241, 208, 0.08)",
          }}
        >
          ECDAT
        </span>
      </div>

      {/* ─── Concentric Orbital Radar Rings (as in reference image) ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-[360px] h-[360px] rounded-full border border-white/[0.04] animate-pulse" />
        <div className="absolute w-[560px] h-[560px] rounded-full border border-white/[0.03] border-dashed" />
        <div className="absolute w-[760px] h-[760px] rounded-full border border-[#60F1D0]/[0.05]" />
        <div className="absolute w-[1000px] h-[1000px] rounded-full border border-white/[0.02]" />
      </div>

      {/* ─── WebGL Canvas Container ─── */}
      <div
        ref={mountRef}
        className="w-full h-[620px] sm:h-[700px] lg:h-[760px] cursor-grab active:cursor-grabbing relative z-10"
        title="Click and drag to spin 3D Cryptographic Model"
      />

      {/* ─── Loading Overlay ─── */}
      {loadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#60F1D0]/30 border-t-[#60F1D0] animate-spin" />
          <span className="text-[11px] font-mono text-[#60F1D0] tracking-widest uppercase">
            Loading 3D Spatial Geometry…
          </span>
        </div>
      )}

      {/* ─── SVG Curved Tether Lines from Cards to 3D Model ─── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-20 hidden md:block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="tetherGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60F1D0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60F1D0" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="tetherGradRight" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#00FF88" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00FF88" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Left Card Tether Line */}
        <path
          d="M 330 180 C 420 200, 460 280, 520 320"
          fill="none"
          stroke="url(#tetherGradLeft)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="transition-all duration-700"
        />
        <circle cx="520" cy="320" r="3.5" fill="#60F1D0" className="animate-ping" />

        {/* Right Card Tether Line */}
        <path
          d="M 900 480 C 820 460, 750 380, 680 340"
          fill="none"
          stroke="url(#tetherGradRight)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="transition-all duration-700"
        />
        <circle cx="680" cy="340" r="3.5" fill="#00FF88" className="animate-ping" />
      </svg>

      {/* ═══════════════════════════════════════════════════════════════
          FLOATING ANNOTATION CARDS (Smooth 6-7s Quadrant Transitions)
      ═══════════════════════════════════════════════════════════════ */}

      {/* Top-Left Floating Code Card */}
      <div
        key={`left-${currentStage.id}`}
        className="absolute top-10 left-4 sm:left-8 md:left-12 lg:left-16 max-w-[290px] sm:max-w-[350px] z-20 pointer-events-auto transition-all duration-700 transform animate-in fade-in zoom-in-95"
      >
        <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-[#60F1D0]/50 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#60F1D0] to-transparent pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#60F1D0]/15 flex items-center justify-center text-[#60F1D0]">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-mono font-bold text-[#EAF0F6]">
                {currentStage.cardLeft.title}
              </span>
            </div>
            <span
              className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${currentStage.cardLeft.tagColor}20`,
                color: currentStage.cardLeft.tagColor,
              }}
            >
              {currentStage.cardLeft.tag}
            </span>
          </div>

          <div className="text-[10px] font-mono text-[#A8B4C2] mb-2 truncate">
            {currentStage.cardLeft.file}
          </div>

          {/* Code Window */}
          <div className="p-2.5 rounded-lg bg-[#04080D]/90 border border-white/10 font-mono text-[10px] sm:text-[11px] leading-relaxed text-[#D2E4F0] space-y-0.5">
            {currentStage.cardLeft.code.map((line, i) => (
              <div key={i} className="truncate">
                {line.startsWith("#") || line.startsWith("//") ? (
                  <span className="text-[#60F1D0]/70 italic">{line}</span>
                ) : line.includes("def ") || line.includes("return ") ? (
                  <span className="text-[#8B7CFF]">{line}</span>
                ) : line.includes("POST") || line.includes("↳") ? (
                  <span className="text-[#75B7FF]">{line}</span>
                ) : (
                  <span>{line}</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-[#A8B4C2]">
            <span className="text-[#60F1D0] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] animate-ping" />
              <span>STAGE {currentStage.id + 1} / 4</span>
            </span>
            <span>Tethered to 3D Vertex</span>
          </div>
        </div>
      </div>

      {/* Bottom-Right Floating Telemetry & Decision Card */}
      <div
        key={`right-${currentStage.id}`}
        className="absolute bottom-16 right-4 sm:right-8 md:right-12 lg:right-16 max-w-[280px] sm:max-w-[340px] z-20 pointer-events-auto transition-all duration-700 transform animate-in fade-in zoom-in-95"
      >
        <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-[#00FF88]/50 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00FF88] to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-mono font-bold text-[#EAF0F6] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00FF88]" />
              <span>{currentStage.cardRight.title}</span>
            </span>
            <span className="text-[10px] font-mono text-[#A8B4C2]">
              {currentStage.cardRight.status}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="space-y-1.5 my-3 font-mono text-[10px] sm:text-[11px]">
            {currentStage.cardRight.metrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between py-1 border-b border-white/5"
              >
                <span className="text-[#A8B4C2]">{m.label}:</span>
                <span className="font-bold text-[#EAF0F6]">{m.value}</span>
              </div>
            ))}
          </div>

          {/* Verdict Statement */}
          <div
            className="p-2.5 rounded-lg border text-[11px] font-mono leading-tight font-semibold"
            style={{
              backgroundColor: `${currentStage.cardRight.verdictColor}12`,
              borderColor: `${currentStage.cardRight.verdictColor}30`,
              color: currentStage.cardRight.verdictColor,
            }}
          >
            {currentStage.cardRight.verdict}
          </div>
        </div>
      </div>

      {/* ─── Bottom Interactive Stage Carousel Navigation HUD ─── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col sm:flex-row items-center gap-3">
        
        {/* 4 Quadrant Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl liquid-glass border border-white/15 backdrop-blur-xl shadow-xl">
          {STAGES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => goToStage(idx)}
              className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                activeStage === idx
                  ? "bg-[#60F1D0] text-[#04070D] shadow-[0_0_15px_rgba(96,241,208,0.5)] scale-105"
                  : "text-[#A8B4C2] hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeStage === idx ? "#04070D" : "#60F1D0" }} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        {/* Auto-Rotate Play/Pause & Rotation Telemetry */}
        <div className="flex items-center gap-2 p-1 px-3 rounded-xl liquid-glass border border-white/10 text-[10px] font-mono text-[#A8B4C2]">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="p-1 rounded hover:bg-white/10 text-[#60F1D0] transition-colors"
            title={isRotating ? "Pause Auto-Rotation" : "Resume Auto-Rotation"}
          >
            {isRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <span>{rotationAngle}° ROTATION</span>
          <span className="text-white/20">|</span>
          <span className="text-[#60F1D0]">DRAG TO SPIN</span>
        </div>

      </div>

    </div>
  );
}
