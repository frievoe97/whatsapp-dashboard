// React & Related Libraries
import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import '../i18n';

// Global Styles
import './index.css';

// Context
import { useChat } from './context/ChatContext';

// Components – Plots & File Upload
import AggregatePerTime from './components/plots/AggregatePerTime';
import Timeline from './components/plots/Timeline';
import WordCount from './components/plots/WordCount';
import Stats from './components/plots/Stats';
import Sentiment from './components/plots/Sentiment';
import Emoji from './components/plots/Emoji';
import BarChartComp from './components/plots/BarChartComp';
import SentimentWord from './components/plots/SentimentWord';
import ChordDiagram from './components/plots/ChordDiagram';
import HeatmapMonthWeekday from './components/plots/Heatmap';
import FileUploadMobile from './components/FileUploadMobile';
import NewFileUploader from './components/FileUpload';
import WelcomeScreen from './components/WelcomeScreen';

///////////////////////////////////////////////////////////////
// Custom Hooks
///////////////////////////////////////////////////////////////

/**
 * Hook: useDarkModeThemeEffect
 *
 * This hook toggles the dark mode class on the document element and updates
 * the meta theme-color based on the dark mode status.
 *
 * @param darkMode - Boolean indicating whether dark mode is active.
 */
function useDarkModeThemeEffect(darkMode: boolean) {
  //////////// useEffect: Toggle Dark Mode Class ////////////
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  //////////// useEffect: Update Theme Color Meta Tag ////////////
  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', darkMode ? '#1f2937' : '#ffffff');
  }, [darkMode]);
}

/**
 * Hook: useEqualRowHeights
 *
 * This hook ensures that all child elements within a container have equal heights per row.
 * It recalculates the heights when the provided dependencies change or when the window is resized.
 *
 * @param containerRef - Reference to the container element.
 * @param dependencies - Array of dependencies to trigger the recalculation.
 */
function useEqualRowHeights(
  containerRef: React.RefObject<HTMLDivElement>,
  dependencies: number[] = [],
) {
  useEffect(() => {
    function setEqualRowHeights() {
      const container = containerRef.current;
      if (!container) return;

      // Reset child heights to calculate their natural size
      const items = Array.from(container.children) as HTMLDivElement[];
      items.forEach((item) => (item.style.height = 'auto'));

      // Group items by row based on their top offset
      const rows: HTMLDivElement[][] = [];
      let currentRow: HTMLDivElement[] = [];
      let lastTop: number | null = null;

      items.forEach((item) => {
        const top = item.offsetTop;
        if (lastTop === null || top === lastTop) {
          currentRow.push(item);
        } else {
          rows.push(currentRow);
          currentRow = [item];
        }
        lastTop = top;
      });
      if (currentRow.length) rows.push(currentRow);

      // Set each item in a row to the maximum height found in that row
      rows.forEach((row) => {
        const maxHeight = Math.max(...row.map((item) => item.offsetHeight));
        row.forEach((item) => (item.style.height = `${maxHeight}px`));
      });
    }

    // Initial calculation and re-calculate on dependency changes
    setEqualRowHeights();
    window.addEventListener('resize', setEqualRowHeights);
    return () => window.removeEventListener('resize', setEqualRowHeights);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

///////////////////////////////////////////////////////////////
// Main Application Component
///////////////////////////////////////////////////////////////

/**
 * Component: App
 *
 * This is the root component for the Chat Visualizer application. It sets up SEO tags,
 * manages dark mode, renders file upload components for desktop and mobile, and displays
 * various chat analysis plots based on the uploaded data.
 *
 * @returns The application UI.
 */
const App: React.FC = () => {
  const { darkMode, filteredMessages } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  //////////// useEffect: Scroll to Top on Mount ////////////
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  //////////// useEffect: Update Body Class for Dark Mode ////////////
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  //////////// useEffect: Google Tag Manager Script ////////////

  /**
   * This useEffect hook adds the Google Tag Manager script to the document
   * head only if isTesting is false.
   */
  // useEffect(() => {
  //   if (!location.hash.startsWith('#/testing')) {
  //     console.log('Google Tag Manager script added.');
  //     const script = document.createElement('script');
  //     script.innerHTML = `
  //       (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  //       new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  //       j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  //       'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  //       })(window,document,'script','dataLayer','GTM-MGJZ72QL');
  //     `;
  //     document.head.appendChild(script);

  //     const noscript = document.createElement('noscript');
  //     noscript.innerHTML = `
  //       <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MGJZ72QL"
  //         height="0" width="0" style="display:none;visibility:hidden"></iframe>
  //     `;
  //     document.body.appendChild(noscript);
  //   }
  // }, []);

  // Apply dark mode settings and update meta tag
  useDarkModeThemeEffect(darkMode);

  // Adjust heights of analysis components on layout change
  useEqualRowHeights(containerRef, [filteredMessages.length]);

  //////////// Render Application UI ////////////
  return (
    <>
      {/* SEO Configuration */}
      <Helmet>
        <title>{t('App.title')}</title>
        <meta
          name="description"
          content="Visualize your WhatsApp chats with detailed charts and statistics."
        />
        <meta property="og:title" content="Chat Visualizer" />
        <meta
          property="og:description"
          content="Visualize your WhatsApp chats with interactive graphics."
        />
        <meta property="og:image" content="https://chat-visualizer.de/preview.png" />
        <meta property="og:url" content="https://chat-visualizer.de" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* Main Application Container */}
      <div className="p-4 flex flex-col h-[100lvh] h-[100svh] h-[-webkit-fill-available]">
        {/* File Upload Section for Desktop and Mobile */}
        <div className="hidden md:block">
          <NewFileUploader />
        </div>
        <div className="md:hidden">
          <FileUploadMobile />
        </div>

        {/* Chat Analysis Components */}
        <div
          ref={containerRef}
          className={`mt-4 md:h-lvh flex-1 md:overflow-y-auto flex flex-wrap gap-4 justify-between items-stretch ${
            filteredMessages.length != 0 ? 'pb-4 md:pb-0' : ''
          }`}
        >
          {/* p-4 px-8 */}
          {filteredMessages.length === 0 ? (
            <div
              className={`w-full h-full flex text-lg items-center justify-center border rounded-none text-center ${
                darkMode ? 'border-white' : 'border-black'
              } `}
            >
              {/* {t('App.placeholder')} */}
              <WelcomeScreen />
            </div>
          ) : (
            <>
              <AggregatePerTime />
              <Timeline />
              <BarChartComp />
              <Emoji />
              <ChordDiagram />
              <WordCount />
              <Stats />
              <Sentiment />
              <SentimentWord />
              <HeatmapMonthWeekday />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default App;
