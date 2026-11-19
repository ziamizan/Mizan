import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Download, Loader2 } from 'lucide-react';
import { DigitalProof } from '../types';
import { formatDisplayDate } from '../lib/statusHelpers';
import { cn } from '../lib/utils';

interface PdfDownloadButtonProps {
  proof: DigitalProof;
  className?: string;
}

export function PdfDownloadButton({ proof, className }: PdfDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const verifyUrl = `${window.location.origin}/verify/${proof.proofId}?t=${encodeURIComponent(
        proof.verificationToken
      )}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      // Outer border
      doc.setDrawColor(10, 88, 202);
      doc.setLineWidth(1.2);
      doc.roundedRect(12, 12, pageW - 24, 273, 4, 4);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(16, 16, pageW - 32, 265, 3, 3);

      // Header band
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(20, 20, pageW - 40, 32, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(10, 88, 202);
      doc.text('HelpConnect', 26, 31);

      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text('DIGITAL PROOF OF HELP', 26, 43);

      // Status pill in header
      const isValid = proof.proofStatus === 'VALID';
      doc.setFontSize(10);
      doc.setTextColor(isValid ? 25 : 220, isValid ? 135 : 53, isValid ? 84 : 69);
      doc.text(
        isValid ? 'VERIFIED · REQUESTER CONFIRMED' : 'SUSPENDED BY MODERATION',
        pageW - 26,
        36,
        { align: 'right' }
      );

      // Core metadata rows
      let y = 66;
      const rows: [string, string][] = [
        ['PROOF ID', proof.proofId],
        ['REQUEST ID', proof.requestId],
        ['HELP ACTIVITY', proof.requestTitle],
        ['CATEGORY', proof.category],
        ['HELPER', proof.helperDisplayName],
        ['REQUESTER', proof.requesterDisplayName],
        ['COMPLETION DATE', formatDisplayDate(proof.completedAt || proof.generatedAt)],
        ['CONFIRMATION DATE', formatDisplayDate(proof.confirmedAt || proof.generatedAt)],
        ['STATUS', isValid ? 'Successfully Completed' : 'Suspended'],
        ['VERIFICATION', 'Requester Confirmed'],
      ];

      rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(label, 26, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        const lines = doc.splitTextToSize(value, pageW - 95);
        doc.text(lines, 78, y);

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(26, y + Math.max(4, lines.length * 5) + 1, pageW - 26, y + Math.max(4, lines.length * 5) + 1);

        y += Math.max(11, lines.length * 5 + 6);
      });

      if (proof.optionalFeedback || proof.rating) {
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('OPTIONAL FEEDBACK', 26, y);
        y += 6;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const fbText = `${proof.rating ? `Rating: ${proof.rating}/5  ` : ''}${
          proof.optionalFeedback ? `"${proof.optionalFeedback}"` : ''
        }`;
        const fbLines = doc.splitTextToSize(fbText, pageW - 52);
        doc.text(fbLines, 26, y);
        y += fbLines.length * 5 + 6;
      }

      // QR Code Verification Box
      const qrY = Math.max(y + 6, 200);
      doc.addImage(qrDataUrl, 'PNG', 26, qrY, 38, 38);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('QR Code Verification', 70, qrY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const urlLines = doc.splitTextToSize(
        `Scan this QR code or visit:\n${verifyUrl}\nOnly non-sensitive confirmation details are shown publicly.`,
        pageW - 98
      );
      doc.text(urlLines, 70, qrY + 17);

      // Required disclaimer footer
      doc.setDrawColor(226, 232, 240);
      doc.line(26, 256, pageW - 26, 256);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const disclaimer =
        'This digital proof confirms that the requester voluntarily acknowledged receiving the assistance through HelpConnect. It is not an official government or legal certificate.';
      const discLines = doc.splitTextToSize(disclaimer, pageW - 52);
      doc.text(discLines, 26, 263);

      doc.save(`HelpConnect-Proof-${proof.proofId}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={downloading}
      className={cn(
        'min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2',
        className
      )}
    >
      {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      Download PDF
    </button>
  );
}
