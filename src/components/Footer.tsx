import React from 'react';
import { Language } from '../types';

interface FooterProps {
  isDarkMode: boolean;
  language: Language;
}

export const Footer: React.FC<FooterProps> = ({ isDarkMode, language }) => {
  return (
    <footer className={`py-4 px-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      <div className="container mx-auto text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center  ${isDarkMode ? 'bg-white text-black' : 'bg-white text-black'}`}>
            <img src="/logo-1.png" alt="C Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-xl font-bold">Value</span>
        </div>
        <p className="opacity-80">
          {language === 'ar' ? 'تمكين المهن، ملف واحد في كل مرة.' : 'Empowering careers, one profile at a time'}
        </p>
      </div>
    </footer>
  );
};