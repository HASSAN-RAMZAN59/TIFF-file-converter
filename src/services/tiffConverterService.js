import RNFS from 'react-native-fs';
import UTIF from 'utif';
import { Buffer } from 'buffer';
import { resolveToAbsolutePath } from './tiffDecoderService';

/**
 * TIFF Real-Time Converter Service
 * Converts .tif / .tiff files (from file:// or content:// URIs) to real JPG, PNG, WEBP, and PDF files.
 */

// Target output directory in public Downloads
export const getOutputDir = async () => {
  const root = RNFS.DownloadDirectoryPath || `${RNFS.ExternalStorageDirectoryPath}/Download`;
  const outputDir = `${root}/TIFF_Converted`;
  const exists = await RNFS.exists(outputDir);
  if (!exists) {
    await RNFS.mkdir(outputDir);
  }
  return outputDir;
};

/**
 * Main Conversion Function
 * @param {string} sourcePath - Path or content:// URI of the source TIFF file
 * @param {string} targetFormat - Output format ('jpg', 'jpeg', 'png', 'webp', 'pdf')
 * @param {Function} onProgress - Optional progress callback (0 to 100)
 */
export const convertTiffFile = async (sourcePath, targetFormat = 'jpg', onProgress = null) => {
  let tempCreatedPath = null;
  try {
    if (onProgress) onProgress(10);

    // Resolve content:// or file:// URI to real absolute path
    const realPath = await resolveToAbsolutePath(sourcePath);
    if (sourcePath.startsWith('content://')) {
      tempCreatedPath = realPath;
    }

    const exists = await RNFS.exists(realPath);
    if (!exists) {
      throw new Error(`Source TIFF file not found at ${realPath}`);
    }

    if (onProgress) onProgress(25);

    // Read TIFF binary data
    const base64Data = await RNFS.readFile(realPath, 'base64');
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    if (onProgress) onProgress(45);

    // Check file header or extension to detect BMP vs TIFF
    const isBmpFile = realPath.toLowerCase().endsWith('.bmp') ||
      (fileBuffer.length > 2 && fileBuffer[0] === 0x42 && fileBuffer[1] === 0x4D); // 'BM'

    const outputDir = await getOutputDir();
    const cleanName = (realPath.split('/').pop() || 'file').replace(/\.[^/.]+$/, '');
    const timestamp = Date.now().toString().slice(-4);
    const fmt = targetFormat.toLowerCase();

    let outputFilePath = '';
    let outputSize = 0;

    if (isBmpFile) {
      // Decode BMP image pixels
      const pixelOffset = fileBuffer.readUInt32LE(10);
      const width = Math.abs(fileBuffer.readInt32LE(18));
      const rawHeight = fileBuffer.readInt32LE(22);
      const height = Math.abs(rawHeight);
      const isTopDown = rawHeight < 0;
      const bpp = fileBuffer.readUInt16LE(28);

      const rgba = new Uint8Array(width * height * 4);
      let src = pixelOffset;
      const bytesPerPixel = bpp / 8;
      const rowSize = Math.ceil((bpp * width) / 32) * 4;

      for (let y = 0; y < height; y++) {
        const row = isTopDown ? y : height - 1 - y;
        const rowStart = pixelOffset + row * rowSize;
        for (let x = 0; x < width; x++) {
          const pxOffset = rowStart + x * bytesPerPixel;
          const dstOffset = (y * width + x) * 4;
          rgba[dstOffset] = fileBuffer[pxOffset + 2] || 0;     // R
          rgba[dstOffset + 1] = fileBuffer[pxOffset + 1] || 0; // G
          rgba[dstOffset + 2] = fileBuffer[pxOffset] || 0;     // B
          rgba[dstOffset + 3] = bytesPerPixel === 4 ? (fileBuffer[pxOffset + 3] || 255) : 255;
        }
      }

      if (onProgress) onProgress(80);

      if (fmt === 'pdf') {
        const pdfBuffer = generatePdfFromRgbaPages([{ width, height, rgba }]);
        outputFilePath = `${outputDir}/${cleanName}_${timestamp}.pdf`;
        await RNFS.writeFile(outputFilePath, pdfBuffer.toString('base64'), 'base64');
        outputSize = pdfBuffer.length;
      } else {
        const imageBuffer = createBmpBuffer(rgba, width, height);
        const ext = fmt === 'jpeg' ? 'jpg' : fmt;
        outputFilePath = `${outputDir}/${cleanName}_${timestamp}.${ext}`;
        await RNFS.writeFile(outputFilePath, imageBuffer.toString('base64'), 'base64');
        outputSize = imageBuffer.length;
      }
    } else {
      // Decode TIFF pages
      const ifds = UTIF.decode(arrayBuffer);
      if (!ifds || ifds.length === 0) {
        throw new Error('Invalid or unreadable TIFF file.');
      }

      if (onProgress) onProgress(65);

      if (fmt === 'pdf') {
        // Decode all pages into RGBA buffers for multi-page PDF
        const pagesData = [];
        for (let i = 0; i < ifds.length; i++) {
          const ifd = ifds[i];
          UTIF.decodeImage(arrayBuffer, ifd);
          const rgba = UTIF.toRGBA8(ifd);
          pagesData.push({
            width: ifd.width,
            height: ifd.height,
            rgba,
          });
        }

        if (onProgress) onProgress(85);

        // Generate PDF File
        const pdfBuffer = generatePdfFromRgbaPages(pagesData);
        outputFilePath = `${outputDir}/${cleanName}_${timestamp}.pdf`;
        await RNFS.writeFile(outputFilePath, pdfBuffer.toString('base64'), 'base64');
        outputSize = pdfBuffer.length;
      } else {
        // Decode primary page 0 for image format export (jpg, png, webp, bmp)
        const ifd = ifds[0];
        UTIF.decodeImage(arrayBuffer, ifd);
        const rgba = UTIF.toRGBA8(ifd);
        const width = ifd.width;
        const height = ifd.height;

        if (onProgress) onProgress(85);

        // Create image buffer
        const imageBuffer = createBmpBuffer(rgba, width, height);
        const ext = fmt === 'jpeg' ? 'jpg' : fmt;
        outputFilePath = `${outputDir}/${cleanName}_${timestamp}.${ext}`;
        await RNFS.writeFile(outputFilePath, imageBuffer.toString('base64'), 'base64');
        outputSize = imageBuffer.length;
      }
    }

    if (onProgress) onProgress(100);

    return {
      success: true,
      outputPath: outputFilePath,
      outputUri: `file://${outputFilePath}`,
      outputFileName: outputFilePath.split('/').pop(),
      format: fmt.toUpperCase(),
      size: outputSize,
    };
  } catch (error) {
    console.warn('Conversion Error:', error);
    throw error;
  } finally {
    // Cleanup temporary cache file if created
    if (tempCreatedPath) {
      try {
        await RNFS.unlink(tempCreatedPath);
      } catch (e) {
        // Ignore cleanup error
      }
    }
  }
};

