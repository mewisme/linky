import * as Sentry from "@sentry/nextjs";
import { createShaderProgram } from "./compile-shader-program";

const FULLSCREEN_QUAD = new Float32Array([
  -1, -1, 0, 0,
   1, -1, 1, 0,
  -1,  1, 0, 1,
   1,  1, 1, 1,
]);

export class VideoFilterPipeline {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private video: HTMLVideoElement;
  private outputStream: MediaStream;
  private outputVideoTrack: MediaStreamTrack;
  private animationId: number | null = null;
  private program: WebGLProgram | null = null;
  private startTime: number = 0;
  private sourceStream: MediaStream | null = null;
  private disposed = false;
  private posBuffer: WebGLBuffer | null = null;
  private uTextureLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private aPositionLoc: number = -1;
  private aTexCoordLoc: number = -1;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("data-video-filter", "1");

    this.video = document.createElement("video");
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("muted", "");
    this.video.setAttribute("data-video-filter-source", "1");

    this.outputStream = this.canvas.captureStream(30);
    const tracks = this.outputStream.getVideoTracks();
    if (tracks.length === 0 || !tracks[0]) {
      throw new Error("canvas.captureStream returned no video tracks");
    }
    this.outputVideoTrack = tracks[0];
  }

  start(sourceStream: MediaStream): MediaStream {
    if (this.disposed) throw new Error("Pipeline already disposed");
    this.sourceStream = sourceStream;

    const videoTrack = sourceStream.getVideoTracks()[0];
    if (videoTrack) {
      this.video.srcObject = new MediaStream([videoTrack]);
      this.video.play().catch((e) => {
        Sentry.logger.warn("Video autoplay failed in filter pipeline", { error: e });
      });
    }

    const gl = this.canvas.getContext("webgl", { premultipliedAlpha: false });
    if (!gl) {
      this.gl = null;
      return this.fallbackRawStream(sourceStream);
    }

    this.gl = gl;
    this.setupGeometry();
    this.compileAndUse(null);
    this.startTime = performance.now();
    this.loop();

    return this.combinedStream(sourceStream);
  }

  setFragmentSource(shader: string | null): boolean {
    if (this.disposed || !this.gl) return false;
    return this.compileAndUse(shader);
  }

  getVideoTrack(): MediaStreamTrack {
    return this.outputVideoTrack;
  }

  getOutputCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  dispose(): void {
    this.disposed = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.outputVideoTrack.stop();
    this.video.pause();
    this.video.srcObject = null;
    if (this.gl) {
      const gl = this.gl;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      this.gl = null;
    }
  }

  private setupGeometry(): void {
    const gl = this.gl!;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_QUAD, gl.STATIC_DRAW);
    this.posBuffer = buf;
  }

  private compileAndUse(shader: string | null): boolean {
    const gl = this.gl!;
    const program = createShaderProgram(gl, shader);
    if (!program) {
      if (shader) {
        const fallback = createShaderProgram(gl, null);
        if (fallback) {
          this.program = fallback;
          this.cacheUniforms(gl);
        }
      }
      return false;
    }

    if (this.program) gl.deleteProgram(this.program);
    this.program = program;
    gl.useProgram(program);
    this.cacheUniforms(gl);
    return true;
  }

  private cacheUniforms(gl: WebGLRenderingContext): void {
    if (!this.program) return;
    this.uTextureLoc = gl.getUniformLocation(this.program, "u_texture");
    this.uTimeLoc = gl.getUniformLocation(this.program, "u_time");
    this.uResolutionLoc = gl.getUniformLocation(this.program, "u_resolution");
    this.aPositionLoc = gl.getAttribLocation(this.program, "a_position");
    this.aTexCoordLoc = gl.getAttribLocation(this.program, "a_texCoord");
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const gl = this.gl;
    if (!gl || !this.program || !this.posBuffer) return;

    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    if (vw === 0 || vh === 0) return;

    if (this.canvas.width !== vw || this.canvas.height !== vh) {
      this.canvas.width = vw;
      this.canvas.height = vh;
      gl.viewport(0, 0, vw, vh);
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);

    gl.useProgram(this.program);

    if (this.uTextureLoc !== null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(this.uTextureLoc, 0);
    }

    if (this.uTimeLoc !== null) {
      gl.uniform1f(this.uTimeLoc, (performance.now() - this.startTime) / 1000);
    }

    if (this.uResolutionLoc !== null) {
      gl.uniform2f(this.uResolutionLoc, vw, vh);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);

    if (this.aPositionLoc >= 0) {
      gl.enableVertexAttribArray(this.aPositionLoc);
      gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, 16, 0);
    }

    if (this.aTexCoordLoc >= 0) {
      gl.enableVertexAttribArray(this.aTexCoordLoc);
      gl.vertexAttribPointer(this.aTexCoordLoc, 2, gl.FLOAT, false, 16, 8);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.deleteTexture(texture);
  }

  private fallbackRawStream(sourceStream: MediaStream): MediaStream {
    this.gl = null;
    const videoTrack = sourceStream.getVideoTracks()[0];
    if (!videoTrack) return sourceStream;
    const raw = new MediaStream([videoTrack, ...sourceStream.getAudioTracks()]);
    return raw;
  }

  private combinedStream(sourceStream: MediaStream): MediaStream {
    const combined = new MediaStream();
    combined.addTrack(this.outputVideoTrack);
    sourceStream.getAudioTracks().forEach((t) => combined.addTrack(t));
    return combined;
  }
}
