import RNFS from 'react-native-fs';
import UTIF from 'utif';
import { Buffer } from 'buffer';

/**
 * Decodes a TIFF file at filePath into a base64 data URI (data:image/bmp;base64,...)
 * Supports single-page and multi-page TIFF files of any compression.
 */
export const decodeTiffToBase64Uri = async (filePath, pageIndex = 0) => {
  try {
    const cleanPath = filePath.replace('file://', '');
    const exists = await RNFS.exists(cleanPath);
    if (!exists) {
      throw new Error(`File does not exist at ${cleanPath}`);
    }

    // Read TIFF file as base64 string from filesystem
    const base64Data = await RNFS.readFile(cleanPath, 'base64');
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    // Decode TIFF IFDs (pages)
    const ifds = UTIF.decode(arrayBuffer);
    if (!ifds || ifds.length === 0) {
      throw new Error('Invalid TIFF file or no IFDs found.');
    }

    const selectedPageIndex = Math.min(pageIndex, ifds.length - 1);
    const ifd = ifds[selectedPageIndex];

    // Decode pixel image data for selected page
    UTIF.decodeImage(arrayBuffer, ifd);
    const rgba = UTIF.toRGBA8(ifd); // Uint8Array [R, G, B, A, R, G, B, A...]

    const width = ifd.width;
    const height = ifd.height;

    // Convert RGBA to 32-bit BMP Buffer
    const bmpBuffer = createBmpBuffer(rgba, width, height);
    const base64Bmp = bmpBuffer.toString('base64');

    return {
      uri: `data:image/bmp;base64,${base64Bmp}`,
      width,
      height,
      totalPages: ifds.length,
      pageIndex: selectedPageIndex,
    };
  } catch (error) {
    console.warn('Error decoding TIFF image:', error);
    throw error;
  }
};

/**
 * Generates an uncompressed 32-bit BMP Buffer from RGBA Uint8Array
 */
function createBmpBuffer(rgba, width, height) {
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  const pixelDataOffset = fileHeaderSize + dibHeaderSize;
  const imageSize = width * height * 4;
  const fileSize = pixelDataOffset + imageSize;

  const buf = Buffer.alloc(fileSize);

  // --- BMP File Header (14 bytes) ---
  buf.write('BM', 0); // Signature
  buf.writeUInt32LE(fileSize, 2); // File size
  buf.writeUInt16LE(0, 6); // Reserved 1
  buf.writeUInt16LE(0, 8); // Reserved 2
  buf.writeUInt32LE(pixelDataOffset, 10); // Offset to image pixel data

  // --- DIB Header (BITMAPINFOHEADER - 40 bytes) ---
  buf.writeUInt32LE(dibHeaderSize, 14); // Header size
  buf.writeInt32LE(width, 18); // Image width
  buf.writeInt32LE(-height, 22); // Negative height for top-down row order
  buf.writeUInt16LE(1, 26); // Planes
  buf.writeUInt16LE(32, 28); // Bits per pixel (32-bit RGBA)
  buf.writeUInt32LE(0, 30); // Compression (0 = BI_RGB uncompressed)
  buf.writeUInt32LE(imageSize, 34); // Image size
  buf.writeInt32LE(2835, 38); // Horizontal resolution (72 DPI)
  buf.writeInt32LE(2835, 42); // Vertical resolution (72 DPI)
  buf.writeUInt32LE(0, 46); // Colors in color table
  buf.writeUInt32LE(0, 50); // Important colors

  // --- Copy RGBA to BGRA pixel array ---
  let srcOffset = 0;
  let dstOffset = pixelDataOffset;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = rgba[srcOffset];
      const g = rgba[srcOffset + 1];
      const b = rgba[srcOffset + 2];
      const a = rgba[srcOffset + 3];

      // BMP 32-bit format is BGRA
      buf[dstOffset] = b;
      buf[dstOffset + 1] = g;
      buf[dstOffset + 2] = r;
      buf[dstOffset + 3] = a;

      srcOffset += 4;
      dstOffset += 4;
    }
  }

  return buf;
}
