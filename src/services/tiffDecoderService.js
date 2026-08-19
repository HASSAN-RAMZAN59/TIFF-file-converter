import RNFS from 'react-native-fs';
import UTIF from 'utif';
import { Buffer } from 'buffer';

/**
 * Resolves any content:// URI or file:// URI into a readable absolute filesystem path.
 */
export const resolveToAbsolutePath = async (inputUri) => {
  if (!inputUri) return '';

  if (inputUri.startsWith('/storage/') || inputUri.startsWith('/sdcard/')) {
    return inputUri;
  }

  if (inputUri.startsWith('file://')) {
    return inputUri.replace('file://', '');
  }

  // Handle content:// URIs from DocumentPicker
  if (inputUri.startsWith('content://')) {
    try {
      const tempFileName = `temp_${Date.now()}_${Math.floor(Math.random() * 10000)}.tiff`;
      const tempPath = `${RNFS.CachesDirectoryPath}/${tempFileName}`;

      await RNFS.copyFile(inputUri, tempPath);
      console.log('Resolved content:// URI to cache path:', tempPath);
      return tempPath;
    } catch (copyErr) {
      console.warn('copyFile content URI error, attempting stat fallback:', copyErr);
      try {
        const statResult = await RNFS.stat(inputUri);
        if (statResult && statResult.path) {
          return statResult.path;
        }
      } catch (statErr) {
        console.warn('Stat fallback error:', statErr);
      }
      return inputUri;
    }
  }

  return inputUri;
};

/**
 * Decodes a TIFF file at filePath into a base64 data URI (data:image/bmp;base64,...)
 * Handles both file:// paths and content:// DocumentPicker URIs.
 */
export const decodeTiffToBase64Uri = async (filePath, pageIndex = 0) => {
  try {
    const realPath = await resolveToAbsolutePath(filePath);

    const exists = await RNFS.exists(realPath);
    if (!exists) {
      throw new Error(`File does not exist at ${realPath}`);
    }

    // Read TIFF file as base64 string from filesystem
    const base64Data = await RNFS.readFile(realPath, 'base64');
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
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(0, 8);
  buf.writeUInt32LE(pixelDataOffset, 10);

  // --- DIB Header (BITMAPINFOHEADER - 40 bytes) ---
  buf.writeUInt32LE(dibHeaderSize, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22); // Top-down
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(32, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(imageSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // --- Copy RGBA to BGRA pixel array ---
  let srcOffset = 0;
  let dstOffset = pixelDataOffset;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buf[dstOffset] = rgba[srcOffset + 2];     // B
      buf[dstOffset + 1] = rgba[srcOffset + 1]; // G
      buf[dstOffset + 2] = rgba[srcOffset];     // R
      buf[dstOffset + 3] = rgba[srcOffset + 3]; // A
      srcOffset += 4;
      dstOffset += 4;
    }
  }

  return buf;
}
