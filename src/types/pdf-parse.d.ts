// pdf-parse ships no types. We import the inner lib file directly to avoid the
// package's index debug block (which reads a local test PDF on import).
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdf(
    data: Buffer | Uint8Array,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;
  export default pdf;
}
