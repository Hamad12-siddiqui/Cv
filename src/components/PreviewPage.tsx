import React, { useEffect, useState } from "react"
import axios from "axios"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { Header } from "./Header"
import { Footer } from "./Footer"
import PaymentForm from "./PaymentForm"
import { useTheme } from "../hooks/useTheme"
import { useLanguage } from "../hooks/useLanguage"
import { Loader2, Download, Eye, ArrowLeft, FileText, Sparkles, X, AlertCircle } from "lucide-react"
import { MdOutlineRemoveRedEye } from "react-icons/md"
import { IoDiamondOutline } from "react-icons/io5";

interface LocationState {
    sessionId: string
    classicResumeUrl: string
    modernResumeUrl: string
    dummyModernResumeUrl: string
    email?: string
    phone?: string
    resume_id?: number
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
    const [dummyModernPdfUrl, setDummyModernPdfUrl] = useState<string>("")
    const [activePreview, setActivePreview] = useState<"classic" | "modern" | "dummy-modern">("classic")

    // Mobile image preview state
    const [isMobile, setIsMobile] = useState(false)
    const [previewImages, setPreviewImages] = useState<{ classic: string[]; modern: string[]; dummyModern: string[] } | null>(null)
    const [previewImageLoading, setPreviewImageLoading] = useState(false)
    const [previewImageError, setPreviewImageError] = useState<string>("")
    // Full screen image modal state
    const [fullScreenImg, setFullScreenImg] = useState<string | null>(null)

