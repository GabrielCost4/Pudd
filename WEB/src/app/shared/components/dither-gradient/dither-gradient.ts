import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-dither-gradient',
  host: { 'aria-hidden': 'true' },
  template: '<canvas #canvas></canvas>',
  styleUrl: './dither-gradient.css',
})
export class DitherGradient {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.initialize());
  }

  private initialize(): void {
    const canvas = this.canvas().nativeElement;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) return;

    const vertex = this.shader(
      gl,
      gl.VERTEX_SHADER,
      `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `,
    );
    const fragment = this.shader(
      gl,
      gl.FRAGMENT_SHADER,
      `
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;

      float bayer2(vec2 p) { return 2.0 * p.x + 3.0 * p.y - 4.0 * p.x * p.y; }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        vec2 pixel = floor(gl_FragCoord.xy);
        float threshold = (4.0 * bayer2(mod(pixel, 2.0))
          + bayer2(mod(floor(pixel / 2.0), 2.0)) + 0.5) / 16.0;
        float wave = 0.32 + 0.25 * sin(uv.x * 4.0 + sin(uv.y * 3.0 + time * 0.15))
          + 0.22 * cos(uv.y * 3.0 - time * 0.1);
        vec3 ink = mix(vec3(0.56, 0.43, 0.72), vec3(0.30, 0.54, 0.60),
          0.5 + 0.5 * sin(uv.x * 3.0 + time * 0.08));
        gl_FragColor = vec4(mix(vec3(0.047), ink, step(threshold, wave)), 1.0);
      }
    `,
    );
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      if (program) gl.deleteProgram(program);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'resolution');
    const time = gl.getUniformLocation(program, 'time');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let frame = 0;
    let lastDraw = 0;

    const draw = (timestamp: number) => {
      // Renderiza em resolução menor para manter os pontos visíveis e limitar o trabalho.
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, motion.matches ? 0 : timestamp / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.style.opacity = '1';
    };
    const animate = (timestamp: number) => {
      if (timestamp - lastDraw >= 50) {
        draw(timestamp);
        lastDraw = timestamp;
      }
      frame = requestAnimationFrame(animate);
    };
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!visible) return;
      draw(performance.now());
      if (!motion.matches) frame = requestAnimationFrame(animate);
    };
    const resize = new ResizeObserver(() => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth / 2));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight / 2));
      refresh();
    });
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      refresh();
    });
    resize.observe(canvas);
    visibility.observe(canvas);
    motion.addEventListener('change', refresh);
    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      motion.removeEventListener('change', refresh);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    });
  }

  private shader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }
}
