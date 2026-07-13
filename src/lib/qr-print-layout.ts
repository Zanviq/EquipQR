const A4_CONTENT_WIDTH_MM = 190;
const A4_CONTENT_HEIGHT_MM = 277;
const LABEL_GAP_MM = 2;

export function calculateQrPrintLayout(input: { labelWidthMm: number; labelHeightMm: number; itemCount: number }) {
  if (input.labelWidthMm < 40 || input.labelWidthMm > 80 || input.labelHeightMm < 24 || input.labelHeightMm > 60) {
    throw new Error("지원하지 않는 QR 라벨 크기입니다.");
  }
  const columns = Math.floor((A4_CONTENT_WIDTH_MM + LABEL_GAP_MM) / (input.labelWidthMm + LABEL_GAP_MM));
  const rows = Math.floor((A4_CONTENT_HEIGHT_MM + LABEL_GAP_MM) / (input.labelHeightMm + LABEL_GAP_MM));
  const perPage = Math.max(1, columns * rows);
  return { columns, rows, perPage, pageCount: input.itemCount === 0 ? 0 : Math.ceil(input.itemCount / perPage) };
}
