/// <reference types="vite/client" />

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetector {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetector;
}

declare const BarcodeDetector: BarcodeDetectorConstructor | undefined;

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
