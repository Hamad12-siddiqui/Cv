import React from 'react';
import { Language } from '../types';

interface TestimonialProps {
  name: string;
  position: string;
  company: string;
  testimonial: string;
  imageUrl: string;
  linkedInUrl?: string;
  isDarkMode?: boolean;
}

const Testimonial: React.FC<TestimonialProps & { showTwitter?: boolean; isDarkMode?: boolean }> = ({
  name,
  position,
  company,
  testimonial,
  imageUrl,
  linkedInUrl,
  showTwitter,
  isDarkMode = false,
}) => (
  <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
    <div className="flex items-center mb-4">
      <img
        src={imageUrl}
        alt={name}
        className="w-12 h-12 rounded-full mr-4 object-cover"
      />
      <div>
        <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>{name}</h3>
        {/* <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {position} at {company}
        </p> */}
      </div>
      <div className="ml-auto flex space-x-2">
       
      </div>
    </div>
    <blockquote className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>"{testimonial}"</blockquote>
  </div>
);

interface SocialProofSectionProps {
  content: any;
  isDarkMode: boolean;
  language: Language;
}

const SocialProofSection: React.FC<SocialProofSectionProps> = ({ content, isDarkMode, language }) => {
  const testimonials = language === 'ar' ? [
    {
      name: "سارة المحمود",
      position: "مديرة الموارد البشرية",
      company: "أرامكو",
      testimonial: "جودة السير الذاتية التي نتلقاها من هذه المنصة استثنائية. التنسيق الواضح والهيكل المتوافق مع ATS يجعل عملية الفحص أكثر كفاءة",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
 
    },
    {
      name: "أحمد حسن",
      position: "مدير اكتساب المواهب",
      company: "شركة التقنية",
      testimonial: "أخيراً وجدت خدمة تفهم السوق السعودي! الملفات الشخصية في لينكد إن التي يحسنونها تؤدي باستمرار بشكل أفضل في عمليات البحث لدينا",
      imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
   
    },
    {
      name: "فاطمة الزهراء",
      position: "مسؤولة التوظيف",
      company: "STC",
      testimonial: "أنصح جميع الباحثين عن عمل بهذه المنصة. الاهتمام بالتفاصيل وفهم ما يبحث عنه أصحاب العمل أمر رائع",
      imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
  
    }
  ] : [
    {
      name: "Sarah Al-Mahmoud",
      position: "HR Director",
      company: "ARAMCO",
      testimonial: "The quality of CVs we receive from this platform is exceptional. Clear formatting and ATS-friendly structure makes our screening process much more efficient.",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
     
    },
    {
      name: "Ahmed Hassan",
      position: "Talent Acquisition Manager",
      company: "Tech Company",
      testimonial: "Finally found a service that understands the Saudi job market! The LinkedIn profiles they optimize consistently perform better in our searches.",
      imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
   
    },
    {
      name: "Fatima Al-Zahra",
      position: "Recruiter",
      company: "STC",
      testimonial: "I've been recommending this platform to all job seekers. The attention to detail and understanding of what employers look for is remarkable.",
      imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
  
    }
  ];

  return (
    <section className={`py-16 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {content.title}
          </h2>
          {/* <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {language === 'ar' 
              ? 'موثوق من قبل كبرى الشركات والمهنيين في جميع أنحاء المملكة العربية السعودية'
              : 'Trusted by top companies and professionals across Saudi Arabia'
            }
          </p> */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  gap-8">
          {testimonials.map((testimonial, index) => (
            <Testimonial
              key={index}
              {...testimonial}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
