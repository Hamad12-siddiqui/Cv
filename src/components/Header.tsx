import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { Language } from '../types';

interface HeaderProps {
  isDarkMode: boolean;
  language: Language;
  toggleDarkMode: () => void;
  toggleLanguage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  language,
  toggleDarkMode,
  toggleLanguage
}) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isDarkMode ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-sm border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center  cursor-pointer" onClick={handleLogoClick}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center  ${isDarkMode ? 'bg-white text-black' : 'bg-white text-black'}`}>
            <img src="/logo-1.png" alt="C Logo" className="w-6 h-6 object-contain" />
          </div>
          <span style={{ fontFamily: 'Didot, Didot LT STD, Hoefler Text, Garamond, Times New Roman, serif' }} className="text-xl font-bold">
            Value
          </span>
        </div>

        <div className="flex items-center space-x-8">
          <button
            onClick={toggleLanguage}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                : 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200'
              }`}
          >
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                : 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200'
              }`}
            title={isDarkMode ? (language === 'ar' ? 'تبديل للوضع الفاتح' : 'Switch to Light Mode') : (language === 'ar' ? 'تبديل للوضع الداكن' : 'Switch to Dark Mode')}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

        </div>
      </div>
    </header>
  );
};