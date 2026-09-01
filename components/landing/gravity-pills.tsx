"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";

type Pill = {
  label: string;
  shape?: "pill" | "circle";
  big?: boolean;
  // Dark mode neon values
  neonColor: string;
  darkBgAlpha: string;
  // Light mode values
  lightColor: string;
  lightBg: string;
  lightBorder: string;
  lightShadow: string;
};

const PILLS: Pill[] = [
  {
    label: "O",
    big: true,
    neonColor: "#daad4c",
    darkBgAlpha: "22",
    lightColor: "#daad4c",
    lightBg: "rgba(218, 173, 76, 0.12)",
    lightBorder: "rgba(218, 173, 76, 0.35)",
    lightShadow: "0 8px 24px rgba(218, 173, 76, 0.18)",
  },
  {
    label: "C",
    big: true,
    neonColor: "#daad4c",
    darkBgAlpha: "22",
    lightColor: "#daad4c",
    lightBg: "rgba(109, 40, 217, 0.12)",
    lightBorder: "rgba(109, 40, 217, 0.32)",
    lightShadow: "0 8px 24px rgba(109, 40, 217, 0.18)",
  },
  {
    label: "N",
    big: true,
    neonColor: "#06b6d4",
    darkBgAlpha: "22",
    lightColor: "#0e7490",
    lightBg: "rgba(14, 116, 144, 0.12)",
    lightBorder: "rgba(14, 116, 144, 0.32)",
    lightShadow: "0 8px 24px rgba(14, 116, 144, 0.18)",
  },
  {
    label: "U",
    neonColor: "#daad4c",
    darkBgAlpha: "1a",
    lightColor: "#daad4c",
    lightBg: "rgba(218, 173, 76, 0.10)",
    lightBorder: "rgba(218, 173, 76, 0.25)",
    lightShadow: "0 4px 14px rgba(218, 173, 76, 0.14)",
  },
  {
    label: "Ca",
    neonColor: "#06b6d4",
    darkBgAlpha: "1a",
    lightColor: "#0284c7",
    lightBg: "rgba(2, 132, 199, 0.10)",
    lightBorder: "rgba(2, 132, 199, 0.25)",
    lightShadow: "0 4px 14px rgba(2, 132, 199, 0.14)",
  },
  {
    label: "Fe",
    neonColor: "#daad4c",
    darkBgAlpha: "1a",
    lightColor: "#daad4c",
    lightBg: "rgba(218, 173, 76, 0.10)",
    lightBorder: "rgba(218, 173, 76, 0.25)",
    lightShadow: "0 4px 14px rgba(218, 173, 76, 0.14)",
  },
  {
    label: "Au",
    big: true,
    neonColor: "#f59e0b",
    darkBgAlpha: "22",
    lightColor: "#b45309",
    lightBg: "rgba(180, 83, 9, 0.12)",
    lightBorder: "rgba(180, 83, 9, 0.32)",
    lightShadow: "0 8px 24px rgba(180, 83, 9, 0.18)",
  },
  {
    label: "Cu",
    neonColor: "#06b6d4",
    darkBgAlpha: "1a",
    lightColor: "#0f766e",
    lightBg: "rgba(15, 118, 110, 0.10)",
    lightBorder: "rgba(15, 118, 110, 0.25)",
    lightShadow: "0 4px 14px rgba(15, 118, 110, 0.14)",
  },
  {
    label: "Ag",
    neonColor: "#daad4c",
    darkBgAlpha: "1a",
    lightColor: "#daad4c",
    lightBg: "rgba(4, 120, 87, 0.10)",
    lightBorder: "rgba(4, 120, 87, 0.25)",
    lightShadow: "0 4px 14px rgba(4, 120, 87, 0.14)",
  },
  {
    label: "Na",
    shape: "circle",
    big: true,
    neonColor: "#06b6d4",
    darkBgAlpha: "22",
    lightColor: "#0284c7",
    lightBg: "rgba(2, 132, 199, 0.12)",
    lightBorder: "rgba(2, 132, 199, 0.32)",
    lightShadow: "0 8px 24px rgba(2, 132, 199, 0.18)",
  },
  {
    label: "Mg",
    shape: "circle",
    big: true,
    neonColor: "#daad4c",
    darkBgAlpha: "22",
    lightColor: "#daad4c",
    lightBg: "rgba(109, 40, 217, 0.12)",
    lightBorder: "rgba(109, 40, 217, 0.32)",
    lightShadow: "0 8px 24px rgba(109, 40, 217, 0.18)",
  },
  {
    label: "Cl",
    shape: "circle",
    big: true,
    neonColor: "#daad4c",
    darkBgAlpha: "22",
    lightColor: "#daad4c",
    lightBg: "rgba(4, 120, 87, 0.14)",
    lightBorder: "rgba(4, 120, 87, 0.35)",
    lightShadow: "0 8px 24px rgba(4, 120, 87, 0.18)",
  },
  {
    label: "K",
    shape: "circle",
    neonColor: "#f59e0b",
    darkBgAlpha: "1a",
    lightColor: "#b45309",
    lightBg: "rgba(180, 83, 9, 0.10)",
    lightBorder: "rgba(180, 83, 9, 0.25)",
    lightShadow: "0 4px 14px rgba(180, 83, 9, 0.14)",
  },
];

