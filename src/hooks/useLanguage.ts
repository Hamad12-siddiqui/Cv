import { useState, useEffect } from 'react';
import { Language } from '../types';

export const useLanguage = () => {
  // Initialize language from localStorage or default to Arabic
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      return savedLanguage || 'ar';
    }
    return 'ar';
  });

  // Apply language settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Set language attribute
    root.setAttribute('lang', language);
    
    // Always maintain LTR direction as requested
    root.setAttribute('dir', 'ltr');
    
    // Add language class for CSS targeting if needed
    root.classList.remove('lang-ar', 'lang-en');
    root.classList.add(`lang-${language}`);
    
    // Save to localStorage
    localStorage.setItem('language', language);
    // ...existing code...
    // document.title = language === 'ar' ? 'CValue - تطوير المهن' : 'CValue - Career Development';

  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const setLanguageDirectly = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  return {
    language,
    toggleLanguage,
    setLanguageDirectly
  };
};