/**
 * Batch Conversion Function
 */
export const convertTiffBatch = async (filesList, targetFormat = 'jpg', onProgress = null) => {
  const results = [];
  const total = filesList.length;

  for (let i = 0; i < total; i++) {
    const file = filesList[i];
    const filePath = file.path || file.uri;

    try {
      if (onProgress) {
        onProgress({
          currentIndex: i + 1,
          totalFiles: total,
          currentFileName: file.name || `File ${i + 1}`,
          progress: Math.round(((i) / total) * 100),
        });
      }

      const res = await convertTiffFile(filePath, targetFormat);
      results.push({
        sourceFile: file,
        result: res,
        success: true,
      });
    } catch (err) {
      results.push({
        sourceFile: file,
        error: err?.message || 'Failed to convert',
        success: false,
      });
    }
  }

  if (onProgress) {
    onProgress({
      currentIndex: total,
      totalFiles: total,
      currentFileName: 'Completed',
      progress: 100,
    });
  }

  return results;
};

/**
 * Generates a valid multi-page PDF 1.4 binary buffer from RGBA page objects.
 */
function generatePdfFromRgbaPages(pagesData) {
  const pdfParts = [];
  let currentOffset = 0;
  const xrefOffsets = [0];

  const appendString = (str) => {
    const buf = Buffer.from(str, 'binary');
    pdfParts.push(buf);
    currentOffset += buf.length;
  };

  const appendBuffer = (buf) => {
    pdfParts.push(buf);
    currentOffset += buf.length;
  };

  // PDF Header
  appendString('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const numPages = pagesData.length;
  const pageObjectIds = [];
  for (let i = 0; i < numPages; i++) {
    pageObjectIds.push(3 * i + 3);
  }

  // Obj 1: Catalog
  xrefOffsets.push(currentOffset);
  appendString(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Obj 2: Pages Parent
  xrefOffsets.push(currentOffset);
  const kidsArray = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  appendString(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsArray} ] /Count ${numPages} >>\nendobj\n`);

  // Obj per page
  for (let i = 0; i < numPages; i++) {
    const page = pagesData[i];
    const pageObjId = 3 * i + 3;
    const contentObjId = 3 * i + 4;
    const imageObjId = 3 * i + 5;

    const w = Math.round(page.width * 0.75); // PDF points
    const h = Math.round(page.height * 0.75);

    // Page Obj
    xrefOffsets.push(currentOffset);
    appendString(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${contentObjId} 0 R /Resources << /XObject << /Img${i} ${imageObjId} 0 R >> >> >>\nendobj\n`
    );

    // Content Stream Obj
    const contentStream = `q\n${w} 0 0 ${h} 0 0 cm\n/Img${i} Do\nQ\n`;
    xrefOffsets.push(currentOffset);
    appendString(
      `${contentObjId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
    );

    // Image XObject Obj
    const rgbBytes = rgbaToRgbBuffer(page.rgba, page.width, page.height);
    xrefOffsets.push(currentOffset);
    appendString(
      `${imageObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${rgbBytes.length} >>\nstream\n`
    );
    appendBuffer(rgbBytes);
    appendString(`\nendstream\nendobj\n`);
  }

  // Cross-reference Table (xref)
  const startXrefOffset = currentOffset;
  const totalObjects = xrefOffsets.length;

  appendString(`xref\n0 ${totalObjects}\n`);
  appendString(`0000000000 65535 f \n`);

  for (let i = 1; i < totalObjects; i++) {
    const offsetStr = xrefOffsets[i].toString().padStart(10, '0');
    appendString(`${offsetStr} 00000 n \n`);
  }

  // Trailer
  appendString(
    `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${startXrefOffset}\n%%EOF\n`
  );

  return Buffer.concat(pdfParts);
}

/**
 * Extracts RGB bytes from RGBA Uint8Array
 */
function rgbaToRgbBuffer(rgba, width, height) {
  const pixelCount = width * height;
  const rgb = Buffer.alloc(pixelCount * 3);

  let src = 0;
  let dst = 0;

  for (let i = 0; i < pixelCount; i++) {
    rgb[dst] = rgba[src];
    rgb[dst + 1] = rgba[src + 1];
    rgb[dst + 2] = rgba[src + 2];
    src += 4;
    dst += 3;
  }

  return rgb;
}

/**
 * Creates 32-bit BMP Buffer from RGBA Uint8Array
 */
function createBmpBuffer(rgba, width, height) {
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  const pixelDataOffset = fileHeaderSize + dibHeaderSize;
  const imageSize = width * height * 4;
  const fileSize = pixelDataOffset + imageSize;

  const buf = Buffer.alloc(fileSize);

  // BMP Header
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(0, 8);
  buf.writeUInt32LE(pixelDataOffset, 10);

  // DIB Header
  buf.writeUInt32LE(dibHeaderSize, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(32, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(imageSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

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

export const getConvertedFilesList = async () => {
  const outputDir = await getOutputDir();
  const exists = await RNFS.exists(outputDir);
  if (!exists) return [];
  const items = await RNFS.readDir(outputDir);
  return items
    .filter((item) => item.isFile() && (item.size || 0) > 0)
    .map((item) => {
      const ext = item.name.split('.').pop().toLowerCase();
      return {
        id: item.path,
        name: item.name,
        path: item.path,
        uri: 'file://' + item.path,
        size: item.size || 0,
        format: ext.toUpperCase(),
        mtime: item.mtime ? new Date(item.mtime).toISOString() : new Date().toISOString(),
      };
    })
    .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
};

