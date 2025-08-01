import React, { useEffect, useState, useRef } from "react"
import axios from "axios"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { Header } from "./Header"
import { Footer } from "./Footer"
import PaymentForm from "./PaymentForm"
import { useTheme } from "../hooks/useTheme"
import { useLanguage } from "../hooks/useLanguage"
import { Loader2, Download, Eye, ArrowLeft, FileText, Sparkles, X, AlertCircle } from "lucide-react"
// Mobile detection utility (copied from CoverLetterPreview.tsx)
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth < 1024; // match lg:hidden
};
interface LocationState {
  sessionId: string
  classicResumeUrl: string
  modernResumeUrl: string
}
export const PreviewPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState
  const { isDarkMode, toggleDarkMode } = useTheme()
  const { language, toggleLanguage } = useLanguage()
  const [classicPdfUrl, setClassicPdfUrl] = useState<string>("")
  // Mobile screenshot/recording overlay state
  const [showMobileOverlay, setShowMobileOverlay] = useState(false)
  const [modernPdfUrl, setModernPdfUrl] = useState<string>("")
  const [activePreview, setActivePreview] = useState<"classic" | "modern">("classic")
  
  // Mobile image preview state
  const [isMobile, setIsMobile] = useState(false)
  const [previewImages, setPreviewImages] = useState<string[] | null>(null)
  const [previewImageLoading, setPreviewImageLoading] = useState(false)
  const [previewImageError, setPreviewImageError] = useState<string>("")
  // Full screen image modal state
  const [fullScreenImg, setFullScreenImg] = useState<string | null>(null)
  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
    // Only on mobile: show overlay when page loses focus
    if (isMobileDevice()) {
      const handleBlur = () => setShowMobileOverlay(true);
      const handleFocus = () => setShowMobileOverlay(false);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) setShowMobileOverlay(true);
        else setShowMobileOverlay(false);
      });
      return () => {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', () => {});
      };
    }
  }, []);
  // Screenshot and Screen Recording Protection
  useEffect(() => {
    // Add CSS to prevent screenshots and recordings
    const style = document.createElement('style')
    style.textContent = `
      body {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        pointer-events: auto !important;
      }
      
      img, video, iframe {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        pointer-events: none;
      }
      
      @media print {
        body { display: none !important; }
      }
    `
    document.head.appendChild(style)
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }
    // Disable key combinations for screenshots and dev tools
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C, Ctrl+A, Ctrl+S, Ctrl+P
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.ctrlKey && (e.key === 'a' || e.key === 'A')) ||
        (e.ctrlKey && (e.key === 's' || e.key === 'S')) ||
        (e.ctrlKey && (e.key === 'p' || e.key === 'P')) ||
        // Print Screen keys
        e.key === 'PrintScreen' ||
        // Windows + Shift + S (Snipping Tool)
        (e.metaKey && e.shiftKey && e.key === 'S') ||
        // Alt + PrintScreen
        (e.altKey && e.key === 'PrintScreen')
      ) {
        e.preventDefault()
        toast.error(String(language) === 'ar' ? 'هذا الإجراء غير مسموح' : 'This action is not allowed')
        return false
      }
    }
    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
    }
    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault()
      return false
    }
    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('selectstart', handleSelectStart)
    // Disable print
    window.addEventListener('beforeprint', (e) => {
      e.preventDefault()
      toast.error(String(language) === 'ar' ? 'الطباعة غير مسموحة' : 'Printing is not allowed')
      return false
    })
    // Blur page when window loses focus (prevents screen recording)
    let blurTimeout: number
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.style.filter = 'blur(10px)'
        document.body.style.userSelect = 'none'
      } else {
        // Add small delay to prevent flashing
        blurTimeout = setTimeout(() => {
          document.body.style.filter = 'none'
        }, 100)
      }
    }
    const handleBlur = () => {
      document.body.style.filter = 'blur(10px)'
    }
    const handleFocus = () => {
      clearTimeout(blurTimeout)
      blurTimeout = setTimeout(() => {
        document.body.style.filter = 'none'
      }, 100)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    // Cleanup function
    return () => {
      document.head.removeChild(style)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      clearTimeout(blurTimeout)
      document.body.style.filter = 'none'
    }
  }, [language])
  // Redirect to home if no state is available
  useEffect(() => {
    if (!state || !state.sessionId) {
      toast.error(String(language) === "ar" ? "لم يتم العثور على معلومات السيرة الذاتية" : "Resume information not found")
      navigate("/")
    }
  }, [state, navigate, language])
  useEffect(() => {
    const downloadResumes = async () => {
      try {
        const API_BASE_URL = "https://ai.cvaluepro.com/resume"
        // Download Classic Resume
        const classicResponse = await axios.get(
          `${API_BASE_URL}/download?session_id=${state.sessionId}&filename=${state.classicResumeUrl}`,
          {
            responseType: "blob",
            headers: {
              "ngrok-skip-browser-warning": "true",
              Accept: "application/pdf",
            },
          },
        )
        const classicBlob = new Blob([classicResponse.data], { type: "application/pdf" })
        const classicUrl = URL.createObjectURL(classicBlob)
        // Add parameters to hide PDF controls but allow scrolling
        setClassicPdfUrl(`${classicUrl}#toolbar=0&navpanes=0&view=FitH`)
        // Download Modern Resume
        const modernResponse = await axios.get(
          `${API_BASE_URL}/download?session_id=${state.sessionId}&filename=${state.modernResumeUrl}`,
          {
            responseType: "blob",
            headers: {
              "ngrok-skip-browser-warning": "true",
              Accept: "application/pdf",
            },
          },
        )
        const modernBlob = new Blob([modernResponse.data], { type: "application/pdf" })
        const modernUrl = URL.createObjectURL(modernBlob)
        // Add parameters to hide PDF controls but allow scrolling
        setModernPdfUrl(`${modernUrl}#toolbar=0&navpanes=0&view=FitH`)
        // setIsLoading(false) removed (no longer used)
      } catch (error) {
        console.error("Error downloading resumes:", error)
        toast.error(String(language) === "ar" ? "حدث خطأ في تحميل السير الذاتية" : "Error loading resumes")
        // setIsLoading(false) removed (no longer used)
      }
    }
    if (state?.sessionId) {
      downloadResumes()
    }
    // Cleanup function to revoke object URLs
    return () => {
      if (classicPdfUrl) URL.revokeObjectURL(classicPdfUrl.split("#")[0])
      if (modernPdfUrl) URL.revokeObjectURL(modernPdfUrl.split("#")[0])
    }
  }, [state])
  const downloadPdf = (url: string, filename: string) => {
    const link = document.createElement("a")
    // Remove the hash parameters for download
    link.href = url.split("#")[0]
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  // Fetch preview images for both desktop and mobile automatically when activePreview changes
  // Move fetchImages to a ref so it can be called from retry button
  const fetchImagesRef = React.useRef<() => void>(() => {});
  useEffect(() => {
    setPreviewImageError("");
    setPreviewImageLoading(true);
    setPreviewImages(null);
    const fetchImages = async () => {
      try {
        const filename = activePreview === 'classic' ? state.classicResumeUrl : state.modernResumeUrl;
        const API_BASE_URL = "https://ai.cvaluepro.com/resume/images";
        const response = await axios.post(
          API_BASE_URL,
          {
            session_id: String(state.sessionId),
            filenames: [filename],
          },
          {
            headers: {
              'ngrok-skip-browser-warning': 'true',
              'Content-Type': 'application/json',
            },
            timeout: 30000,
            validateStatus: () => true // Always resolve, handle errors manually
          }
        );
        // Debug: log the response
        console.log('DEBUG /images API response:', response.data);
        if (response.status === 404 || (response.data && response.data.detail && response.data.detail.includes('not found'))) {
          setPreviewImages([]);
          setPreviewImageError(String(language) === 'ar' ? 'ملف السيرة الذاتية غير موجود للمعاينة' : 'Resume file not found for preview');
          return;
        }
        let images: string[] | undefined;
        if (Array.isArray(response.data)) {
          images = response.data;
        } else if (response.data && Array.isArray(response.data.images)) {
          images = response.data.images;
        } else if (Array.isArray(response.data["images"])) {
          images = response.data["images"];
        } else if (typeof response.data === 'object') {
          // Try to extract any array of strings from the object
          const arr = Object.values(response.data).find(v => Array.isArray(v) && v.every(i => typeof i === 'string'));
          if (arr) images = arr as string[];
        }
        if (images && images.length > 0) {
          setPreviewImages(images);
        } else {
          setPreviewImages([]);
          setPreviewImageError(
            (String(language) === 'ar' ? 'لم يتم العثور على صور المعاينة' : 'No preview images found')
          );
        }
      } catch (error) {
        setPreviewImages([]);
        setPreviewImageError(
          (String(language) === 'ar' ? 'حدث خطأ أثناء تحميل الصور' : 'Error loading images')
        );
      } finally {
        setPreviewImageLoading(false);
      }
    };
    fetchImagesRef.current = fetchImages;
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreview, language, state.classicResumeUrl, state.modernResumeUrl, state.sessionId]);

  // State for payment form visibility
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedResumeType, setSelectedResumeType] = useState<'classic' | 'modern'>('classic');

  // Handle download button click
  const handleDownload = (resumeType: 'classic' | 'modern') => {
    setSelectedResumeType(resumeType);
    setShowPaymentForm(true);
  };

  // Handle successful payment
  const handlePaymentSuccess = () => {
    // Close payment form
    setShowPaymentForm(false);

    // Download the PDF
    const url = selectedResumeType === 'classic' ? classicPdfUrl : modernPdfUrl;
    const filename = `${selectedResumeType}-resume.pdf`;
    downloadPdf(url, filename);
    
    // Show success message
    toast.success(String(language) === 'ar' ? 'تم تحميل السيرة الذاتية بنجاح' : 'Resume downloaded successfully');
    
    // Redirect to home page
    navigate('/', { replace: true });
  };
  
  const handleBackClick = () => {
    navigate("/", { replace: true })
  }
  // Determine font family class based on language
  const fontFamilyClass = String(language) === "ar" ? "font-riwaya" : "font-hagrid"
  return (
    <div
      className={`min-h-screen transition-all duration-300 select-none ${
        isDarkMode
          ? "bg-gradient-to-br from-black via-gray-900 to-black text-white"
          : "bg-gradient-to-br from-white via-gray-50 to-white text-black"
      } ${fontFamilyClass}`}
      style={{
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <Header
        isDarkMode={isDarkMode}
        language={language}
        toggleDarkMode={toggleDarkMode}
        toggleLanguage={toggleLanguage}
      />
      {/* Mobile Screenshot/Recording Overlay */}
      {isMobile && showMobileOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-lg">
          <div className="text-center text-white p-8 rounded-2xl bg-black bg-opacity-70 border-2 border-red-600 shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <h2 className="text-2xl font-bold mb-2">{String(language) === 'ar' ? 'تم تعطيل المعاينة مؤقتًا' : 'Preview Disabled'}</h2>
            <p className="text-lg mb-2">{String(language) === 'ar' ? 'لا يمكن التقاط لقطة شاشة أو تسجيل الشاشة لهذا المحتوى.' : 'Screenshot and screen recording are not allowed for this content.'}</p>
            <p className="text-sm opacity-80">{String(language) === 'ar' ? 'يرجى العودة إلى التطبيق لمتابعة المعاينة.' : 'Please return to the app to continue previewing.'}</p>
          </div>
        </div>
      )}
      <main className="container mx-auto px-4 py-12">
        {/* Back Button */}
        <div className="mt-10">
          <button
            onClick={handleBackClick}
            className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              isDarkMode
                ? "bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600"
                : "bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow"
            }`}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">{String(language) === "ar" ? "العودة" : "Back"}</span>
          </button>
        </div>
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Eye className="w-8 h-8" />
            <h1 className="text-4xl font-bold">{String(language) === "ar" ? "معاينة السيرة الذاتية" : "Resume Preview"}</h1>
          </div>
          <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            {String(language) === "ar"
              ? "اختر النموذج المفضل لديك وقم بتحميله"
              : "Choose your preferred template and download it"}
          </p>
        </div>
        {/* Desktop & Mobile View - Show Images Instead of PDF */}
        <div className="hidden lg:grid lg:grid-cols-2  gap-20 w-[80%] mx-auto">
          {/* Classic Resume Images */}
          <div
            className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
              isDarkMode
                ? "bg-gray-900/50 border border-gray-800 hover:border-gray-700"
                : "bg-white border border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl"
            }`}
          >
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">
                    {String(language) === "ar" ? "النموذج الكلاسيكي" : "Classic Template"}
                  </h2>
                </div>
                <button
                  onClick={() => handleDownload('classic')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    isDarkMode ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span className="font-medium">{String(language) === "ar" ? "تحميل" : "Download"}</span>
                </button>
              </div>
              <p className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                {String(language) === "ar"
                  ? "تصميم أنيق ومهني للوظائف التقليدية"
                  : "Clean and professional design for traditional roles"}
              </p>
            </div>
            <div className="px-6 pb-6">
              <div className={`w-full min-h-[300px] rounded-xl overflow-hidden border-2 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                {/* Show loading, error, or images for classic */}
                {previewImageLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {String(language) === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
                    </p>
                  </div>
                ) : previewImageError ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                    <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{previewImageError}</p>
                    <button
                      onClick={() => {
                        setPreviewImageError("");
                        setPreviewImageLoading(true);
                        setTimeout(() => fetchImagesRef.current(), 100);
                      }}
                      className={`mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isDarkMode ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                      {String(language) === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
                    </button>
                  </div>
                ) : previewImages && previewImages.length > 0 ? (
                  <div className="flex flex-col gap-4 items-center justify-center py-4">
                    {previewImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Resume Preview"
                        className="w-full h-auto md:max-h-[80vh] max-h-[60vh] object-contain rounded cursor-zoom-in"
                        onClick={() => setFullScreenImg(img)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {String(language) === 'ar' ? 'اضغط تحميل لعرض المعاينة' : 'Press Download to preview'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Modern Resume Images */}
          <div
            className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
              isDarkMode
                ? "bg-gray-900/50 border border-gray-800 hover:border-gray-700"
                : "bg-white border border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl"
            }`}
          >
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">{String(language) === "ar" ? "النموذج العصري" : "Modern Template"}</h2>
                </div>
                <button
                  onClick={() => handleDownload('modern')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    isDarkMode ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span className="font-medium">{String(language) === "ar" ? "تحميل" : "Download"}</span>
                </button>
              </div>
              <p className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                {String(language) === "ar"
                  ? "تصميم معاصر وإبداعي للوظائف الحديثة"
                  : "Contemporary and creative design for modern roles"}
              </p>
            </div>
            <div className="px-6 pb-6">
              <div className={`w-full min-h-[300px] rounded-xl overflow-hidden border-2 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                {/* Show loading, error, or images for modern */}
                {previewImageLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {String(language) === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
                    </p>
                  </div>
                ) : previewImageError ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                    <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{previewImageError}</p>
                    <button
                      onClick={() => {
                        setPreviewImageError("");
                        setPreviewImageLoading(true);
                        setTimeout(() => fetchImagesRef.current(), 100);
                      }}
                      className={`mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isDarkMode ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                      {String(language) === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
                    </button>
                  </div>
                ) : previewImages && previewImages.length > 0 ? (
                  <div className="flex flex-col gap-4 items-center justify-center py-4">
                    {previewImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Resume Preview"
                        className="w-full h-auto md:max-h-[80vh] max-h-[60vh] object-contain rounded cursor-zoom-in"
                        onClick={() => setFullScreenImg(img)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {String(language) === 'ar' ? 'اضغط تحميل لعرض المعاينة' : 'Press Download to preview'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Mobile/Tablet View - Tabbed Interface */}
        <div className="lg:hidden">
          {/* Tab Buttons */}
          <div className={`flex rounded-xl p-1 mb-6 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
            <button
              onClick={() => setActivePreview("classic")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                activePreview === "classic"
                  ? isDarkMode
                    ? "bg-white text-black shadow-lg"
                    : "bg-black text-white shadow-lg"
                  : isDarkMode
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-black"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{String(language) === "ar" ? "كلاسيكي" : "Classic"}</span>
            </button>
            <button
              onClick={() => setActivePreview("modern")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                activePreview === "modern"
                  ? isDarkMode
                    ? "bg-white text-black shadow-lg"
                    : "bg-black text-white shadow-lg"
                  : isDarkMode
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-black"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{String(language) === "ar" ? "عصري" : "Modern"}</span>
            </button>
          </div>
          {/* Mobile Image Preview Logic */}
          <div className={`rounded-2xl overflow-hidden ${isDarkMode ? "bg-gray-900/50 border border-gray-800" : "bg-white border border-gray-200 shadow-lg"}`}>
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {activePreview === "classic"
                    ? String(language) === "ar"
                      ? "النموذج الكلاسيكي"
                      : "Classic Template"
                    : String(language) === "ar"
                      ? "النموذج العصري"
                      : "Modern Template"}
                </h2>
                <button
                  onClick={() => handleDownload(activePreview)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    isDarkMode ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span className="font-medium">{String(language) === "ar" ? "تحميل" : "Download"}</span>
                </button>
              </div>
              <p className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                {activePreview === "classic"
                  ? String(language) === "ar"
                    ? "تصميم أنيق ومهني للوظائف التقليدية"
                    : "Clean and professional design for traditional roles"
                  : String(language) === "ar"
                    ? "تصميم معاصر وإبداعي للوظائف الحديثة"
                    : "Contemporary and creative design for modern roles"}
              </p>
            </div>
            <div className="px-6 pb-6">
              <div className={`w-full min-h-[300px] rounded-xl overflow-hidden border-2 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                {/* Show loading, error, or images */}
                {previewImageLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {String(language) === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
                    </p>
                  </div>
                ) : previewImageError ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                    <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{previewImageError}</p>
                    <button
                      onClick={() => {
                        setPreviewImageError("");
                        setPreviewImageLoading(true);
                        setTimeout(() => fetchImagesRef.current(), 100);
                      }}
                      className={`mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isDarkMode ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                      {String(language) === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
                    </button>
                  </div>
                ) : previewImages && previewImages.length > 0 ? (
                  <div className="flex flex-col gap-4 items-center justify-center py-4">
                    {previewImages.map((img: string, idx: number) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Resume Preview"
                        className="w-full h-auto max-h-[60vh] object-contain rounded cursor-zoom-in"
                        onClick={() => setFullScreenImg(img)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {String(language) === 'ar' ? 'اضغط تحميل لعرض المعاينة' : 'Press Download to preview'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 m-4" onClick={(e) => e.stopPropagation()}>
            <PaymentForm onSuccess={handlePaymentSuccess} />
            <button 
              onClick={() => setShowPaymentForm(false)}
              className={`absolute top-4 right-4 p-2 rounded-full bg-black bg-opacity-60 hover:bg-opacity-80 text-white`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal for Mobile */}
      {fullScreenImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm"
          onClick={() => setFullScreenImg(null)}
        >
          <img
            src={fullScreenImg}
            alt="Full Screen Resume Preview"
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
      <Footer isDarkMode={isDarkMode} language={language} />
    </div>
  );
}