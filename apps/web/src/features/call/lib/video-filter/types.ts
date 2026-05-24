export interface VideoFilterPresetPublic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoFilterPreset extends VideoFilterPresetPublic {
  fragment_shader: string;
}

export const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export const PASSTHROUGH_FRAGMENT = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;

export const FRAGMENT_SHADER_PREFIX = `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_texCoord;
`;
