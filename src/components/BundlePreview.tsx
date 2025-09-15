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
import { ArrowLeft, Copy, CheckCheck, X, Upload, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ResumePreviewImages {
    'temp_classic_cv.pdf': string[];
    'temp_modern_cv.pdf': string[];
    [key: string]: string[];
}

interface BundleState {
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
        dummyModernResumeUrl?: string;
        email: string;
        phone: string;
        previewImages: ResumePreviewImages;
    };
}

interface UploadResponse {
    session_id: string;
    classic_resume_url: string;
    modern_resume_url: string;
    dummy_modern_resume_url?: string;
    email: string;
    phone: string;
    processingTimeSeconds?: number;
}

export const BundlePreview: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { language, toggleLanguage } = useLanguage();
    const state = location.state as BundleState;
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [currentPreview, setCurrentPreview] = useState<'resume' | 'linkedin'>('resume');
    const [isPaid, setIsPaid] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Resume generation state
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isGeneratingResume, setIsGeneratingResume] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showResumeUpload, setShowResumeUpload] = useState(false);
    const [bundleState, setBundleState] = useState<BundleState | null>(state);

    // Ensure we have all the required data
    React.useEffect(() => {

        if (!state || !state.linkedin) {
            toast.error(
                language === 'ar'
                    ? 'لم يتم العثور على معلومات الحزمة'
                    : 'Bundle information not found'
            );
            navigate('/');
        }
    }, [state, navigate, language]);

    // File validation
    const validateFile = (file: File): boolean => {
        const validTypes = ['application/pdf'];
        const maxSize = 30 * 1024 * 1024; // 30MB

        if (!validTypes.includes(file.type)) {
            toast.error(language === 'ar'
                ? `نوع ملف غير صالح: ${file.name}. يرجى رفع ملفات PDF فقط.`
                : `Invalid file type: ${file.name}. Please upload PDF files only.`
            );
            return false;
        }

        if (file.size > maxSize) {
            toast.error(language === 'ar'
                ? `الملف كبير جداً: ${file.name}. الحد الأقصى للحجم هو 30 ميجابايت.`
                : `File too large: ${file.name}. Maximum size is 30MB.`
            );
            return false;
        }

        return true;
    };

    // Dropzone configuration
    const onDrop = React.useCallback((acceptedFiles: File[]) => {
        if (uploadedFiles.length >= 1) {
            toast.error(language === 'ar'
                ? 'يمكنك رفع ملف PDF واحد فقط.'
                : 'You can only upload one PDF file.'
            );
            return;
        }
        const validFiles = acceptedFiles.filter(validateFile);
        if (validFiles.length > 0) {
            setUploadedFiles(prev => prev.length === 0 ? validFiles.slice(0, 1) : prev);
            toast.success(language === 'ar'
                ? `تم إضافة ملف واحد بنجاح!`
                : '1 file added successfully!'
            );
        }
    }, [language, uploadedFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            'application/pdf': ['.pdf']
        }
    });

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
        toast.info(language === 'ar' ? 'تم حذف الملف' : 'File removed');
    };

    // Authentication function for resume API
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

    // Resume generation function
    const generateResume = async (): Promise<UploadResponse> => {
        const API_BASE_URL = 'https://resume.cvaluepro.com/resume';

        // Get authentication token
        const authToken = await getAuthToken();

        // Create form data for file upload
        const formDataToSend = new FormData();
        const file = uploadedFiles[0];
        formDataToSend.append('file', file, file.name);

        // Record start time
        const startTime = Date.now();

        const response = await axios.post(`${API_BASE_URL}/upload-resume`, formDataToSend, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
                'ngrok-skip-browser-warning': 'true',
                'Authorization': `Bearer ${authToken}`,
            },
            timeout: 60000,
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            },
        });


        // Calculate processing time in seconds
        const processingTimeSeconds = (Date.now() - startTime) / 1000;
        response.data.processingTimeSeconds = processingTimeSeconds;

        return response.data;
    };

    // Fetch resume preview images
    const fetchResumeImages = async (sessionId: string, filenames: string[]): Promise<ResumePreviewImages> => {
        const API_BASE_URL = 'https://resume.cvaluepro.com/resume/images';
        const authToken = await getAuthToken();

        const response = await axios.post(
            API_BASE_URL,
            {
                session_id: sessionId,
                filenames: filenames.filter(Boolean)
            },
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                timeout: 60000,
            }
        );

        return response.data;
    };

    // Handle resume generation
    const handleGenerateResume = async () => {
        if (uploadedFiles.length === 0) {
            toast.error(language === 'ar'
                ? 'يرجى تحديد ملف واحد على الأقل للرفع.'
                : 'Please select at least one file to upload.'
            );
            return;
        }

        setIsGeneratingResume(true);
        setUploadProgress(0);

        try {
            // Generate resume
            const resumeResponse = await generateResume();

            // Fetch preview images
            const previewImages = await fetchResumeImages(
                resumeResponse.session_id,
                [
                    resumeResponse.classic_resume_url,
                    resumeResponse.modern_resume_url,
                    resumeResponse.dummy_modern_resume_url
                ].filter((url): url is string => Boolean(url))
            );

            // Update bundle state with new resume data
            const updatedBundleState: BundleState = {
                ...bundleState!,
                resume: {
                    sessionId: resumeResponse.session_id,
                    classicResumeUrl: resumeResponse.classic_resume_url,
                    modernResumeUrl: resumeResponse.modern_resume_url,
                    dummyModernResumeUrl: resumeResponse.dummy_modern_resume_url,
                    email: resumeResponse.email,
                    phone: resumeResponse.phone,
                    previewImages: previewImages
                }
            };

            setBundleState(updatedBundleState);
            setShowResumeUpload(false);
            setUploadedFiles([]);

            toast.success(language === 'ar'
                ? 'تم إنشاء السيرة الذاتية بنجاح!'
                : 'Resume generated successfully!'
            );

        } catch (error: any) {
            console.error('Resume generation error:', error);

            let errorMessage = language === 'ar'
                ? 'فشل في إنشاء السيرة الذاتية. يرجى المحاولة مرة أخرى.'
                : 'Failed to generate resume. Please try again.';

            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED') {
                    errorMessage = language === 'ar'
                        ? 'لا يمكن الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت الخاص بك.'
                        : 'Cannot connect to server. Please check your internet connection.';
                } else if (error.code === 'ECONNABORTED') {
                    errorMessage = language === 'ar'
                        ? 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.'
                        : 'Connection timeout. Please try again.';
                } else if (error.response?.status === 422) {
                    errorMessage = language === 'ar'
                        ? 'البيانات المرسلة غير صحيحة. يرجى التحقق من الملف والمعلومات.'
                        : 'Invalid data provided. Please check your file and information.';
                } else if (error.response?.status === 500) {
                    errorMessage = language === 'ar'
                        ? 'خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.'
                        : 'Server error. Please try again later.';
                }
            }

            toast.error(errorMessage);
        } finally {
            setIsGeneratingResume(false);
            setUploadProgress(0);
        }
    };

    const handlePaymentSuccess = async () => {
        setShowPaymentForm(false);
        toast.success(
            language === 'ar'
                ? 'تم الدفع بنجاح! جاري تحميل الملفات...'
                : 'Payment successful! Downloading files...'
        );

        if (bundleState) {
            try {
                // The API expects resume_id as an integer, but we only have a string sessionId.
                // To avoid 422 error, send resume_id: 0 (as per API docs and successful response example)
                await axios.post(
                    'https://admin.cvaluepro.com/dashboard/resumes/successful',
                    { resume_id: 0 },
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
                        session_id: bundleState.resume.sessionId,
                        filenames: [
                            bundleState.resume.classicResumeUrl,
                            bundleState.resume.modernResumeUrl,
                            bundleState.resume.dummyModernResumeUrl
                        ].filter(Boolean)
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'ngrok-skip-browser-warning': 'true'
                        }
                    }
                );

                // Cover letter removed: no cover images fetch

                // Validate resume images response
                if (!resumeImagesResponse.data ||
                    (!resumeImagesResponse.data[bundleState.resume.classicResumeUrl] &&
                        !resumeImagesResponse.data[bundleState.resume.modernResumeUrl] &&
                        !(bundleState.resume.dummyModernResumeUrl && resumeImagesResponse.data[bundleState.resume.dummyModernResumeUrl]))) {
                    throw new Error('Resume preview images not available');
                }

                // Cover letter removed: no cover images validation

                // Download classic resume
                const classicResumeResponse = await axios.get(
                    `${API_BASE_URL}/resume/download?session_id=${bundleState.resume.sessionId}&filename=${bundleState.resume.classicResumeUrl}`,
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
                    `${API_BASE_URL}/resume/download?session_id=${bundleState.resume.sessionId}&filename=${bundleState.resume.modernResumeUrl}`,
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

                // Download dummy modern resume if available
                let dummyModernResumeUrl = '';
                if (bundleState.resume.dummyModernResumeUrl) {
                    const dummyModernResumeResponse = await axios.get(
                        `${API_BASE_URL}/resume/download?session_id=${bundleState.resume.sessionId}&filename=${bundleState.resume.dummyModernResumeUrl}`,
                        {
                            responseType: 'blob',
                            headers: {
                                'Accept': 'application/pdf',
                                'ngrok-skip-browser-warning': 'true'
                            }
                        }
                    );
                    const dummyModernResumeBlob = new Blob([dummyModernResumeResponse.data], { type: 'application/pdf' });
                    dummyModernResumeUrl = URL.createObjectURL(dummyModernResumeBlob);
                }

                // Cover letter removed: no cover download

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
                        // Download dummy modern resume if available
                        if (dummyModernResumeUrl) {
                            downloadFile(dummyModernResumeUrl, 'dummy-modern-resume.pdf');
                        }

                        toast.success(
                            language === 'ar'
                                ? 'تم تحميل جميع الملفات بنجاح'
                                : 'All files downloaded successfully'
                        );

                        // Cleanup URLs
                        URL.revokeObjectURL(classicResumeUrl);
                        URL.revokeObjectURL(modernResumeUrl);
                        if (dummyModernResumeUrl) URL.revokeObjectURL(dummyModernResumeUrl);

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

    const handleBack = async () => {
        try {
            // Get authentication token
            const authToken = await getAuthToken();

            // Delete session for resume if available
            if (bundleState?.resume?.sessionId) {
                await axios.delete(
                    `https://resume.cvaluepro.com/resume/delete-session/?session_id=${bundleState.resume.sessionId}`,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        }
                    }
                );
            }

        } catch (error) {
            console.error('Error deleting session:', error);
            // Don't prevent navigation if session deletion fails
            toast.error(
                language === 'ar'
                    ? 'حدث خطأ أثناء حذف الجلسة، لكن سيتم الانتقال للصفحة الرئيسية'
                    : 'Error deleting session, but proceeding to home page'
            );
        } finally {
            // Navigate back regardless of API call success/failure
            navigate('/');
        }
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
                    className={`flex items-center space-x-2 mb-6 px-4 py-2 rounded-lg ${isDarkMode
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
                        className={`px-4 py-2 rounded-lg transition-colors ${currentPreview === 'resume'
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
                        className={`px-4 py-2 rounded-lg transition-colors ${currentPreview === 'linkedin'
                            ? 'bg-black text-white'
                            : isDarkMode
                                ? 'bg-gray-800 text-gray-300'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                    >
                        {language === 'ar' ? 'لينكد إن' : 'LinkedIn'}
                    </button>

                </div>

                {/* Preview Content */}
                <div className="max-w-4xl mx-auto">
                    {currentPreview === 'resume' && bundleState?.resume && (
                        <div className="space-y-6">
                            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                <h3 className="text-3xl font-semibold mb-4">
                                    {language === 'ar' ? 'معاينة السيرة الذاتية' : 'Resume Preview'}
                                </h3>
                                <div className="grid grid-cols-1 gap-8">
                                    {/* Classic Resume Preview */}
                                    <div>
                                        <h4 className="text-3xl text-center  mb-4 font-bold">
                                            {language === 'ar' ? 'النموذج الكلاسيكي' : 'Classic Template'}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {(bundleState.resume.previewImages[bundleState.resume.classicResumeUrl] || []).map((image: string, index: number) => (
                                                <div key={`classic-${index}`} className="relative rounded-lg overflow-hidden shadow-lg">
                                                    <div className={`${!isPaid ? 'select-none' : ''}`}>
                                                        <img
                                                            src={image}
                                                            alt={`Classic resume page ${index + 1}`}
                                                            className="w-full h-auto"
                                                            style={{
                                                                maxHeight: '800px',
                                                                objectFit: 'contain',
                                                                filter: !isPaid ? 'blur(0.7px)' : 'none'
                                                            }}
                                                            onContextMenu={(e) => !isPaid && e.preventDefault()}
                                                        />
                                                    </div>
                                                    <div className="absolute bottom-0 right-0  bg-black bg-opacity-50  text-white px-2 py-1 text-sm">
                                                        {language === 'ar' ? `صفحة ${index + 1}` : `Page ${index + 1}`}
                                                    </div>
                                                    {!isPaid && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center  bg-black bg-opacity-30">
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
                                        <h4 className="text-3xl text-center font-bold mb-4">
                                            {language === 'ar' ? 'النموذج الحديث' : 'Modern Template'}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {(bundleState.resume.previewImages[bundleState.resume.modernResumeUrl] || []).map((image: string, index: number) => (
                                                <div key={`modern-${index}`} className="relative rounded-lg overflow-hidden shadow-lg">
                                                    <div className={`${!isPaid ? 'select-none' : ''}`}>
                                                        <img
                                                            src={image}
                                                            alt={`Modern resume page ${index + 1}`}
                                                            className="w-full h-auto"
                                                            style={{
                                                                maxHeight: '800px',
                                                                objectFit: 'contain',
                                                                filter: !isPaid ? 'blur(0.7px)' : 'none'
                                                            }}
                                                            onContextMenu={(e) => !isPaid && e.preventDefault()}
                                                        />
                                                    </div>
                                                    <div className="absolute bottom-0 right-0 bg-black  bg-opacity-50 text-white px-2 py-1 text-sm">
                                                        {language === 'ar' ? `صفحة ${index + 1}` : `Page ${index + 1}`}
                                                    </div>
                                                    {!isPaid && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black  bg-opacity-30 ">
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

                                    {/* Dummy Modern Resume Preview */}
                                    {bundleState.resume.dummyModernResumeUrl && (
                                        <div>
                                           <h4 className="text-3xl text-center font-bold mb-4">
  {language === 'ar' ? 'قالب مميز' : 'Premium Template'}
</h4>

                                            <div className="grid grid-cols-1 gap-4">
                                                {(() => {
                                                    const dummyImages = bundleState.resume.previewImages[bundleState.resume.dummyModernResumeUrl] || [];
                                                    return dummyImages;
                                                })().map((image: string, index: number) => (
                                                    <div key={`dummy-modern-${index}`} className="relative rounded-lg overflow-hidden shadow-lg">
                                                        <div className={`${!isPaid ? 'select-none' : ''}`}>
                                                            <img
                                                                src={image}
                                                                alt={`Dummy Modern resume page ${index + 1}`}
                                                                className="w-full h-auto"
                                                                style={{
                                                                    maxHeight: '800px',
                                                                    objectFit: 'contain',
                                                                    filter: !isPaid ? 'blur(0.7px)' : 'none'
                                                                }}
                                                                onContextMenu={(e) => !isPaid && e.preventDefault()}
                                                            />
                                                        </div>
                                                        <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white px-2 py-1 text-sm">
                                                            {language === 'ar' ? `صفحة ${index + 1}` : `Page ${index + 1}`}
                                                        </div>
                                                        {!isPaid && (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-30">
                                                                <MdOutlineRemoveRedEye size={36} className='text-white' />
                                                                <p className="text-white text-lg font-semibold">
                                                                    {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay To Unlocked Content'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Show message if no images available */}
                                            {(() => {
                                                const dummyImages = bundleState.resume.previewImages[bundleState.resume.dummyModernResumeUrl] || [];
                                                if (dummyImages.length === 0) {
                                                    return (
                                                        <div className="text-center py-8">
                                                            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {language === 'ar' ? 'لا توجد صور معاينة متاحة للنموذج التجريبي' : 'No preview images available for dummy template'}
                                                            </p>
                                                            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                                {language === 'ar' ? 'URL: ' : 'URL: '}{bundleState.resume.dummyModernResumeUrl}
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentPreview === 'linkedin' && bundleState?.linkedin && (
                        <div className="space-y-6">
                            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} relative`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold">
                                        {language === 'ar' ? 'العنوان المهني' : 'Professional Headline'}
                                    </h3>
                                    {isPaid && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(bundleState.linkedin.tagLine);
                                                setIsCopied(true);
                                                setTimeout(() => setIsCopied(false), 2000);
                                                toast.success(
                                                    language === 'ar'
                                                        ? 'تم نسخ المحتوى'
                                                        : 'Content copied to clipboard'
                                                );
                                            }}
                                            className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode
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
                                    <p>{bundleState.linkedin.tagLine}</p>
                                </div>
                                {!isPaid && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black  bg-opacity-40 rounded-lg">
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
                                                const linkedInContent = `${bundleState.linkedin.tagLine}\n\n${bundleState.linkedin.profileSummary}`;
                                                navigator.clipboard.writeText(linkedInContent);
                                                setIsCopied(true);
                                                setTimeout(() => setIsCopied(false), 2000);
                                                toast.success(
                                                    language === 'ar'
                                                        ? 'تم نسخ المحتوى'
                                                        : 'Content copied to clipboard'
                                                );
                                            }}
                                            className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode
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
                                    <p className="whitespace-pre-wrap">{bundleState.linkedin.profileSummary}</p>
                                </div>
                                {!isPaid && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black  bg-opacity-40 rounded-lg">
                                        <MdOutlineRemoveRedEye size={36} className='text-white' />
                                        <p className="text-white text-lg font-semibold">
                                            {language === 'ar' ? 'ادفع لفتح المحتوى' : 'Pay To Unlocked Content'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                </div>

                {/* Get Bundle Offer Button */}
                {!bundleState?.resume && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => setShowResumeUpload(true)}
                            className="px-6 py-3 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {language === 'ar' ? 'احصل على عرض الحزمة' : 'Get Bundle Offer'}
                        </button>
                    </div>
                )}

                {/* Download Button */}
                {bundleState?.resume && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={handleDownload}
                            disabled={isPaid}
                            className={`px-6 py-3 rounded-lg transition-colors bg-black text-white ${isPaid ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {language === 'ar' ? 'تحميل الحزمة الكاملة' : 'Download Complete Bundle'}
                        </button>
                    </div>
                )}

                {/* Payment Form Modal */}
                {showPaymentForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50  flex items-center justify-center z-50 ">
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

                {/* Resume Upload Modal */}
                {showResumeUpload && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className={`relative w-full max-w-2xl p-6 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                            <button
                                onClick={() => setShowResumeUpload(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h2 className="text-2xl font-bold mb-6">
                                {language === 'ar' ? 'رفع السيرة الذاتية' : 'Upload Resume'}
                            </h2>

                            {/* Upload Area */}
                            <div className={`border-2 border-dashed rounded-2xl p-8 mb-6 transition-all duration-300 cursor-pointer ${isDragActive
                                ? (isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
                                : (isDarkMode ? 'border-gray-600 hover:border-gray-400' : 'border-gray-300 hover:border-gray-500')
                                }`}>
                                <div {...getRootProps()} className="text-center">
                                    <input {...getInputProps()} />
                                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'opacity-60'}`} />
                                    <p className="text-lg mb-2">
                                        {isDragActive
                                            ? (language === 'ar' ? 'أفلت الملف هنا...' : 'Drop the file here...')
                                            : (language === 'ar' ? 'اسحب وأفلت ملف PDF هنا أو انقر للاختيار' : 'Drag and drop a PDF file here or click to select')
                                        }
                                    </p>
                                    <p className="text-sm opacity-60">
                                        {language === 'ar'
                                            ? 'الصيغ المدعومة: PDF فقط (حد أقصى 30 ميجابايت)'
                                            : 'Supported format: PDF only (Max 30MB)'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Upload Progress */}
                            {isGeneratingResume && uploadProgress > 0 && (
                                <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">
                                            {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                                        </span>
                                        <span className="text-sm text-gray-500">{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Uploaded Files */}
                            {uploadedFiles.length > 0 && (
                                <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                                        <FileText className="w-5 h-5 mr-2" />
                                        {language === 'ar' ? 'الملفات المرفوعة' : 'Uploaded Files'}
                                    </h3>
                                    <div className="space-y-3">
                                        {uploadedFiles.map((file, index) => (
                                            <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                                <div className="flex items-center">
                                                    <FileText className="w-5 h-5 text-blue-500 mr-3" />
                                                    <div>
                                                        <p className="font-medium">{file.name}</p>
                                                        <p className="text-sm opacity-60">
                                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(index)}
                                                    className={`p-2 rounded-lg transition-colors hover:scale-110 ${isDarkMode ? 'hover:bg-gray-600 text-red-400' : 'hover:bg-gray-100 text-red-500'}`}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-end">
                                <button
                                    onClick={() => setShowResumeUpload(false)}
                                    disabled={isGeneratingResume}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 border-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isDarkMode
                                        ? 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white disabled:hover:border-gray-600 disabled:hover:text-gray-300'
                                        : 'border-gray-300 text-gray-600 hover:border-gray-500 hover:text-black disabled:hover:border-gray-300 disabled:hover:text-gray-600'
                                        }`}
                                >
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleGenerateResume}
                                    disabled={isGeneratingResume || uploadedFiles.length === 0}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isDarkMode
                                        ? 'bg-white text-black hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-400'
                                        : 'bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500'
                                        }`}
                                >
                                    {isGeneratingResume
                                        ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                                        : (language === 'ar' ? 'إنشاء السيرة الذاتية' : 'Generate Resume')
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            <Footer isDarkMode={isDarkMode} language={language} />
        </div>
    );
};