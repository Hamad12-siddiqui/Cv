import React from 'react';
import { Header } from './Header';
import { HeroSection } from './HeroSection';
import { ServicesSection } from './ServicesSection';
import { SpecialOfferSection } from './SpecialOfferSection';
import DatabaseSection from './DatabaseSection';
import { AdvantagesSection } from './AdvantagesSection';
import SocialProofSection from './SocialProofSection';
import { Footer } from './Footer';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { content } from '../data/content';

export const HomePage: React.FC = () => {
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { language, toggleLanguage } = useLanguage();

    const currentContent = content[language];

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
            <Header
                isDarkMode={isDarkMode}
                language={language}
                toggleDarkMode={toggleDarkMode}
                toggleLanguage={toggleLanguage}
            />

            <HeroSection
                content={currentContent.hero}
                isDarkMode={isDarkMode}
                language={language}
            />

            <ServicesSection
                content={currentContent.services}
                isDarkMode={isDarkMode}
                language={language}
            />

            <SpecialOfferSection
                content={currentContent.offer}
                isDarkMode={isDarkMode}
                language={language}
            />

            <DatabaseSection
                isDarkMode={isDarkMode}
                content={currentContent.database}
                language={language}
            />

            <AdvantagesSection
                content={currentContent.advantages}
                isDarkMode={isDarkMode}
            />

            <SocialProofSection
                isDarkMode={isDarkMode}
                content={currentContent.socialProof}
                language={language}
            />

            <Footer
                isDarkMode={isDarkMode}
                language={language}
            />
        </div>
    );
};