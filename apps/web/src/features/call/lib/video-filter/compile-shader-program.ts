import * as Sentry from "@sentry/nextjs";
import { VERTEX_SHADER, PASSTHROUGH_FRAGMENT, FRAGMENT_SHADER_PREFIX } from "./types";

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    Sentry.logger.warn("Shader compile error", { log, type });
    return null;
  }
  return shader;
}

export function createShaderProgram(
  gl: WebGLRenderingContext,
  fragmentSource: string | null,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  if (!vs) return null;

  const source = fragmentSource
    ? FRAGMENT_SHADER_PREFIX + "\n" + fragmentSource
    : PASSTHROUGH_FRAGMENT;

  const fs = compileShader(gl, gl.FRAGMENT_SHADER, source);
  if (!fs) {
    gl.deleteShader(vs);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    Sentry.logger.warn("Shader link error", { log });
    return null;
  }

  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}
