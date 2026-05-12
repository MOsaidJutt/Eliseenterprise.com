export type ProgressFn = (label: string, pct: number) => void;

export async function downloadPDF(
  contentEl: HTMLElement,
  filename = "plainview-report.pdf",
  onProgress?: ProgressFn,
): Promise<void> {
  onProgress?.("Loading export library…", 5);

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  onProgress?.("Capturing dashboard content…", 20);

  const canvas = await html2canvas(contentEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#F1F5F9",
    logging: false,
    windowWidth: contentEl.scrollWidth,
    windowHeight: contentEl.scrollHeight,
    width: contentEl.scrollWidth,
    height: contentEl.scrollHeight,
    onclone: () => { onProgress?.("Rendering charts…", 45); },
  });

  onProgress?.("Building PDF pages…", 70);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = pageW / canvas.width;
  const scaledH = canvas.height * ratio;
  const totalPages = Math.ceil(scaledH / pageH);

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, -(i * pageH), pageW, scaledH);
  }

  onProgress?.("Saving file…", 90);
  pdf.save(filename);

  onProgress?.("Done", 100);
}
