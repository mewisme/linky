'use client';

import { Shader } from "@ws/ui/components/mew-ui/shader";

export default function TestPage() {
  return (
    <div className="w-full h-full">
      <Shader
        type='heatmap' preset='sepia' className="w-96 h-96" fit="contain"
      />
    </div>
  );
}