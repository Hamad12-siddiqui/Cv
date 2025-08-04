import React from 'react';
import { BiTargetLock } from "react-icons/bi";
import { FaUserCheck } from "react-icons/fa";
import { GoDatabase } from 'react-icons/go';
import { MdPeopleAlt } from "react-icons/md";
import { Content, Language } from '../types';

interface DatabaseSectionProps {
  content: Content['database'];
  isDarkMode: boolean;
  language: Language;
}

const DatabaseSection: React.FC<DatabaseSectionProps> = ({ content, isDarkMode, language }) => {
  return (
    <section className={`w-full py-16 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-16 ">
           <GoDatabase className={`h-20 w-20 mx-auto ${isDarkMode ? 'text-white' : 'text-black'}`}/>

            <h2 className={`text-5xl font-bold mb-12 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {content.title}
            </h2>
<div className={`shadow-[0_2px_4px_0_rgba(0,0,0,0.1),0_-2px_4px_0_rgba(0,0,0,0.1)] rounded-xl py-7 max-w-4xl mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>

            
            <p className={`text-xl mb-4 max-w-2xl mx-auto py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {content.subtitle}
            </p>
          <div className="grid grid-cols-1 md:grid-cols-3  gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <MdPeopleAlt className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-black'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {language === 'ar' ? 'وصول مباشر للموارد البشرية' : 'Direct HR Access'}
              </h3>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-4">
                <FaUserCheck className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-black'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {language === 'ar' ? 'ملفات شخصية موثقة' : 'Verified Profiles'}
              </h3>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-4">
                <BiTargetLock className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-black'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {language === 'ar' ? 'مطابقة الوظائف' : 'Job Matching'}
              </h3>
            </div>
          </div>

          <p className={`mt-12 text-lg max-w-3xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {language === 'ar' 
              ? 'يصبح ملفك الشخصي المحسن جزءًا من مجموعة مواهب منتقاة يبحث فيها المسؤولون عن التوظيف بنشاط لتلبية احتياجاتهم التوظيفية هذا يمنحك رؤية مستمرة تتجاوز شراء الخدمة الأولي'
              : 'Your enhanced profile becomes part of a curated talent pool that recruiters actively search through for their hiring needs. This gives you ongoing visibility beyond your initial service purchase.'
            }
          </p>
        </div>
      </div>
      </div>
       </div>
    </section>
  );
};

export default DatabaseSection;
