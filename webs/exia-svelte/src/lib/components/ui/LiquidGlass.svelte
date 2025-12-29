<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  // Props
  export let width: number = 300;
  export let height: number = 200;
  export let borderRadius: number = 24;
  export let className: string = "";
  export let draggable: boolean = false;
  export let intensity: number = 1.0; // 0.0 to 2.0 - controls displacement strength

  let container: HTMLDivElement;
  let filterId: string;
  let svgElement: SVGSVGElement;

  // Utility functions from liquid-glass library
  function smoothStep(a: number, b: number, t: number): number {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function length(x: number, y: number): number {
    return Math.sqrt(x * x + y * y);
  }

  function roundedRectSDF(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
  ): number {
    const qx = Math.abs(x) - w + radius;
    const qy = Math.abs(y) - h + radius;
    return (
      Math.min(Math.max(qx, qy), 0) +
      length(Math.max(qx, 0), Math.max(qy, 0)) -
      radius
    );
  }

  function generateId(): string {
    return "liquid-glass-" + Math.random().toString(36).substr(2, 9);
  }

  onMount(() => {
    filterId = generateId();

    // Create SVG filter
    svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement;
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgElement.setAttribute("width", "0");
    svgElement.setAttribute("height", "0");
    svgElement.style.cssText =
      "position: fixed; top: 0; left: 0; pointer-events: none; z-index: -1;";

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter",
    );
    filter.setAttribute("id", `${filterId}_filter`);
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("colorInterpolationFilters", "sRGB");
    filter.setAttribute("x", "0");
    filter.setAttribute("y", "0");
    filter.setAttribute("width", width.toString());
    filter.setAttribute("height", height.toString());

    const feImage = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feImage",
    );
    feImage.setAttribute("id", `${filterId}_map`);
    feImage.setAttribute("width", width.toString());
    feImage.setAttribute("height", height.toString());

    const feDisplacementMap = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feDisplacementMap",
    );
    feDisplacementMap.setAttribute("in", "SourceGraphic");
    feDisplacementMap.setAttribute("in2", `${filterId}_map`);
    feDisplacementMap.setAttribute("xChannelSelector", "R");
    feDisplacementMap.setAttribute("yChannelSelector", "G");

    filter.appendChild(feImage);
    filter.appendChild(feDisplacementMap);
    defs.appendChild(filter);
    svgElement.appendChild(defs);
    document.body.appendChild(svgElement);

    // Generate displacement map
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      const w = width;
      const h = height;
      const data = new Uint8ClampedArray(w * h * 4);
      let maxScale = 0;
      const rawValues: number[] = [];

      // Calculate displacement values - more subtle, liquid-like
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % w;
        const y = Math.floor(i / 4 / w);

        const uvX = x / w;
        const uvY = y / h;

        // Fragment shader logic - adjusted for clearer refraction
        const ix = uvX - 0.5;
        const iy = uvY - 0.5;
        const distanceToEdge = roundedRectSDF(ix, iy, 0.4, 0.35, 0.4);
        const displacement = smoothStep(0.5, 0, distanceToEdge - 0.05);
        const scaled = smoothStep(0, 1, displacement) * intensity;

        const posX = ix * scaled + 0.5;
        const posY = iy * scaled + 0.5;

        const dx = posX * w - x;
        const dy = posY * h - y;
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
        rawValues.push(dx, dy);
      }

      maxScale *= 0.5;

      let index = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = rawValues[index++] / maxScale + 0.5;
        const g = rawValues[index++] / maxScale + 0.5;
        data[i] = r * 255;
        data[i + 1] = g * 255;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }

      ctx.putImageData(new ImageData(data, w, h), 0, 0);
      feImage.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "href",
        canvas.toDataURL(),
      );
      feDisplacementMap.setAttribute("scale", (maxScale * 0.8).toString());
    }

    // Apply clear glass filter - much less blur, better contrast
    container.style.backdropFilter = `url(#${filterId}_filter) blur(0.3px) contrast(1.08) brightness(1.02) saturate(1.15)`;
    container.style.webkitBackdropFilter = `url(#${filterId}_filter) blur(0.3px) contrast(1.08) brightness(1.02) saturate(1.15)`;

    // Drag functionality
    if (draggable) {
      let isDragging = false;
      let startX: number, startY: number, initialX: number, initialY: number;

      container.addEventListener("mousedown", (e) => {
        isDragging = true;
        container.style.cursor = "grabbing";
        startX = e.clientX;
        startY = e.clientY;
        const rect = container.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (isDragging) {
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;
          container.style.position = "fixed";
          container.style.left = initialX + deltaX + "px";
          container.style.top = initialY + deltaY + "px";
          container.style.transform = "none";
        }
      });

      document.addEventListener("mouseup", () => {
        isDragging = false;
        container.style.cursor = "grab";
      });
    }
  });

  onDestroy(() => {
    if (svgElement && svgElement.parentNode) {
      svgElement.parentNode.removeChild(svgElement);
    }
  });
</script>

<div
  bind:this={container}
  class="liquid-glass {className}"
  style="--lg-width: {width}px; --lg-height: {height}px; --lg-radius: {borderRadius}px;"
>
  <slot />
</div>

<style>
  .liquid-glass {
    position: relative;
    width: var(--lg-width);
    height: var(--lg-height);
    border-radius: var(--lg-radius);
    /* Clear glass - very low opacity, see-through */
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.15) 0%,
      rgba(255, 255, 255, 0.08) 50%,
      rgba(255, 255, 255, 0.12) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.35);
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.06),
      0 1px 3px rgba(0, 0, 0, 0.04),
      inset 0 1px 1px rgba(255, 255, 255, 0.6),
      inset 0 -1px 1px rgba(255, 255, 255, 0.2);
    overflow: hidden;
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;
  }

  .liquid-glass:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.08),
      0 2px 6px rgba(0, 0, 0, 0.05),
      inset 0 1px 1px rgba(255, 255, 255, 0.7),
      inset 0 -1px 1px rgba(255, 255, 255, 0.3);
  }
</style>
