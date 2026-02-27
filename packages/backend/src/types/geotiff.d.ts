/**
 * Type declarations for geotiff library
 */

declare module 'geotiff' {
  export interface GeoTIFFImage {
    getOrigin(): [number, number];
    getResolution(): [number, number];
    getWidth(): number;
    getHeight(): number;
    readRasters(options?: { window?: number[] }): Promise<(Uint16Array | Float32Array | Uint8Array)[]>;
  }

  export interface GeoTIFF {
    getImage(index?: number): Promise<GeoTIFFImage>;
  }

  export interface FromUrlOptions {
    allowFullFile?: boolean;
  }

  export function fromUrl(url: string, options?: FromUrlOptions): Promise<GeoTIFF>;
}
