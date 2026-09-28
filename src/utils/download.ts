/** Offers text content to the user as a file download. */
export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // The download has started by now; release the object URL shortly after.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