    useEffect(() => {

        if (!state || !state.sessionId) {
            toast.error(String(language) === "ar" ? "لم يتم العثور على معلومات السيرة الذاتية" : "Resume information not found")
            navigate("/")
        }
    }, [state, navigate, language])
    useEffect(() => {
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
    const fetchImagesRef = React.useRef<() => void>(() => { });
    const getAuthToken = async (): Promise<string> => {
        const formData = new URLSearchParams();
        formData.append('username', 'admin');
        formData.append('password', 'password123');

        try {
            const response = await axios.post('https://resume.cvaluepro.com/resume/token', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            });
            return response.data.access_token;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw new Error('Failed to authenticate with the server');
        }
    };

    useEffect(() => {
        setPreviewImageError("");
        setPreviewImageLoading(true);
        setPreviewImages({ classic: [], modern: [], dummyModern: [] });

        const fetchImages = async () => {
            try {
                const API_BASE_URL = "https://resume.cvaluepro.com/resume/images";
                const authToken = await getAuthToken();

                const filenames = [
                    state.classicResumeUrl,
                    state.modernResumeUrl,
                    state.dummyModernResumeUrl,
                ].filter(Boolean) as string[];

                const response = await axios.post(
                    API_BASE_URL,
                    {
                        session_id: String(state.sessionId),
                        filenames,
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        timeout: 60000,
                        validateStatus: () => true, // Always resolve, handle errors manually
                    }
                );

                if (response.status !== 200 || !response.data) {
                    throw new Error('Failed to load images');
                }

                const data = response.data || {};

                const classicImages = data[state.classicResumeUrl] || [];
                const modernImages = data[state.modernResumeUrl] || [];
                const dummyModernImages = data[state.dummyModernResumeUrl] || [];

                setPreviewImages({
                    classic: classicImages,
                    modern: modernImages,
                    dummyModern: dummyModernImages,
                });
            } catch (error) {
                setPreviewImageError(
                    String(language) === 'ar' ? 'حدث خطأ أثناء تحميل الصور' : 'Error loading images'
                );
            } finally {
                setPreviewImageLoading(false);
            }
        };

        fetchImagesRef.current = fetchImages;
        fetchImages();
    }, [state.classicResumeUrl, state.modernResumeUrl, state.dummyModernResumeUrl, state.sessionId, language]);

    // Update rendering logic to display images directly
    const renderPreviewImages = (type: 'classic' | 'modern') => {
        if (previewImageLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}></p>
                </div>
            );
        } else if (previewImageError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                    <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}></p>
                    <button
                        onClick={() => fetchImagesRef.current()}
                        className={`mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isDarkMode ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        Retry
                    </button>
                </div>
            );
        } else if (previewImages && previewImages[type] && previewImages[type].length > 0) {
            return (
                <div className="flex flex-col gap-4 items-center justify-center py-4">
                    {previewImages[type].map((img: string, idx: number) => (
                        <div key={idx} className="relative w-full">
                            <img
                                src={img}
                                alt="Resume Preview"
                                className="w-full h-auto object-contain rounded cursor-zoom-in"
                                onClick={() => setFullScreenImg(img)}
                            />

                            <div className="absolute inset-0 flex-col bg-black opacity-50 rounded flex items-center justify-center">
                                <MdOutlineRemoveRedEye className="text-white " size={36} />
                                <span className="text-white text-lg font-bold">Locked Content</span>

                            </div>
                        </div>
                    ))}
                </div>
            );
        } else {
            return null; // No fallback text, just return null
        }
    };
    // Helper to map active tab key to state keys
    const getPreviewImagesFor = (type: 'classic' | 'modern' | 'dummy-modern'): string[] => {
        if (!previewImages) return [];
        if (type === 'dummy-modern') return previewImages.dummyModern || [];
        return previewImages[type] || [];
    };
    // State for payment form visibility
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [selectedResumeType, setSelectedResumeType] = useState<'classic' | 'modern' | 'dummy-modern'>('classic');

    // Handle download button click
    const handleDownload = (resumeType: 'classic' | 'modern' | 'dummy-modern') => {
        setSelectedResumeType(resumeType);
        setShowPaymentForm(true);
    };

    // Handle successful payment
    const handlePaymentSuccess = async () => {
        try {
            // Report sale with tax
            const amount = 299; // Use the amount from /create-charge or PaymentForm
            const tax = +(amount * 0.029).toFixed(2);
            await axios.post(
                'https://admin.cvaluepro.com/dashboard/sales/',
                { amount, tax },
                { headers: { 'Content-Type': 'application/json' } }
            );

            // Call /dashboard/resumes/successful if resume_id is present in state
            if (typeof state?.resume_id === 'number' && state.resume_id > 0) {
                await axios.post(
                    'https://admin.cvaluepro.com/dashboard/resumes/successful',
                    { resume_id: state.resume_id },
                    { headers: { 'Content-Type': 'application/json' } }
                );
            }

            // ...existing code...

            // Download the PDF only after payment
            const API_BASE_URL = "https://resume.cvaluepro.com/resume";
            const authToken = await getAuthToken();
            let pdfUrl = "";
            if (selectedResumeType === 'classic') {
                const classicResponse = await axios.get(
                    `${API_BASE_URL}/download?session_id=${state.sessionId}&filename=${state.classicResumeUrl}`,
                    {
                        responseType: "blob",
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/pdf',
                        },
                    },
                );
                const classicBlob = new Blob([classicResponse.data], { type: "application/pdf" });
                pdfUrl = URL.createObjectURL(classicBlob) + "#toolbar=0&navpanes=0&view=FitH";
                setClassicPdfUrl(pdfUrl);
            } else if (selectedResumeType === 'modern') {
                const modernResponse = await axios.get(
                    `${API_BASE_URL}/download?session_id=${state.sessionId}&filename=${state.modernResumeUrl}`,
                    {
                        responseType: "blob",
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/pdf',
                        },
                    },
                );
                const modernBlob = new Blob([modernResponse.data], { type: "application/pdf" });
                pdfUrl = URL.createObjectURL(modernBlob) + "#toolbar=0&navpanes=0&view=FitH";
                setModernPdfUrl(pdfUrl);
            } else if (selectedResumeType === 'dummy-modern') {
                const dummyModernResponse = await axios.get(
                    `${API_BASE_URL}/download?session_id=${state.sessionId}&filename=${state.dummyModernResumeUrl}`,
                    {
                        responseType: "blob",
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/pdf',
                        },
                    },
                );
                const dummyModernBlob = new Blob([dummyModernResponse.data], { type: "application/pdf" });
                pdfUrl = URL.createObjectURL(dummyModernBlob) + "#toolbar=0&navpanes=0&view=FitH";
                setDummyModernPdfUrl(pdfUrl);
            }

            // Download the PDF
            const filename = `${selectedResumeType}-resume.pdf`;
            downloadPdf(pdfUrl, filename);

            // Show success message
            toast.success(String(language) === 'ar' ? 'تم تحميل السيرة الذاتية بنجاح' : 'Resume downloaded successfully');

            // Call delete-session API after payment and before redirect (authorized)
            try {
                await axios.delete(
                    `https://resume.cvaluepro.com/resume/delete-session/?session_id=${state.sessionId}`,
                    {
                        headers: {
                            'accept': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                        },
                    }
                );
            } catch (deleteErr) {
                // Optionally log/report error, but don't block navigation
                console.error('Session delete error:', deleteErr);
            }

            // Redirect to home page
            navigate('/', { replace: true });
        } catch (err) {
            // Optionally log/report error, but continue
            console.error('Resume/sale reporting error:', err);
            toast.error(String(language) === 'ar' ? 'حدث خطأ أثناء تحميل السيرة الذاتية' : 'Error downloading resume');
        }

        // Close payment form
        setShowPaymentForm(false);
    };

    const handleBackClick = () => {
        // Call delete-session API before navigating home
        if (state && state.sessionId) {
            getAuthToken()
                .then((token) =>
                    axios.delete(
                        `https://resume.cvaluepro.com/resume/delete-session/?session_id=${state.sessionId}`,
                        {
                            headers: {
                                'accept': 'application/json',
                                'Authorization': `Bearer ${token}`,
                            },
                        }
                    )
                )
                .catch((err) => {
                    // Optionally log/report error, but don't block navigation
                    console.error('Session delete error:', err);
                })
                .finally(() => {
                    navigate("/", { replace: true });
                });
        } else {
            navigate("/", { replace: true });
        }
    }
    // Determine font family class based on language
    const fontFamilyClass = String(language) === "ar" ? "font-riwaya" : "font-hagrid"
    return (
        <div
            className={`min-h-screen transition-all duration-300 select-none ${isDarkMode
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
                <div className="fixed inset-0 z-[40] flex items-center justify-center  bg-black bg-opacity-80 backdrop-blur-lg">
                    <div className="text-center text-white p-8 rounded-2xl bg-black  bg-opacity-70 border-red-600 shadow-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        <h2 className="text-2xl font-bold mb-2">{String(language) === 'ar' ? 'تم تعطيل المعاينة مؤقتًا' : 'Preview Disabled'}</h2>
                        <p className="text-lg mb-2">{String(language) === 'ar' ? 'لا يمكن التقاط لقطة شاشة أو تسجيل الشاشة لهذا المحتوى.' : 'Screenshot and screen recording are not allowed for this content.'}</p>
                        <p className="text-sm opacity-80">{String(language) === 'ar' ? 'يرجى العودة إلى التطبيق لمتابعة المعاينة.' : 'Please return to the app to continue previewing.'}</p>
                    </div>
                </div>
            )}
            <main className="container mx-auto px-4 py-12">
                {/* Back Button */}
                <div className="mt-10 ">
                    <button
                        onClick={handleBackClick}
                        className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${isDarkMode
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
                <div className="hidden lg:grid lg:grid-cols-3 gap-4   w-full mx-auto">
                    {/* Classic Resume Images */}
                    <div
                        className={`group relative rounded-2xl transition-all duration-300 ${isDarkMode
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
                                    className={`flex items-center gap-2 px-6 py-3 rounded-lg  transition-all duration-200 transform hover:scale-105 active:scale-95 ${isDarkMode ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"
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
                            <div className={`w-full rounded-xl overflow-hidden  ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                                {/* Show loading, error, or images for classic */}
                                {previewImageLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {String(language) === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
                                        </p>
                                    </div>
                                ) : previewImageError ? (
                                    <div className="flex flex-col items-center justify-center py-10">
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
                                ) : previewImages && previewImages.classic && previewImages.classic.length > 0 ? (
                                    <div className="flex flex-col gap-8 items-center justify-center overflow-y-auto max-h-screen">
                                        {previewImages.classic.map((img, idx) => (
                                            <div key={idx} className="relative w-full break-after-page">
                                                <img
                                                    src={img}
                                                    alt={`Resume Preview Page ${idx + 1}`}
                                                    className="w-full h-auto object-contain rounded cursor-zoom-in"
                                                    onClick={() => setFullScreenImg(img)}
                                                />
                                                <div className="absolute inset-0 bg-black opacity-50  z-40 rounded flex flex-col items-center justify-center w-full h-full">
                                                    <MdOutlineRemoveRedEye className="text-white " size={36} />
                                                    <span className="text-white text-lg font-bold">Locked Content</span>
                                                </div>
                                                {/* Page Number Overlay */}
                                                <div className="absolute bottom-4 right-6 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-semibold z-50 pointer-events-none select-none">
                                                    {String(language) === 'ar' ? `صفحة ${idx + 1}` : `Page ${idx + 1}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    {/* Modern Resume Images */}
                    <div
                        className={`group relative rounded-2xl overflow-hidden overflow-y-auto transition-all duration-300 ${isDarkMode
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
                                    className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${isDarkMode ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"
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
                            <div className={`w-full rounded-xl overflow-hidden  ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                                {/* Show loading, error, or images for modern */}
                                {previewImageLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {String(language) === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
                                        </p>
                                    </div>
                                ) : previewImageError ? (
                                    <div className="flex flex-col items-center justify-center py-10">
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
                                ) : previewImages && previewImages.modern && previewImages.modern.length > 0 ? (
                                    <div className="flex flex-col gap-8 items-center justify-center ">
                                        {previewImages.modern.map((img, idx) => (
                                            <div key={idx} className="relative w-full break-after-page">
                                                <img
                                                    src={img}
                                                    alt={`Resume Preview Page ${idx + 1}`}
                                                    className="w-full h-auto object-contain rounded cursor-zoom-in"
                                                    onClick={() => setFullScreenImg(img)}
                                                />
                                                <div className="absolute inset-0 bg-black opacity-50  rounded flex items-center justify-center">
                                                    <MdOutlineRemoveRedEye className="text-white " size={36} />
                                                    <span className="text-white text-lg font-bold">Locked Content</span>
                                                </div>
                                                {/* Page Number Overlay */}
                                                <div className="absolute bottom-4 right-6 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-semibold z-50 pointer-events-none select-none">
                                                    {String(language) === 'ar' ? `صفحة ${idx + 1}` : `Page ${idx + 1}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Dummy Modern Resume Images */}
                    <div
                        className={`group relative rounded-2xl overflow-hidden overflow-y-auto transition-all duration-300 ${isDarkMode
                            ? "bg-gray-900/50 border border-gray-800 hover:border-gray-700"
                            : "bg-white border border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl"
                            }`}
                    >
                        <div className="p-6 pb-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <IoDiamondOutline className="w-6 h-6" />
                                    <h2 className="text-2xl font-bold">
                                        {String(language) === "ar" ? "قالب مميز" : "Premium Template"}
                                    </h2>
                                </div>

                                <button
                                    onClick={() => handleDownload('dummy-modern')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${isDarkMode ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"
                                        }`}
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="font-medium">{String(language) === "ar" ? "تحميل" : "Download"}</span>
                                </button>
                            </div>
                            <p className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                {String(language) === "ar"
                                    ? "نموذج عصري تجريبي للوظائف المبتكرة"
                                    : "Experimental modern design for innovative roles"}
                            </p>
                        </div>
                        <div className="px-6 pb-6">
                            <div className={`w-full rounded-xl overflow-hidden  ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                                {/* Show loading, error, or images for dummy modern */}
                                {previewImageLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {String(language) === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
                                        </p>
                                    </div>
                                ) : previewImageError ? (
                                    <div className="flex flex-col items-center justify-center py-10">
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
                                ) : previewImages && previewImages.dummyModern && previewImages.dummyModern.length > 0 ? (
                                    <div className="flex flex-col gap-8 items-center justify-center ">
                                        {previewImages.dummyModern.map((img, idx) => (
                                            <div key={idx} className="relative w-full break-after-page">
                                                <img
                                                    src={img}
                                                    alt={`Resume Preview Page ${idx + 1}`}
                                                    className="w-full h-auto object-contain rounded cursor-zoom-in"
                                                    onClick={() => setFullScreenImg(img)}
                                                />
                                                <div className="absolute inset-0 bg-black opacity-50  rounded flex items-center justify-center">
                                                    <MdOutlineRemoveRedEye className="text-white " size={36} />
                                                    <span className="text-white text-lg font-bold">Locked Content</span>
                                                </div>
                                                {/* Page Number Overlay */}
                                                <div className="absolute bottom-4 right-6 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-semibold z-50 pointer-events-none select-none">
                                                    {String(language) === 'ar' ? `صفحة ${idx + 1}` : `Page ${idx + 1}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Mobile/Tablet View - Tabbed Interface */}
                <div className="lg:hidden ">
                    {/* Tab Buttons */}
                    <div className={`grid sm:grid-cols-3 grid-cols-1 rounded-xl p-1 mb-6 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
                        <button
                            onClick={() => setActivePreview("classic")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activePreview === "classic"
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
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activePreview === "modern"
                                ? isDarkMode
                                    ? "bg-white text-black shadow-lg"
                                    : "bg-black text-white shadow-lg"
                                : isDarkMode
                                    ? "text-gray-400 hover:text-white"
                                    : "text-gray-600 hover:text-black"
                                }`}
                        >
                            <Sparkles className="w-4 h-4 " />
                            <span>{String(language) === "ar" ? "عصري" : "Modern"}</span>
                        </button>
                        <button
                            onClick={() => setActivePreview("dummy-modern")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${activePreview === "dummy-modern"
                                ? isDarkMode
                                    ? "bg-white text-black shadow-lg"
                                    : "bg-black text-white shadow-lg"
                                : isDarkMode
                                    ? "text-gray-400 hover:text-white"
                                    : "text-gray-600 hover:text-black"
                                }`}
                        >
                            <Sparkles className="w-4 h-4 " />
                            <span>{String(language) === "ar" ? "تجريبي" : "Dummy"}</span>
                        </button>
                    </div>
                    {/* Mobile Image Preview Logic */}
                    <div className={`rounded-2xl  overflow-y-auto ${isDarkMode ? "bg-gray-900/50 border border-gray-800" : "bg-white border border-gray-200 shadow-lg"}`}>
                        <div className="p-6 pb-4">
                            <div className="flex items-center  justify-between mb-4">
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
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${isDarkMode ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"
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
                            <div className={`w-full rounded-xl overflow-hidden  ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                                {/* Show loading, error, or images */}
                                {previewImageLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {String(language) === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
                                        </p>
                                    </div>
                                ) : previewImageError ? (
                                    <div className="flex flex-col items-center justify-center py-10">
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
                                ) : getPreviewImagesFor(activePreview).length > 0 ? (
                                    <div className="flex flex-col gap-4 items-center justify-center py-4">
                                        {getPreviewImagesFor(activePreview).map((img: string, idx: number) => (
                                            <div key={idx} className="relative w-full">
                                                <img
                                                    src={img}
                                                    alt="Resume Preview"
                                                    className="w-full h-auto object-contain rounded cursor-zoom-in"
                                                    onClick={() => setFullScreenImg(img)}
                                                />
                                                <div className="absolute inset-0  bg-black opacity-50 rounded flex flex-col items-center justify-center w-full h-full">
                                                    <MdOutlineRemoveRedEye className="text-white " size={36} />
                                                    <span className="text-white text-lg font-bold">Locked Content</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            {showPaymentForm && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center mt-0 justify-center z-50 ">
                    <div className={`relative w-full max-w-md p-6 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                        <button
                            onClick={() => setShowPaymentForm(false)}
                            className="absolute top-10 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <PaymentForm
                            onSuccess={handlePaymentSuccess}
                            completePaymentButtonText="Pay Now 199 SAR"
                            amount={299}
                        />
                    </div>
                </div>
            )}

            {/* Full Screen Image Modal for Mobile */}
            {fullScreenImg && (
                <div
                    className="fixed inset-0 z-50 flex items-center  justify-center bg-black bg-opacity-90 backdrop-blur-sm"
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