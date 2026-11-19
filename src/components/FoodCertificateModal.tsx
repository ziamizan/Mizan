import React, { useEffect, useState } from 'react';
import { X, Download, ShieldCheck, CheckCircle2, Utensils, Calendar, MapPin } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { FoodDonationCertificate } from '../types';
import { formatDisplayDateTime } from '../lib/statusHelpers';

interface FoodCertificateModalProps {
  certificate: FoodDonationCertificate | null;
  onClose: () => void;
}

export function FoodCertificateModal({ certificate, onClose }: FoodCertificateModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (!certificate) return;
    const verifyText = `${window.location.origin}/verify/${certificate.certificateId}?token=${certificate.verificationToken}`;
    QRCode.toDataURL(verifyText, { width: 140, margin: 1 })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [certificate]);

  if (!certificate) return null;

  const handleDownloadPdf = () => {
    const docPdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const w = docPdf.internal.pageSize.getWidth();
    const h = docPdf.internal.pageSize.getHeight();

    docPdf.setFillColor(246, 253, 249);
    docPdf.rect(0, 0, w, h, 'F');
    docPdf.setDrawColor(16, 185, 129);
    docPdf.setLineWidth(6);
    docPdf.rect(24, 24, w - 48, h - 48);

    docPdf.setTextColor(6, 95, 70);
    docPdf.setFontSize(26);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('HelpConnect Food Rescue Digital Certificate', w / 2, 92, { align: 'center' });

    docPdf.setTextColor(71, 85, 105);
    docPdf.setFontSize(12);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text('Verified Food Handover & Community Hunger Relief Record', w / 2, 118, { align: 'center' });

    docPdf.setTextColor(15, 23, 42);
    docPdf.setFontSize(14);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(`Certificate ID: ${certificate.certificateId}`, 72, 175);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(`Food Donated: ${certificate.foodName} (${certificate.foodCategory})`, 72, 210);
    docPdf.text(`Quantity Delivered: ${certificate.quantityDelivered} ${certificate.quantityUnit}`, 72, 240);
    docPdf.text(`Donor: ${certificate.donorName}`, 72, 270);
    docPdf.text(`Recipient / Orphanage: ${certificate.receiverName}`, 72, 300);
    docPdf.text(`Location: ${certificate.city}`, 72, 330);
    docPdf.text(`Completed At: ${formatDisplayDateTime(certificate.completedAt)}`, 72, 360);
    docPdf.text(`Verification Token: ${certificate.verificationToken}`, 72, 390);

    if (qrUrl) {
      docPdf.addImage(qrUrl, 'PNG', w - 210, 170, 130, 130);
    }

    docPdf.setFontSize(10);
    docPdf.setTextColor(100, 116, 139);
    docPdf.text('Verified by HelpConnect Food Donation & Rescue Network', w / 2, h - 55, { align: 'center' });
    docPdf.save(`${certificate.certificateId}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Utensils size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                Verified Digital Proof
              </p>
              <h2 className="text-lg font-extrabold">Food Donation Handover Certificate</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close certificate"
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Certificate ID</p>
              <p className="font-mono text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                {certificate.certificateId}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={16} />
              <span>{certificate.status} · Handover Confirmed</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-8 space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Food Item &amp; Category</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {certificate.foodName} · {certificate.foodCategory}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Quantity Delivered</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {certificate.quantityDelivered} {certificate.quantityUnit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                    <MapPin size={13} /> {certificate.city}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Food Donor</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{certificate.donorName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Recipient / Orphanage</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{certificate.receiverName}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                <Calendar size={13} />
                <span>Completed on {formatDisplayDateTime(certificate.completedAt)}</span>
              </div>
            </div>

            <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              {qrUrl ? (
                <img src={qrUrl} alt="Certificate QR Code" className="w-32 h-32 rounded-lg" />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
              )}
              <p className="text-[10px] font-mono text-slate-500 mt-2 text-center break-all">
                {certificate.verificationToken.slice(0, 16)}...
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck size={15} className="text-emerald-600" /> Tamper-evident digital food rescue proof
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
