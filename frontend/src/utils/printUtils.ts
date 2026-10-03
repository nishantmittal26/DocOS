/** Hide main app (#root) while printing portal-based prescription modal content. */
export function printPrescriptionModal(): void {
  document.body.classList.add('print-modal-active');

  const cleanup = () => {
    document.body.classList.remove('print-modal-active');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
}
