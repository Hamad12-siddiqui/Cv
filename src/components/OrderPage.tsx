import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Upload, X, FileText, CheckCircle, Briefcase, MapPin, User, FileIcon, ArrowLeft } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { content } from '../data/content';
import ScrollToTop from '../components/ScrollToTop';

interface UploadResponse {
  session_id: string;
  classic_resume_url?: string;
  modern_resume_url?: string;
  file_name?: string;
  cover_letter_filename?: string;
  email?: string;
  phone?: string;
  processingTimeSeconds?: number;
  // LinkedIn specific fields
  tag_line?: string;
  profile_summary?: string;
}

interface FormData {
  company: string;
  location: string;
  jobTitle: string;
  jobDescription: string;
 
}

export const OrderPage: React.FC = () => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Cover letter form data
  const [formData, setFormData] = useState<FormData>({
    company: '',
    location: '',
    jobTitle: '',
    jobDescription: ''
  });

  const currentContent = content[language as 'ar' | 'en'];

  const getServiceContent = () => {
    switch (serviceType) {
      case 'cv':  
        return currentContent.orderPage.cv;
      case 'linkedin':
        return currentContent.orderPage.linkedin;
      case 'cover-letter':
        return currentContent.orderPage.coverLetter;
      case 'bundle':
        return currentContent.orderPage.bundle;
      default:
        return currentContent.orderPage.cv;
    }
  };

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
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
    multiple: false, // Only allow single file for cover letter
    accept: {
      'application/pdf': ['.pdf']
    }
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast.info(language === 'ar' ? 'تم حذف الملف' : 'File removed');
  };

  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateCoverLetterForm = (): boolean => {
    const { company, location, jobTitle, jobDescription } = formData;
    
    if (!company.trim() || !location.trim() || !jobTitle.trim() || !jobDescription.trim()) {
      toast.error(language === 'ar'
        ? 'يرجى ملء جميع حقول الوظيفة.'
        : 'Please fill in all job details fields.'
      );
      return false;
    }
    
    if (jobDescription.length < 50) {
      toast.error(language === 'ar'
        ? 'يجب أن يكون وصف الوظيفة أكثر من 50 حرف.'
        : 'Job description must be at least 50 characters long.'
      );
      return false;
    }
    
    return true;
  };

  const generateCoverLetter = async (): Promise<UploadResponse> => {
    const API_BASE_URL = 'https://ai.cvaluepro.com/cover';
    
    const formDataToSend = new FormData();
    const file = uploadedFiles[0];
    
    formDataToSend.append('file', file, file.name);
    formDataToSend.append('company', formData.company);
    formDataToSend.append('location', formData.location);
    formDataToSend.append('job_title', formData.jobTitle);
    formDataToSend.append('job_description', formData.jobDescription);
    
    // Debug logging
    console.log('Sending cover letter generation request with:');
    console.log('File:', file.name);
    console.log('Company:', formData.company);
    console.log('Location:', formData.location);
    console.log('Job Title:', formData.jobTitle);
    console.log('Job Description length:', formData.jobDescription.length);

    // Record start time
    const startTime = Date.now();

    const response = await axios.post(`${API_BASE_URL}/generate-cover-letter`, formDataToSend, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
           "ngrok-skip-browser-warning": "true",
      },
      timeout: 120000, // 2 minutes timeout for cover letter generation
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      },
    });
    
    console.log('Cover letter generation response:', response.data);

    // Calculate processing time in seconds
    const processingTimeSeconds = (Date.now() - startTime) / 1000;
    
    // Store processing time to be used after getting resume_id
    response.data.processingTimeSeconds = processingTimeSeconds;

    return response.data;
  };

  const generateLinkedIn = async (): Promise<UploadResponse> => {
    const API_BASE_URL = 'https://ai.cvaluepro.com/linkedin';
    
    const formDataToSend = new FormData();
    const file = uploadedFiles[0];
    formDataToSend.append('file', file, file.name);

    // Record start time
    const startTime = Date.now();

    const response = await axios.post(`${API_BASE_URL}/generate-linkedin`, formDataToSend, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        'ngrok-skip-browser-warning': 'true',
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
    
    // Store processing time to be used after getting resume_id
    response.data.processingTimeSeconds = processingTimeSeconds;

    return response.data;
  };

  const generateResume = async (): Promise<UploadResponse> => {
    const API_BASE_URL = 'https://ai.cvaluepro.com/resume';
    
    // Health check first
    await axios.get(`${API_BASE_URL}/health-check`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

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

    // Store processing time to be used after getting resume_id
    response.data.processingTimeSeconds = processingTimeSeconds;

    return response.data;
  };

  const reportFailedResume = async (email: string, phone: string, processingTimeSeconds?: number) => {
    const payload = {
      email,
      contact: phone // only send 'contact', not 'phone'
    };
    try {
      console.log('Reporting failed resume payload:', payload);
      const resp = await axios.post(
        'https://admin.cvaluepro.com/dashboard/resumes/failed',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // If we have both resume_id and processing time, report it
      if (resp.data?.resume_id && processingTimeSeconds !== undefined) {
        try {
          await axios.post(
            'https://admin.cvaluepro.com/dashboard/resumes/processing-time',
            {
              resume_id: resp.data.resume_id,
              processing_time_seconds: Math.round(processingTimeSeconds)
            },
            { headers: { 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Failed to record processing time:', error);
        }
      }
      
      // Return resume_id if present
      return resp.data?.resume_id;
    } catch (err: any) {
      if (err.response) {
        console.error('Failed to report resume failure:', {
          status: err.response.status,
          data: err.response.data,
          payload,
        });
      } else {
        console.error('Failed to report resume failure:', err, payload);
      }
      return undefined;
    }
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.error(language === 'ar'
        ? 'يرجى تحديد ملف واحد على الأقل للرفع.'
        : 'Please select at least one file to upload.'
      );
      return;
    }

    if ((serviceType === 'cover-letter' || serviceType === 'bundle') && !validateCoverLetterForm()) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Start timing
    const startTime = Date.now();

    try {
      let responseData: UploadResponse;
      let resumeId: number | undefined;

      if (serviceType === 'bundle') {
        // Call all generation APIs in parallel
        const [coverLetterResponse, linkedinResponse, resumeResponse] = await Promise.all([
          generateCoverLetter(),
          generateLinkedIn(),
          generateResume()
        ]);

        // Calculate average processing time from all three services
        const processingTimes = [
          coverLetterResponse.processingTimeSeconds,
          linkedinResponse.processingTimeSeconds,
          resumeResponse.processingTimeSeconds
        ].filter(time => time !== undefined) as number[];

        const averageProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          : undefined;

        // Report failed resume for bundle and send average processing time
        if (coverLetterResponse.email && coverLetterResponse.phone) {
          resumeId = await reportFailedResume(
            coverLetterResponse.email,
            coverLetterResponse.phone,
            averageProcessingTime
          );
          // Calculate processing time and report
          if (typeof resumeId === 'number' && resumeId > 0) {
            const endTime = Date.now();
            const processingTimeSeconds = Math.floor((endTime - startTime) / 1000);
            await axios.post(
              'https://admin.cvaluepro.com/dashboard/resumes/processing-time',
              {
                resume_id: resumeId,
                processing_time_seconds: processingTimeSeconds
              },
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        // Fetch preview images for cover letter and resume
        const API_BASE_URL = 'https://ai.cvaluepro.com';
        const [coverLetterImagesResponse, resumeImagesResponse] = await Promise.all([
          // Fetch cover letter images
          axios.post(`${API_BASE_URL}/cover/images`, {
            session_id: coverLetterResponse.session_id,
            filename: coverLetterResponse.cover_letter_filename || coverLetterResponse.file_name
          }, {
            headers: {
              'ngrok-skip-browser-warning': 'true',
              'Content-Type': 'application/json'
            }
          }),
          // Fetch resume images
          axios.post(`${API_BASE_URL}/resume/images`, {
            session_id: resumeResponse.session_id,
            filenames: [resumeResponse.classic_resume_url, resumeResponse.modern_resume_url]
          }, {
            headers: {
              'ngrok-skip-browser-warning': 'true',
              'Content-Type': 'application/json'
            }
          })
        ]);

        // Navigate to bundle preview with all responses including images
        navigate('/bundle-preview', {
          state: {
            coverLetter: {
              session_id: coverLetterResponse.session_id,
              cover_letter_filename: coverLetterResponse.cover_letter_filename || coverLetterResponse.file_name,
              email: coverLetterResponse.email,
              phone: coverLetterResponse.phone,
              previewImages: { images: coverLetterImagesResponse.data.images || [] }
            },
            linkedin: {
              tagLine: linkedinResponse.tag_line,
              profileSummary: linkedinResponse.profile_summary,
              email: linkedinResponse.email,
              phone: linkedinResponse.phone
            },
            resume: {
              sessionId: resumeResponse.session_id,
              classicResumeUrl: resumeResponse.classic_resume_url,
              modernResumeUrl: resumeResponse.modern_resume_url,
              email: resumeResponse.email,
              phone: resumeResponse.phone,
              previewImages: resumeImagesResponse.data
            }
          }
        });
      } else if (serviceType === 'cover-letter') {
        responseData = await generateCoverLetter();

        // Immediately report failed resume for cover letter
        if (responseData.email && responseData.phone) {
          resumeId = await reportFailedResume(
            responseData.email,
            responseData.phone,
            responseData.processingTimeSeconds // pass processing time if available
          );
          // Calculate processing time and report
          if (typeof resumeId === 'number' && resumeId > 0) {
            const endTime = Date.now();
            const processingTimeSeconds = Math.floor((endTime - startTime) / 1000);
            await axios.post(
              'https://admin.cvaluepro.com/dashboard/resumes/processing-time',
              {
                resume_id: resumeId,
                processing_time_seconds: processingTimeSeconds
              },
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        navigate('/cover-letter-preview', {
          state: {
            session_id: responseData.session_id,
            cover_letter_filename: responseData.cover_letter_filename || responseData.file_name,
            email: responseData.email,
            phone: responseData.phone,
            resume_id: resumeId // Pass the integer resume_id here
          }
        });
      } else if (serviceType === 'linkedin') {
        const linkedinResponse = await generateLinkedIn();

        // Immediately report failed resume for LinkedIn
        if (linkedinResponse.email && linkedinResponse.phone) {
          resumeId = await reportFailedResume(
            linkedinResponse.email,
            linkedinResponse.phone,
            linkedinResponse.processingTimeSeconds // pass processing time if available
          );
          // Calculate processing time and report
          if (typeof resumeId === 'number' && resumeId > 0) {
            const endTime = Date.now();
            const processingTimeSeconds = Math.floor((endTime - startTime) / 1000);
            await axios.post(
              'https://admin.cvaluepro.com/dashboard/resumes/processing-time',
              {
                resume_id: resumeId,
                processing_time_seconds: processingTimeSeconds
              },
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        navigate('/linkedin-preview', {
          state: {
            tagLine: linkedinResponse.tag_line,
            profileSummary: linkedinResponse.profile_summary,
            email: linkedinResponse.email,
            phone: linkedinResponse.phone,
            resume_id: resumeId // Pass resume_id to LinkedInPreview
          }
        });
      } else {
        responseData = await generateResume();

        // Immediately report failed resume for CV enhancement
        if (responseData.email && responseData.phone) {
          resumeId = await reportFailedResume(
            responseData.email,
            responseData.phone,
            responseData.processingTimeSeconds // pass processing time if available
          );
          // Calculate processing time and report
          if (typeof resumeId === 'number' && resumeId > 0) {
            const endTime = Date.now();
            const processingTimeSeconds = Math.floor((endTime - startTime) / 1000);
            await axios.post(
              'https://admin.cvaluepro.com/dashboard/resumes/processing-time',
              {
                resume_id: resumeId,
                processing_time_seconds: processingTimeSeconds
              },
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        navigate('/preview', {
          state: {
            sessionId: responseData.session_id,
            classicResumeUrl: responseData.classic_resume_url,
            modernResumeUrl: responseData.modern_resume_url,
            email: responseData.email,
            phone: responseData.phone,
            resume_id: resumeId // optionally pass resume_id if needed
          }
        });
      }

      toast.success(language === 'ar'
        ? 'تم رفع الملف بنجاح!'
        : 'File uploaded successfully!'
      );
    } catch (error: any) {
      console.error('Upload error:', error);

      let errorMessage = language === 'ar'
        ? 'فشل في الرفع. يرجى المحاولة مرة أخرى.'
        : 'Upload failed. Please try again.';

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
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    if (uploadedFiles.length > 0 || Object.values(formData).some(value => value.trim())) {
      const confirmMessage = language === 'ar'
        ? 'هل أنت متأكد من الإلغاء؟ ستفقد جميع البيانات المدخلة.'
        : 'Are you sure you want to cancel? All entered data will be lost.';
      
      if (window.confirm(confirmMessage)) {
        setUploadedFiles([]);
        setFormData({ company: '', location: '', jobTitle: '', jobDescription: '' });
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const serviceContent = getServiceContent();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <ScrollToTop />
      <Header
        isDarkMode={isDarkMode}
        language={language}
        toggleDarkMode={toggleDarkMode}
        toggleLanguage={toggleLanguage}
      />

      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back Button */}
          <div className="mb-8 ">
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
          </div>

          {/* Service Info */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 ">
              {serviceContent.title}
            </h1>
            <p className="text-lg opacity-80 max-w-3xl mx-auto">
              {serviceContent.description}
            </p>
          </div>

          {/* Upload Area */}
          <div className={`border-2 border-dashed rounded-2xl p-8 mb-8 transition-all duration-300 cursor-pointer ${
            isDragActive 
              ? (isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
              : (isDarkMode ? 'border-gray-600 hover:border-gray-400' : 'border-gray-300 hover:border-gray-500')
          }`}>
            <div {...getRootProps()} className="text-center">
              <input {...getInputProps()} />
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'opacity-60'}`} />
              <p className="text-lg mb-2">
                {isDragActive 
                  ? (language === 'ar' ? 'أفلت الملف هنا...' : 'Drop the file here...')
                  : currentContent.orderPage.uploadText
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
          {isUploading && uploadProgress > 0 && (
            <div className={`rounded-2xl p-6 mb-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
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
            <div className={`rounded-2xl p-6 mb-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                {language === 'ar' ? 'الملفات المرفوعة' : 'Uploaded Files'}
              </h3>
              <div className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <FileIcon className="w-5 h-5 text-red-500 mr-3" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm opacity-60">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className={`p-2 rounded-lg transition-colors hover:scale-110 ${isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-500'}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cover Letter Form */}
          {(serviceType === 'cover-letter' || serviceType === 'bundle') && (
            <div className={`rounded-2xl p-6 mb-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                {language === 'ar' ? 'تفاصيل الوظيفة' : 'Job Details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 font-medium flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'اسم الشركة' : 'Company Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => handleFormChange('company', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                    placeholder={language === 'ar' ? 'ادخل اسم الشركة' : 'Enter company name'}
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'موقع الشركة' : 'Company Location'}
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => handleFormChange('location', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                    placeholder={language === 'ar' ? 'ادخل موقع الشركة' : 'Enter company location'}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-2 font-medium flex items-center">
                    <Briefcase className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={e => handleFormChange('jobTitle', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                    placeholder={language === 'ar' ? 'ادخل المسمى الوظيفي' : 'Enter job title'}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-2 font-medium">
                    {language === 'ar' ? 'وصف الوظيفة' : 'Job Description'}
                  </label>
                  <textarea
                    rows={6}
                    value={formData.jobDescription}
                    onChange={e => handleFormChange('jobDescription', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                    placeholder={language === 'ar' ? 'ادخل وصف الوظيفة (50 حرف على الأقل)' : 'Enter job description (minimum 50 characters)'}
                  />
                  <div className="mt-1 text-sm opacity-60">
                    {formData.jobDescription.length}/50 {language === 'ar' ? 'حرف كحد أدنى' : 'characters minimum'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 border-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white disabled:hover:border-gray-600 disabled:hover:text-gray-300' 
                  : 'border-gray-300 text-gray-600 hover:border-gray-500 hover:text-black disabled:hover:border-gray-300 disabled:hover:text-gray-600'
              }`}
            >
              {currentContent.orderPage.cancelButton}
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || uploadedFiles.length === 0}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                isDarkMode 
                  ? 'bg-white text-black hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-400' 
                  : 'bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500'
              }`}
            >
              {isUploading 
                ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                : currentContent.orderPage.uploadButton
              }
            </button>
          </div>
        </div>
      </main>

      <Footer isDarkMode={isDarkMode} language={language} />
    </div>
  );
};