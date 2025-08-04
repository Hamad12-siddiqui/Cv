import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Header } from './Header';
import { Footer } from './Footer';
import ScrollToTop from './ScrollToTop';
import PaymentForm from './PaymentForm';
import { toast } from 'react-toastify';
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { ArrowLeft, Copy, CheckCheck, X } from 'lucide-react';

interface ResumePreviewImages {
  'temp_classic_cv.pdf': string[];
  'temp_modern_cv.pdf': string[];
  [key: string]: string[];
}

interface BundleState {
  coverLetter: {
    session_id: string;
    cover_letter_filename: string;
    email: string;
    phone: string;
    previewImages: {
      images: string[];
    };
  };
  linkedin: {
    tagLine: string;
    profileSummary: string;
    email: string;
    phone: string;
  };
  resume: {
    sessionId: string;
    classicResumeUrl: string;
    modernResumeUrl: string;
    email: string;
    phone: string;
    previewImages: ResumePreviewImages;
    
  };
}

export const BundlePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
const { isDarkMode, toggleDarkMode } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const state = location.state as BundleState;
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<'resume' | 'linkedin' | 'cover-letter'>('resume');
  const [isPaid, setIsPaid] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Ensure we have all the required data
  React.useEffect(() => {
    if (!state || !state.coverLetter || !state.linkedin || !state.resume) {
      toast.error(
        language === 'ar' 
          ? 'لم يتم العثور على معلومات الحزمة' 
          : 'Bundle information not found'
      );
      navigate('/');
    }
  }, [state, navigate, language]);

  const handlePaymentSuccess = async () => {
    setShowPaymentForm(false);
    toast.success(
      language === 'ar'
        ? 'تم الدفع بنجاح! جاري تحميل الملفات...'
        : 'Payment successful! Downloading files...'
    );
    
    if (state) {
      try {
        // Get resume_id from earlier failed API (before payment)
        let resumeId = state.resume.sessionId;
        // If resume_id is available in state, use it, otherwise fetch it
        if (!state.resume.resume_id) {
          // Fetch resume_id using the failed API (but only for lookup, not as part of payment)
          const failedResumeResponse = await axios.post(
            'https://admin.cvaluepro.com/dashboard/resumes/failed',
            { 
              email: state.resume.email,
              contact: state.resume.phone
            },
            { headers: { 'Content-Type': 'application/json' } }
          );
          resumeId = failedResumeResponse.data?.resume_id || state.resume.sessionId;
        } else {
          resumeId = state.resume.resume_id;
        }

        // Report successful payment
        await axios.post(
          'https://admin.cvaluepro.com/dashboard/resumes/successful',
          { resume_id: resumeId },
          { headers: { 'Content-Type': 'application/json' } }
        );

        // Calculate and report sales with tax
        const amount = 399; // Bundle price
        const tax = +(amount * 0.029).toFixed(2); // Calculate 2.9% tax and round to 2 decimal places

        // Call sales API
        await axios.post(
          'https://admin.cvaluepro.com/dashboard/sales/',
          { 
            amount,
            tax
          },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const API_BASE_URL = 'https://ai.cvaluepro.com';

        // Validate and fetch resume images first
        const resumeImagesResponse = await axios.post(
          `${API_BASE_URL}/resume/images`,
          {
            session_id: state.resume.sessionId,
            filenames: [state.resume.classicResumeUrl, state.resume.modernResumeUrl]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            }
          }
        );

        // Validate and fetch cover letter images
        const coverLetterImagesResponse = await axios.post(
          `${API_BASE_URL}/cover/images`,
          {
            session_id: state.coverLetter.session_id,
            filename: state.coverLetter.cover_letter_filename
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            }
          }
        );

        // Validate resume images response
        if (!resumeImagesResponse.data || 
            (!resumeImagesResponse.data['temp_classic_cv.pdf'] && 
             !resumeImagesResponse.data['temp_modern_cv.pdf'])) {
          throw new Error('Resume preview images not available');
        }

        // Validate cover letter images response
        if (!coverLetterImagesResponse.data.images) {
          throw new Error('Cover letter preview images not available');
        }

        // Download classic resume
        const classicResumeResponse = await axios.get(
          `${API_BASE_URL}/resume/download?session_id=${state.resume.sessionId}&filename=${state.resume.classicResumeUrl}`,
          {
            responseType: 'blob',
            headers: {
              'Accept': 'application/pdf',
              'ngrok-skip-browser-warning': 'true'
            }
          }
        );
        const classicResumeBlob = new Blob([classicResumeResponse.data], { type: 'application/pdf' });
        const classicResumeUrl = URL.createObjectURL(classicResumeBlob);

        // Download modern resume
        const modernResumeResponse = await axios.get(
          `${API_BASE_URL}/resume/download?session_id=${state.resume.sessionId}&filename=${state.resume.modernResumeUrl}`,
          {
            responseType: 'blob',
            headers: {
              'Accept': 'application/pdf',
              'ngrok-skip-browser-warning': 'true'
            }
          }
        );
        const modernResumeBlob = new Blob([modernResumeResponse.data], { type: 'application/pdf' });
        const modernResumeUrl = URL.createObjectURL(modernResumeBlob);

        // Download cover letter
        const coverLetterResponse = await axios.get(
          `${API_BASE_URL}/cover/download?session_id=${state.coverLetter.session_id}&filename=${state.coverLetter.cover_letter_filename}`,
          {
            responseType: 'blob',
            headers: {
              'Accept': 'application/pdf',
              'ngrok-skip-browser-warning': 'true'
            }
          }
        );
        const coverLetterBlob = new Blob([coverLetterResponse.data], { type: 'application/pdf' });
        const coverLetterUrl = URL.createObjectURL(coverLetterBlob);

        // Create download links and trigger downloads
        const downloadFile = (url: string, filename: string) => {
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        // Download files with delays between each to prevent browser blocking
        downloadFile(classicResumeUrl, 'classic-resume.pdf');
        setTimeout(() => {
          downloadFile(modernResumeUrl, 'modern-resume.pdf');
          setTimeout(() => {
            downloadFile(coverLetterUrl, 'cover-letter.pdf');
            // Copy LinkedIn content to clipboard
            toast.success(
              language === 'ar'
                ? 'تم تحميل جميع الملفات بنجاح'
                : 'All files downloaded successfully'
            );
            
            // Cleanup URLs
            URL.revokeObjectURL(classicResumeUrl);
            URL.revokeObjectURL(modernResumeUrl);
            URL.revokeObjectURL(coverLetterUrl);
            
            // Set payment status
            setIsPaid(true);
          }, 1000);
        }, 1000);

      } catch (error) {
        console.error('Download error:', error);
        toast.error(
          language === 'ar'
            ? 'حدث خطأ أثناء تحميل الملفات'
            : 'Error downloading files'
        );
      }
    }
  };

  const handleDownload = () => {
    setShowPaymentForm(true);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <ScrollToTop />
      <Header
        isDarkMode={isDarkMode}
        language={language}
        toggleDarkMode={toggleDarkMode}
        toggleLanguage={toggleLanguage}
      />

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className={`flex items-center space-x-2 mb-6 px-4 py-2 rounded-lg ${
            isDarkMode
              ? 'bg-gray-800 hover:bg-gray-700 text-white'
              : 'bg-white hover:bg-gray-100 text-gray-900'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{language === 'ar' ? 'رجوع' : 'Back'}</span>
        </button>

        {/* Preview Navigation */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setCurrentPreview('resume')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPreview === 'resume'
                ? 'bg-black text-white'
                : isDarkMode
                ? 'bg-gray-800 text-gray-300'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {language === 'ar' ? 'السيرة الذاتية' : 'Resume'}
          </button>
          <button
            onClick={() => setCurrentPreview('linkedin')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPreview === 'linkedin'
                ? 'bg-black text-white'
                : isDarkMode
                ? 'bg-gray-800 text-gray-300'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {language === 'ar' ? 'لينكد إن' : 'LinkedIn'}
          </button>
          <button
            onClick={() => setCurrentPreview('cover-letter')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPreview === 'cover-letter'
                ? 'bg-black text-white'
                : isDarkMode
                ? 'bg-gray-800 text-gray-300'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {language === 'ar' ? 'خطاب التغطية' : 'Cover Letter'}
          </button>
        </div>

        {/* Preview Content */}
        <div className="max-w-4xl mx-auto">
          {currentPreview === 'resume' && state?.resume && (
            <div className="space-y-6">
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className="text-3xl font-semibold mb-4">
                  {language === 'ar' ? 'معاينة السيرة الذاتية' : 'Resume Preview'}
                </h3>
                <div className="grid grid-cols-1 gap-8">
                  {/* Classic Resume Preview */}
                  <div>
                    <h4 className="text-2xl text-center font-medium mb-4">
                      {language === 'ar' ? 'النموذج الكلاسيكي' : 'Classic Template'}
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {(state.resume.previewImages['temp_classic_cv.pdf'] || []).map((image: string, index: number) => (
                        <div key={`classic-${index}`} className="relative rounded-lg overflow-hidden shadow-lg">
                          <div className={`${!isPaid ? 'select-none' : ''}`}>
                            <img 
                              src={image} 
                              alt={`Classic resume page ${index + 1}`}
                              className="w-full h-auto"
                              style={{ 
                                maxHeight: '800px', 
                                objectFit: 'contain',
                                filter: !isPaid ? 'blur(0.8px)' : 'none'
                              }}
                              onContextMenu={(e) => !isPaid && e.preventDefault()}
                            />
                          </div>
                          <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white px-2 py-1 text-sm">
                            {language === 'ar' ? `صفحة ${index + 1}` : `Page ${index + 1}`}
                          </div>
                          {!isPaid && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50">
                                <MdOutlineRemoveRedEye size={36} className='text-white' />
                              <p className="text-white text-lg font-semibold">
                                {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay To Unlocked Content'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modern Resume Preview */}
                  <div>
                    <h4 className="text-2xl text-center font-medium mb-4">
                      {language === 'ar' ? 'النموذج الحديث' : 'Modern Template'}
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {(state.resume.previewImages['temp_modern_cv.pdf'] || []).map((image: string, index: number) => (
                        <div key={`modern-${index}`} className="relative rounded-lg overflow-hidden shadow-lg">
                          <div className={`${!isPaid ? 'select-none' : ''}`}>
                            <img 
                              src={image} 
                              alt={`Modern resume page ${index + 1}`}
                              className="w-full h-auto"
                              style={{ 
                                maxHeight: '800px', 
                                objectFit: 'contain',
                                filter: !isPaid ? 'blur(0.8px)' : 'none'
                              }}
                              onContextMenu={(e) => !isPaid && e.preventDefault()}
                            />
                          </div>
                          <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white px-2 py-1 text-sm">
                            {language === 'ar' ? `صفحة ${index + 1}` : `Page ${index + 1}`}
                          </div>
                          {!isPaid && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50">
                                <MdOutlineRemoveRedEye size={36} className='text-white' />
                              <p className="text-white text-lg font-semibold">
                                {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay To Unlocked Content'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPreview === 'linkedin' && state?.linkedin && (
            <div className="space-y-6">
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} relative`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">
                    {language === 'ar' ? 'العنوان المهني' : 'Professional Headline'}
                  </h3>
                  {isPaid && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(state.linkedin.tagLine);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                        toast.success(
                          language === 'ar'
                            ? 'تم نسخ المحتوى'
                            : 'Content copied to clipboard'
                        );
                      }}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-600 hover:text-black'
                      }`}
                      title={language === 'ar' ? 'نسخ المحتوى' : 'Copy content'}
                    >
                      {isCopied ? (
                        <CheckCheck className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
                <div 
                  className={`relative ${!isPaid ? 'select-none' : ''}`}
                  style={{ 
                    filter: !isPaid ? 'blur(0.7px)' : 'none',
                    userSelect: !isPaid ? 'none' : 'text'
                  }}
                >
                  <p>{state.linkedin.tagLine}</p>
                </div>
                {!isPaid && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <MdOutlineRemoveRedEye size={36} className='text-white' />
                    <p className="text-white text-lg font-semibold">
                      {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay To Unlocked Content'}
                    </p>
                  </div>
                )}
              </div>
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} relative`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">
                    {language === 'ar' ? 'الملخص المهني' : 'Professional Summary'}
                  </h3>
                  {isPaid && (
                    <button
                      onClick={() => {
                        const linkedInContent = `${state.linkedin.tagLine}\n\n${state.linkedin.profileSummary}`;
                        navigator.clipboard.writeText(linkedInContent);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                        toast.success(
                          language === 'ar'
                            ? 'تم نسخ المحتوى'
                            : 'Content copied to clipboard'
                        );
                      }}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-600 hover:text-black'
                      }`}
                      title={language === 'ar' ? 'نسخ المحتوى' : 'Copy content'}
                    >
                      {isCopied ? (
                        <CheckCheck className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
                <div 
                  className={`relative ${!isPaid ? 'select-none' : ''}`}
                  style={{ 
                    filter: !isPaid ? 'blur(0.8px)' : 'none',
                    userSelect: !isPaid ? 'none' : 'text'
                  }}
                >
                  <p className="whitespace-pre-wrap">{state.linkedin.profileSummary}</p>
                </div>
                {!isPaid && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <MdOutlineRemoveRedEye size={36} className='text-white' />
                    <p className="text-white text-lg font-semibold">
                      {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay To Unlocked Content'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentPreview === 'cover-letter' && state?.coverLetter && (
            <div className="space-y-6">
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className="text-xl font-semibold mb-4">
                  {language === 'ar' ? 'معاينة خطاب التغطية' : 'Cover Letter Preview'}
                </h3>
                <div className="grid grid-cols-1 gap-4 boder-4">
                  {state.coverLetter.previewImages.images.map((image: string, index: number) => (
                    <div key={`cover-${index}`} className="relative rounded-lg overflow-hidden shadow-lg">
                      <div className={`${!isPaid ? 'select-none' : ''}`}>
                        <img 
                          src={image} 
                          alt={`Cover letter page ${index + 1}`}
                          className="w-full h-auto"
                          style={{ 
                            maxHeight: '800px', 
                            objectFit: 'contain',
                            filter: !isPaid ? 'blur(0.8px)' : 'none'
                          }}
                          onContextMenu={(e) => !isPaid && e.preventDefault()}
                        />
                      </div>
                      <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white px-2 py-1 text-sm">
                        {language === 'ar' ? `صفحة ${index + 1}` : `Page ${index + 1}`}
                      </div>
                      {!isPaid && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50">
                            <MdOutlineRemoveRedEye  size={36} className='text-white' />
                          <p className="text-white text-lg font-semibold">
                            {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay To Unlocked Content'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Download Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-black text-white rounded-lg  transition-colors"
          >
            {language === 'ar' ? 'تحميل الحزمة الكاملة' : 'Download Complete Bundle'}
          </button>
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
                <PaymentForm onSuccess={handlePaymentSuccess} completePaymentButtonText="Pay Now 399 SAR" amount={399} />
              </div>
            </div>
          )}

      </main>

      <Footer isDarkMode={isDarkMode} language={language} />
    </div>
  );
};