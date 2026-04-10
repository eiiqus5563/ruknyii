'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, ArrowRight, Loader2, FileText, AlertCircle } from 'lucide-react';

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/downloads/${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'تعذر تحميل الملف');
      }
      if (data.url) {
        setFileName(data.fileName || 'ملف');
        window.open(data.url, '_blank');
        setDownloaded(true);
      }
    } catch (e: any) {
      setError(e.message || 'تعذر تحميل الملف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f7]">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#ede7dd]/70">
        <div className="max-w-lg mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center transition-colors hover:bg-[#ebebeb]"
          >
            <ArrowRight className="w-4 h-4 text-[#1D1D1F]" />
          </button>
          <h1 className="text-[16px] font-bold text-[#1D1D1F]">تحميل الملف</h1>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 py-10 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[28px] border border-[#ede7dd] p-8 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <FileText className="w-8 h-8 text-emerald-500" />
          </div>

          {fileName && (
            <p className="text-[14px] text-[#666] mb-2">{fileName}</p>
          )}

          {error ? (
            <div className="flex items-center gap-2 justify-center text-rose-500 mb-4">
              <AlertCircle className="w-4 h-4" />
              <p className="text-[14px]">{error}</p>
            </div>
          ) : downloaded ? (
            <p className="text-[15px] font-semibold text-emerald-600 mb-4">تم بدء التحميل!</p>
          ) : (
            <p className="text-[15px] text-[#1D1D1F] font-semibold mb-1">ملفك جاهز للتحميل</p>
          )}

          <p className="text-[12px] text-[#999] mb-6">اضغط الزر أدناه لتحميل الملف الرقمي</p>

          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full h-[50px] bg-emerald-500 text-white rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5" />
                {downloaded ? 'تحميل مرة أخرى' : 'تحميل الملف'}
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
