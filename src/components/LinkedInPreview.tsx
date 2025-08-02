import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Header } from './Header';
import { Footer } from './Footer';
import { ArrowLeft, Linkedin, X, Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentForm from './PaymentForm';
import { MdOutlineRemoveRedEye } from 'react-icons/md';

interface LinkedInData {
  tagLine: string;
  profileSummary: string;
  email: string;
  phone: string;
}

export const LinkedInPreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

 const { isDarkMode, toggleDarkMode } = useTheme()
  const { language, toggleLanguage } = useLanguage()
  const linkedInData = location.state as LinkedInData;
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  

  const handleBack = () => {
    navigate('/');
  };

  // Handle download button click
  const handleDownload = () => {
    setShowPaymentForm(true);
  };

  // Handle successful payment
  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setHasPaid(true);
    toast.success(
      language === 'ar'
        ? 'تم الدفع بنجاح! يمكنك الآن نسخ المحتوى'
        : 'Payment successful! You can now copy the content'
    );
  };

  // Handle copy text
  const handleCopy = (text: string) => {
    if (hasPaid) {
      navigator.clipboard.writeText(text);
      toast.success(
        language === 'ar'
          ? 'تم نسخ النص بنجاح'
          : 'Text copied successfully'
      );
    }
  };

  // Prevent text selection and copying if not paid
  const preventCopy = (e: React.ClipboardEvent | React.MouseEvent) => {
    if (!hasPaid) {
      e.preventDefault();
      toast.info(
        language === 'ar'
          ? 'يرجى الدفع أولاً للتمكن من نسخ المحتوى'
          : 'Please pay first to copy the content'
      );
    }
  };

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}
      onCopy={preventCopy}
      onCut={preventCopy}
      onContextMenu={preventCopy}
      style={{ 
        userSelect: hasPaid ? 'text' : 'none',
        WebkitUserSelect: hasPaid ? 'text' : 'none',
        MozUserSelect: hasPaid ? 'text' : 'none',
        msUserSelect: hasPaid ? 'text' : 'none'
      }}
    >
      <Header
        isDarkMode={isDarkMode}
        language={language}
        toggleDarkMode={toggleDarkMode}
        toggleLanguage={toggleLanguage}
      />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back Button */}
          <div className="mb-8 flex justify-between ">
            <button
              onClick={handleBack}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                isDarkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700' 
                  : 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
            </button>
            <button 
              onClick={handleDownload}
              className='border px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors'
            >
                {language === 'ar' ? 'تحميل' : 'Copy Text'}
            </button>
          </div>
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 flex items-center justify-center gap-3">
              
              {language === 'ar' ? 'تحسين الملف الشخصي على لينكد إن' : 'LinkedIn Profile Optimization'}
            </h1>
          </div>

          {/* Payment Form Modal */}
          {showPaymentForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 mt-10 flex items-center justify-center z-50">
              <div className={`relative w-full max-w-md p-6 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
<PaymentForm 
  onSuccess={handlePaymentSuccess}
  completePaymentButtonText="Pay Now 199 SAR"
  amount={199}
/>              </div>
            </div>
          )}

          {/* LinkedIn Content */}
          <div className="space-y-8">
            {/* Headline Section */}
            <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {language === 'ar' ? 'العنوان المهني' : 'Professional Headline'}
                </h2>
                {hasPaid && (
                  <button
                    onClick={() => handleCopy(linkedInData.tagLine)}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                      isDarkMode 
                        ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
                        : 'hover:bg-gray-100 text-gray-600 hover:text-black'
                    }`}
                    title={language === 'ar' ? 'نسخ النص' : 'Copy text'}
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">{language === 'ar' ? 'نسخ' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <p 
                className={`relative p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                onCopy={preventCopy}
                onCut={preventCopy}
                onContextMenu={preventCopy}
                style={{ 
                  userSelect: hasPaid ? 'text' : 'none',
                  WebkitUserSelect: hasPaid ? 'text' : 'none',
                  MozUserSelect: hasPaid ? 'text' : 'none',
                  msUserSelect: hasPaid ? 'text' : 'none'
                }}
              >
                {!hasPaid && (
                  <span className="absolute inset-0 bg-black bg-opacity-70 rounded-lg z-10 flex flex-col items-center justify-center text-white text-lg gap-2">
                    <MdOutlineRemoveRedEye className="w-6 h-6" />
                    {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay to unlock content'}
                  </span>
                )}
                <span className="relative">{linkedInData.tagLine}</span>
              </p>
            </div>
            {/* Summary Section */}
            <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {language === 'ar' ? 'الملخص المهني' : 'Professional Summary'}
                </h2>
                {hasPaid && (
                  <button
                    onClick={() => handleCopy(linkedInData.profileSummary)}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                      isDarkMode 
                        ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
                        : 'hover:bg-gray-100 text-gray-600 hover:text-black'
                    }`}
                    title={language === 'ar' ? 'نسخ النص' : 'Copy text'}
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">{language === 'ar' ? 'نسخ' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <p 
                className={`relative p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} whitespace-pre-wrap`}
                onCopy={preventCopy}
                onCut={preventCopy}
                onContextMenu={preventCopy}
                style={{ 
                  userSelect: hasPaid ? 'text' : 'none',
                  WebkitUserSelect: hasPaid ? 'text' : 'none',
                  MozUserSelect: hasPaid ? 'text' : 'none',
                  msUserSelect: hasPaid ? 'text' : 'none'
                }}
              >
                {!hasPaid && (
                  <span className="absolute inset-0 bg-black bg-opacity-70 rounded-lg flex flex-col z-10 items-center justify-center text-white text-lg gap-2">
                    <MdOutlineRemoveRedEye className="w-6 h-6" />
                    {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay to unlock content'}
                  </span>
                )}
                <span className="relative">{linkedInData.profileSummary}</span>
              </p>
            </div>
            {/* Instructions */}
            <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <h2 className="text-xl font-semibold mb-4">
                {language === 'ar' ? 'تعليمات التحديث' : 'Update Instructions'}
              </h2>
              <ol className="list-decimal list-inside space-y-3 ml-4">
                <li>{language === 'ar' ? 'قم بزيارة ملفك الشخصي على LinkedIn' : 'Visit your LinkedIn profile'}</li>
                <li>{language === 'ar' ? 'انقر على زر "تعديل" بجوار كل قسم' : 'Click the "Edit" button next to each section'}</li>
                <li>{language === 'ar' ? 'أدخل المحتوى المحسن في الأقسام المناسبة' : 'Enter the optimized content in the appropriate sections'}</li>
                <li>{language === 'ar' ? 'احفظ التغييرات' : 'Save your changes'}</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
      <Footer isDarkMode={isDarkMode} language={language} />
    </div>
  );
};