import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Header } from './Header';
import { Footer } from './Footer';
import PaymentForm from './PaymentForm';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Loader2, Download, Eye, ArrowLeft, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import ScrollToTop from '../components/ScrollToTop';
import { MdOutlineRemoveRedEye } from "react-icons/md";
interface LocationState {
  session_id: string;
  cover_letter_filename: string;
  resume_id?: number; // add resume_id as optional number
}
// Mobile detection utility
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth < 768;
};
// iOS detection utility  
const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};
export function CoverLetterPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  // Store resume_id (integer) for API call after payment
  const resumeIdRef = useRef<number | null>(state?.resume_id ?? null);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [mobileImageUrls, setMobileImageUrls] = useState<string[]>([]);
  const [mobileImageLoading, setMobileImageLoading] = useState(false);
  // Full screen image modal state
  const [fullScreenImg, setFullScreenImg] = useState<string | null>(null);
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  // Fetch image for preview (both desktop and mobile)
  useEffect(() => {
    if (state?.session_id && state?.cover_letter_filename) {
      setMobileImageLoading(true);
      const fetchImage = async () => {
        try {
          const API_BASE_URL = 'https://ai.cvaluepro.com/cover/images';
          const response = await axios.post(
            API_BASE_URL,
            {
              session_id: String(state.session_id),
              filename: state.cover_letter_filename
            },
            {
              headers: {
                'ngrok-skip-browser-warning': 'true',
                'Content-Type': 'application/json'
              },
              timeout: 30000,
            }
          );
          let images: string[] | undefined;
          if (Array.isArray(response.data)) {
            images = response.data;
          } else if (response.data && Array.isArray(response.data.images)) {
            images = response.data.images;
          }
          if (images && images.length > 0) {
            setMobileImageUrls(images);
          } else {
            setMobileImageUrls([]);
          }
        } catch (error) {
          setMobileImageUrls([]);
        } finally {
          setMobileImageLoading(false);
        }
      };
      fetchImage();
    } else {
      setMobileImageUrls([]);
      setMobileImageLoading(false);
    }
  }, [state]);
  useEffect(() => {
    if (!state || !state.session_id || !state.cover_letter_filename) {
      console.error('Missing data:', { 
        session_id: state?.session_id, 
        cover_letter_filename: state?.cover_letter_filename 
      });
      toast.error(language === 'ar' ? 'لم يتم العثور على معلومات خطاب التغطية' : 'Cover letter information not found');
      navigate('/');
    }
  }, [state, navigate, language]);
  useEffect(() => {
    const downloadCoverLetter = async () => {
      if (!state?.session_id) {
        const errorMessage = language === 'ar' 
          ? 'معرف الجلسة مفقود' 
          : 'Session ID is missing';
        setError(errorMessage);
        toast.error(errorMessage);
        navigate('/');
        return;
      }
      // Better filename validation
      if (!state.cover_letter_filename || state.cover_letter_filename === 'undefined' || state.cover_letter_filename === 'null') {
        const errorMessage = language === 'ar' 
          ? 'اسم ملف خطاب التغطية مفقود أو غير صالح' 
          : 'Cover letter filename is missing or invalid';
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }
      try {
        setIsLoading(true);
        setError('');
        
        const API_BASE_URL = 'https://ai.cvaluepro.com/cover/download';
        
        // Encode the filename to handle special characters
        const encodedFilename = encodeURIComponent(state.cover_letter_filename);
        const downloadUrl = `${API_BASE_URL}?session_id=${state.session_id}&filename=${encodedFilename}`;
        
        console.log('Attempting to download from:', downloadUrl);
        const response = await axios.get(downloadUrl, {
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf',
            'ngrok-skip-browser-warning': 'true'
          },
          timeout: 30000,
        });
        // Check if the response is actually a PDF
        if (!response.headers['content-type'].includes('application/pdf')) {
          throw new Error('Server did not return a PDF');
        }
        const blob = new Blob([response.data], { type: 'application/pdf' });
        setPdfBlob(blob);
        const url = URL.createObjectURL(blob);
        
        // For mobile devices, especially iOS, we need to handle PDF viewing differently
        if (isMobile) {
          setPdfUrl(url);
        } else {
          setPdfUrl(`${url}#toolbar=0&navpanes=0&view=FitH`);
        }
      } catch (error: any) {
        console.error('Error downloading cover letter:', error);
        
        // Try to read the error response if it's a blob
        if (error.response?.data instanceof Blob) {
          const errorData = await error.response.data.text();
          console.error('Error response content:', errorData);
        } else {
          console.error('Error response:', error.response?.data);
        }
        
        let errorMessage = language === 'ar' 
          ? 'حدث خطأ في تحميل خطاب التغطية' 
          : 'Error loading cover letter';
        
        if (error.response?.status === 404) {
          errorMessage = language === 'ar' 
            ? 'لم يتم العثور على ملف خطاب التغطية' 
            : 'Cover letter file not found';
        } else if (error.response?.status === 422) {
          errorMessage = language === 'ar' 
            ? 'بيانات غير صالحة لخطاب التغطية' 
            : 'Invalid cover letter data';
        } else if (error.message === 'Server did not return a PDF') {
          errorMessage = language === 'ar' 
            ? 'الملف الذي تم استلامه ليس ملف PDF صالحاً' 
            : 'The received file is not a valid PDF';
        }
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    downloadCoverLetter();
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl.split('#')[0]);
      }
    };
  }, [state, language, isMobile]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const downloadPdf = async () => {
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = async () => {
    // Calculate tax and call sales API before reporting resume success
    const amount = 149;
    const tax = parseFloat((amount * 0.029).toFixed(2));
    try {
      await axios.post(
        'https://admin.cvaluepro.com/dashboard/sales/',
        { amount, tax },
        { headers: { 'Content-Type': 'application/json', 'accept': 'application/json' } }
      );
    } catch (err: any) {
      // If sales API fails, show error and do not proceed
      toast.error(language === 'ar' ? 'فشل معالجة الدفع' : 'Payment processing failed');
      return;
    }
    // Call the "successful" API after payment and sales API
    if (resumeIdRef.current != null) {
      try {
        await axios.post(
          'https://admin.cvaluepro.com/dashboard/resumes/successful',
          { resume_id: resumeIdRef.current },
          { headers: { 'Content-Type': 'application/json', 'accept': 'application/json' } }
        );
      } catch (err: any) {
        // Log error, but don't block download/navigation
        console.error('Failed to report successful resume:', err);
      }
    }
    // Download PDF for both mobile and desktop
    if (!pdfUrl || !pdfBlob) return;
    const link = document.createElement('a');
    link.href = pdfUrl.split('#')[0];
    link.download = 'cover-letter.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(language === 'ar' ? 'تم تحميل الملف بنجاح' : 'File downloaded successfully');
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 2000);
  };
  const handleBackClick = () => {
    navigate('/', { replace: true });
  };
  const handleRetry = () => {
    setError('');
    setIsLoading(true);
    window.location.reload();
  };
  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        isDarkMode
          ? 'bg-gradient-to-br from-black via-gray-900 to-black text-white'
          : 'bg-gradient-to-br from-white via-gray-50 to-white text-black'
      }`}
    >
      <ScrollToTop />
      <Header
        isDarkMode={isDarkMode}
        language={String(language)}
        toggleDarkMode={toggleDarkMode}
        toggleLanguage={toggleLanguage}
      />
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Payment Form Modal */}
        {showPaymentForm && (
          <div className="fixed inset-0 z-50  flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className={`relative w-full max-w-md p-6 rounded-xl ${
              isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
            }`}>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <PaymentForm onSuccess={handlePaymentSuccess} completePaymentButtonText="Pay Now 149 SAR" amount={149} />
            </div>
          </div>
        )}
        
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={handleBackClick}
            className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600'
                : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow'
            }`}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">{String(language) === 'ar' ? 'العودة' : 'Back'}</span>
          </button>
        </div>
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Eye className="w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-2xl md:text-4xl font-bold">
              {String(language) === 'ar' ? 'معاينة خطاب التغطية' : 'Cover Letter Preview'}
            </h1>
          </div>
          <p className={`text-base md:text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {String(language) === 'ar'
              ? 'معاينة وتحميل خطاب التغطية الخاص بك'
              : 'Preview and download your cover letter'}
          </p>
        </div>
        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div
              className={`relative p-6 md:p-8 rounded-2xl ${
                isDarkMode ? 'bg-gray-900/50 border border-gray-800' : 'bg-white/80 border border-gray-200 shadow-xl'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Loader2 className="w-12 h-12 md:w-16 md:h-16 animate-spin text-blue-500" />
                  <div
                    className="absolute inset-0 w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-transparent border-t-blue-300 animate-spin"
                    style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
                  />
                </div>
                <div className="mt-6 text-center">
                  <h3 className="text-lg md:text-xl font-semibold mb-2">
                    {String(language) === 'ar' ? 'جاري التحضير...' : 'Preparing Your Cover Letter...'}
                  </h3>
                  <p className={`text-sm md:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {String(language) === 'ar'
                      ? 'نقوم بإعداد خطاب التغطية الخاص بك'
                      : 'We\'re preparing your cover letter'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div
              className={`relative p-6 md:p-8 rounded-2xl text-center ${
                isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}
            >
              
              
              <AlertCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg md:text-xl font-semibold mb-2 text-red-600">
                {String(language) === 'ar' ? 'حدث خطأ' : 'Error Occurred'}
              </h3>
              <p className={`mb-6 text-sm md:text-base ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                {error}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  {String(language) === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
                <button
                  onClick={handleBackClick}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  {String(language) === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Image Preview (shown on both desktop and mobile) */}
        {pdfUrl && !isLoading && !error && (
          <div className="w-full max-w-xl mx-auto">
            <div
              className={`rounded-2xl overflow-hidden ${
                isDarkMode
                  ? 'bg-gray-900/50 border border-gray-800'
                  : 'bg-white border border-gray-200 shadow-lg'
              }`}
            >
              <div className="p-4 md:p-6 pb-4">
                <div className="flex sm:flex-row flex-col justify-between items-center w-full gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 md:w-6 md:h-6" />
                    <h2 className="text-xl md:text-2xl font-bold">
                      {String(language) === 'ar' ? 'خطاب التغطية' : 'Cover Letter'}
                    </h2>
                  </div>
                  <button
                    onClick={downloadPdf}
                    className="px-6 py-2 rounded-full bg-black text-white font-semibold shadow-lg opacity-90 hover:opacity-100 transition-all"
                    style={{ minWidth: '120px' }}
                  >
                    {String(language) === 'ar' ? 'تحميل الملف' : 'Download File'}
                  </button>
                </div>
              </div>
              <div className="px-4 md:px-6 pb-4 md:pb-6">
                <div className={`relative w-full p-8 rounded-xl border-2 text-center transition-all duration-300 ${
                  isDarkMode
                    ? 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                }`}>
                  {mobileImageLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[200px]">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {String(language) === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
                      </p>
                    </div>
                  ) : mobileImageUrls.length > 0 ? (
                    <div className="flex flex-col gap-4 items-center">
                      {mobileImageUrls.map((imgUrl, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={imgUrl}
                            alt={`Cover Letter Preview ${idx + 1}`}
                            className="w-full h-auto max-h-[90vh] object-fill rounded-lg cursor-pointer"
                            onClick={() => setFullScreenImg(imgUrl)}
                          />
                         
                          <div className="absolute   flex-col inset-0 bg-black bg-opacity-70 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                          <MdOutlineRemoveRedEye  className='text-white' size={40} />
                            <span className="text-white text-lg font-semibold">
                              {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay To Unlock The Content'}
                            </span>
                          </div>
                        
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {/* Full Screen Image Modal */}
                {fullScreenImg && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm"
                    onClick={() => setFullScreenImg(null)}
                  >
                    <img
                      src={fullScreenImg}
                      alt="Full Screen Cover Letter Preview"
                      className="max-w-full max-h-full object-contain rounded shadow-2xl"
                      style={{ boxShadow: '0 0 40px 8px rgba(0,0,0,0.7)' }}
                      onClick={e => e.stopPropagation()}
                    />
                    <button
                      className="absolute top-4 right-4 p-2 rounded-full bg-black bg-opacity-60 hover:bg-opacity-80 text-white"
                      onClick={() => setFullScreenImg(null)}
                      aria-label="Close full screen preview"
                      style={{ zIndex: 60 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer isDarkMode={isDarkMode} language={typeof language === 'string' ? language : 'ar'} />
    </div>
  );
};