import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [kind, inputPath, outputDir] = process.argv.slice(2);
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;
const IMAGE_BOXES = { thumbnail: 320, small: 640, medium: 1024, large: 1920 };

function fail(message) {
  process.stderr.write(String(message).replace(/[\r\n]+/g, " ").slice(0, 512));
  process.exit(64);
}
function safeWrite(role, bytes) {
  if (!/^(original|thumbnail|small|medium|large)$/.test(role)) fail("invalid role");
  const target = path.join(outputDir, role);
  if (bytes.length > MAX_OUTPUT_BYTES) fail("output budget exceeded");
  fs.writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
  return { role, path: target, bytes: bytes.length, checksum: crypto.createHash("sha256").update(bytes).digest("hex") };
}
function decodePdfNames(source) {
  return source.replace(/\/((?:#[0-9a-fA-F]{2}|[^\s()<>{}\[\]/%#])+)/g, (match, name) => {
    const decoded = name.replace(/#([0-9a-fA-F]{2})/g, (_escape, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
    return `/${decoded}`;
  });
}
function inspectPdfSyntax(bytes) {
  if (bytes.length < 16 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") fail("invalid pdf header");
  const tailStart = Math.max(0, bytes.length - 4096);
  const tail = bytes.subarray(tailStart).toString("latin1");
  const eof = tail.lastIndexOf("%%EOF");
  if (eof < 0 || /[^\x00\x09\x0a\x0c\x0d\x20]/.test(tail.slice(eof + 5))) fail("invalid pdf eof");
  const source = decodePdfNames(bytes.toString("latin1"));
  const forbidden = /\/(?:JavaScript|JS|Launch|OpenAction|AA|RichMedia|XFA|EmbeddedFile|Filespec|URI|SubmitForm|ImportData|GoToR|Sound|Movie|Encrypt)\b/;
  if (forbidden.test(source)) fail("unsafe pdf feature");
  const objectCount = (source.match(/\b\d+\s+\d+\s+obj\b/g) || []).length;
  const streamCount = (source.match(/\bstream[\r\n]/g) || []).length;
  const referenceCount = (source.match(/\b\d+\s+\d+\s+R\b/g) || []).length;
  if (objectCount > 10000 || streamCount > 2000 || referenceCount > 50000) fail("pdf structure budget exceeded");
}

async function main() {
  if (process.env.MEDIA_FIXTURE === "hang") return void setInterval(() => {}, 1000);
  if (process.env.MEDIA_FIXTURE === "crash") process.abort();
  if (process.env.MEDIA_FIXTURE === "flood") return void process.stdout.write("x".repeat(70000));
  if (process.env.MEDIA_FIXTURE === "inodes") { fs.mkdirSync(outputDir, { recursive: true }); for (let i = 0; i < 256; i++) fs.writeFileSync(`${outputDir}/${i}`, ""); return; }
  if (process.env.MEDIA_FIXTURE === "blocks") { fs.mkdirSync(outputDir, { recursive: true }); fs.writeFileSync(`${outputDir}/huge`, Buffer.alloc(110 * 1024 * 1024)); return; }
  if (!inputPath || !outputDir || !path.isAbsolute(inputPath) || !path.isAbsolute(outputDir)) fail("invalid paths");
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  const input = fs.readFileSync(inputPath);
  let result;
  if (kind === "image") {
    process.env.VIPS_CONCURRENCY = "1";
    const sharp = (await import("sharp")).default;
    sharp.cache(false);
    sharp.concurrency(1);
    const decoded = sharp(input, { limitInputPixels: 40_000_000, pages: 1, animated: false, failOn: "warning", sequentialRead: true });
    const metadata = await decoded.metadata();
    if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format || "") || metadata.pages && metadata.pages !== 1 || metadata.width > 12000 || metadata.height > 12000 || metadata.width * metadata.height > 40_000_000) fail("invalid image");
    const canonical = await decoded.rotate().toFormat(metadata.format).toBuffer();
    const outputs = [safeWrite("original", canonical)];
    const longest = Math.max(metadata.width, metadata.height);
    for (const [role, box] of Object.entries(IMAGE_BOXES)) {
      if (longest <= box) continue;
      const derivative = await sharp(canonical, { limitInputPixels: 40_000_000, pages: 1, animated: false, failOn: "warning" }).resize({ width: box, height: box, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
      outputs.push(safeWrite(role, derivative));
    }
    if (outputs.reduce((sum, output) => sum + output.bytes, 0) > MAX_OUTPUT_BYTES) fail("output budget exceeded");
    result = { ok: true, kind, contentType: `image/${metadata.format}`, width: metadata.width, height: metadata.height, outputs };
  } else if (kind === "pdf") {
    inspectPdfSyntax(input);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loading = pdfjs.getDocument({ data: new Uint8Array(input), isEvalSupported: false, useSystemFonts: false, disableFontFace: true, stopAtErrors: true, maxImageSize: 40_000_000 });
    const doc = await loading.promise;
    if (!Number.isSafeInteger(doc.numPages) || doc.numPages < 1 || doc.numPages > 300) fail("invalid page count");
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const operators = await page.getOperatorList();
      if (operators.fnArray.length > 200_000) fail("pdf operator budget exceeded");
      page.cleanup();
    }
    await doc.destroy();
    result = { ok: true, kind, contentType: "application/pdf", pageCount: doc.numPages, outputs: [safeWrite("original", input)] };
  } else fail("unsupported kind");
  const json = JSON.stringify(result);
  if (Buffer.byteLength(json) > 65536) fail("result budget exceeded");
  process.stdout.write(json);
}

main().catch(error => fail(error instanceof Error ? error.message : "parser failed"));
