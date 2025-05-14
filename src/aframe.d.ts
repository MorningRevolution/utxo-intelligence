
declare namespace AFRAME {
  // Basic A-Frame declaration to satisfy TypeScript
  const registerComponent: (name: string, component: any) => void;
  const registerSystem: (name: string, system: any) => void;
  const registerShader: (name: string, shader: any) => void;
  const registerPrimitive: (name: string, primitive: any) => void;
  const registerElement: (name: string, element: any) => void;
}

declare module 'aframe' {
  export = AFRAME;
}

declare module 'aframe-extras' {
  export = {};
}