export function GravityPills() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const w = scene.clientWidth;
    // Three tiers: very narrow phones (≤380px), wider phones (≤520px), desktop
    const scale = w <= 380 ? 0.44 : w <= 520 ? 0.54 : 1;

    // shrink pills on narrow screens so the pile stays below the CTA content
    pillRefs.current.forEach((el, i) => {
      if (!el) return;
      const p = PILLS[i];
      const base = p.shape === "circle" ? (p.big ? 128 : 96) : p.big ? 104 : 84;
      const h = Math.round(base * scale);
      el.style.height = `${h}px`;
      if (p.shape === "circle") el.style.width = `${h}px`;
      el.style.fontSize = `${Math.round((p.big ? 40 : 30) * scale)}px`;
    });

    const {
      Engine,
      Runner,
      World,
      Bodies,
      Body,
      Mouse,
      MouseConstraint,
      Composite,
      Events,
    } = Matter;

    const engine = Engine.create();
    // gravity is ALWAYS on; reduced-motion users get a pre-settled pile (no
    // visible animation) rather than floating pills stuck off-screen.
    engine.gravity.y = 1;

    let width = scene.clientWidth;
    let height = scene.clientHeight;
    const wall = 80;

    const createWalls = () => [
      // floor
      Bodies.rectangle(width / 2, height + wall / 2, width + wall * 2, wall, {
        isStatic: true,
      }),
      // left
      Bodies.rectangle(-wall / 2, height / 2, wall, height * 3, {
        isStatic: true,
      }),
      // right
      Bodies.rectangle(width + wall / 2, height / 2, wall, height * 3, {
        isStatic: true,
      }),
    ];

    let walls = createWalls();
    World.add(engine.world, walls);

    // build a body per rendered pill element
    const bodies: { body: Matter.Body; el: HTMLDivElement }[] = [];
    pillRefs.current.forEach((el, i) => {
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const isCircle = PILLS[i].shape === "circle";
      // spread start X evenly across the width so the pile fills the whole floor
      const cols = pillRefs.current.length;
      const colW = width / cols;
      const startX = Math.min(
        width - w / 2,
        Math.max(w / 2, colW * (i + 0.5) + gsapRandom(-colW / 3, colW / 3)),
      );
      const startY = gsapRandom(-700, -60);
      const body = isCircle
        ? Bodies.circle(startX, startY, h / 2, {
            restitution: 0.35,
            friction: 0.4,
            frictionAir: 0.02,
          })
        : Bodies.rectangle(startX, startY, w, h, {
            chamfer: { radius: h / 2 },
            restitution: 0.35,
            friction: 0.4,
            frictionAir: 0.02,
          });
      Body.setAngle(body, gsapRandom(-0.4, 0.4));
      bodies.push({ body, el });
      World.add(engine.world, body);
    });

    // mouse drag
    const mouse = Mouse.create(scene);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    World.add(engine.world, mouseConstraint);
    // allow page scroll over the canvas
    mouse.element.removeEventListener(
      "wheel",
      (mouse as unknown as { mousewheel: EventListener }).mousewheel,
    );
    mouse.element.removeEventListener(
      "DOMMouseScroll",
      (mouse as unknown as { mousewheel: EventListener }).mousewheel,
    );

    const runner = Runner.create();

    Events.on(engine, "afterUpdate", () => {
      for (const { body, el } of bodies) {
        const { x, y } = body.position;
        el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${
          y - el.offsetHeight / 2
        }px) rotate(${body.angle}rad)`;
      }
    });

    // place every body at its start position before the first paint so the
    // pills are pinned above the fold (not flashing at 0,0)
    pillRefs.current.forEach((el, i) => {
      const entry = bodies[i];
      if (!el || !entry) return;
      const { x, y } = entry.body.position;
      el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${
        y - el.offsetHeight / 2
      }px) rotate(${entry.body.angle}rad)`;
      el.style.opacity = "1";
    });

    const syncDom = () => {
      for (const { body, el } of bodies) {
        const { x, y } = body.position;
        el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${
          y - el.offsetHeight / 2
        }px) rotate(${body.angle}rad)`;
      }
    };

    let started = false;
    let io: IntersectionObserver | null = null;

    if (prefersReduced) {
      // pre-settle the pile synchronously so it appears already stacked (no
      // visible fall), then keep the runner alive so dragging still works
      for (let i = 0; i < 480; i++) Engine.update(engine, 1000 / 60);
      syncDom();
      started = true;
      Runner.run(runner, engine);
    } else {
      // drop the pills once the section scrolls into view so the user watches
      // them fall — but guarantee it runs even if the observer never fires
      const startDrop = () => {
        if (started) return;
        started = true;
        width = scene.clientWidth;
        height = scene.clientHeight;
        Composite.remove(engine.world, walls);
        walls = createWalls();
        World.add(engine.world, walls);
        Runner.run(runner, engine);
      };
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) startDrop();
        },
        { threshold: 0.15 },
      );
      io.observe(scene);
      // fallback: if already on screen at mount, or the observer is flaky
      const rect = scene.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) startDrop();
      window.setTimeout(startDrop, 1800);
    }

    const handleResize = () => {
      const newW = scene.clientWidth;
      const newH = scene.clientHeight;
      if (newW === width && newH === height) return;
      width = newW;
      height = newH;
      Composite.remove(engine.world, walls);
      walls = createWalls();
      World.add(engine.world, walls);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(scene);

    return () => {
      io?.disconnect();
      ro.disconnect();
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
      Events.off(engine, "afterUpdate");
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing touch-pan-y"
      aria-hidden="true"
    >
      {PILLS.map((p, i) => {
        const darkAlpha = p.darkBgAlpha ?? "22";
        return (
          <div
            key={p.label}
            ref={(el) => {
              pillRefs.current[i] = el;
            }}
            className={`absolute left-0 top-0 flex select-none items-center justify-center font-extrabold will-change-transform backdrop-blur-md transition-colors duration-300 ${
              p.shape === "circle" ? "rounded-full" : "rounded-full px-8"
            } text-[var(--p-light-color)] bg-[var(--p-light-bg)] border border-[var(--p-light-border)] shadow-[var(--p-light-shadow)] dark:text-[var(--p-dark-color)] dark:bg-[var(--p-dark-bg)] dark:border-[var(--p-dark-border)] dark:shadow-[var(--p-dark-shadow)]`}
            style={{
              opacity: 0,
              height:
                p.shape === "circle" ? (p.big ? 128 : 96) : p.big ? 104 : 84,
              width: p.shape === "circle" ? (p.big ? 128 : 96) : undefined,
              fontSize: p.big ? 38 : 28,
              ["--p-light-color" as string]: p.lightColor,
              ["--p-light-bg" as string]: p.lightBg,
              ["--p-light-border" as string]: p.lightBorder,
              ["--p-light-shadow" as string]: p.lightShadow,
              ["--p-dark-color" as string]: p.neonColor,
              ["--p-dark-bg" as string]: `${p.neonColor}${darkAlpha}`,
              ["--p-dark-border" as string]: `${p.neonColor}44`,
              ["--p-dark-shadow" as string]: `0 0 ${p.big ? 20 : 12}px ${p.neonColor}44, inset 0 0 ${p.big ? 12 : 6}px ${p.neonColor}11`,
            }}
          >
            {p.label}
          </div>
        );
      })}
    </div>
  );
}

// small inline random helper (avoids importing gsap here)
function gsapRandom(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
