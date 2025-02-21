import { useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import { handleFileUpload } from '../utils/chatUtils';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

/**
 * WelcomeScreen Component
 *
 * Displays a welcome message with an animated slideshow and a file upload button.
 * The slideshow uses the Swiper carousel with a slide effect.
 * Instead of fading the entire image out during transitions, soft gradient overlays
 * on the left and right edges create a subtle fade where the image exits the container.
 * Specific image indices to skip are defined within the component.
 *
 * This component supports dark mode and uses responsive design.
 */
export default function WelcomeScreen() {
  const {
    darkMode,
    metadata,
    setOriginalMessages,
    setMetadata,
    setIsPanelOpen,
    setUseShortNames,
    tempSetUseShortNames,
  } = useChat();
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef(null);

  // Define indices (0-based) of images to skip
  const skipIndices = [2, 3, 4, 5, 6, 8];

  // Create all image paths
  const allImages = Array.from(
    { length: 10 },
    (_, i) => `/images/slideshow/${i + 1}_${darkMode ? 'dark' : 'light'}.png`,
  );

  // Filter out images based on skipIndices
  const images = allImages.filter((_, index) => !skipIndices.includes(index));

  // Determine container background colors for gradient overlays
  const containerBgColor = darkMode ? '#1F2937' : '#ffffff'; // gray-800 or white

  console.log('Language: ', i18n.language);

  return (
    <div
      className={`p-2 w-full h-full flex flex-col items-center justify-around  ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
      }`}
    >
      {/* Title and subtitle */}
      <div>
        <h1 className="text-3xl font-bold">{t('WelcomeScreen.title')}</h1>
        <h2 className="text-center mt-4">{t('WelcomeScreen.subtitle')}</h2>
      </div>

      {/* Carousel container with fixed responsive height */}
      <div className="w-full max-w-3xl h-48 sm:h-56 md:h-64 lg:h-80 xl:h-96 mt-6 relative overflow-hidden">
        <Swiper
          modules={[Autoplay]}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          loop={true}
          centeredSlides={true}
          speed={750}
          className="h-full"
        >
          {images.map((src, index) => (
            <SwiperSlide key={index} className="flex items-center justify-center">
              <img
                src={src}
                alt={`Slide ${index + 1}`}
                className="h-full w-auto object-contain mx-auto"
              />
            </SwiperSlide>
          ))}
        </Swiper>
        {/* Left gradient overlay */}
        <div
          className="absolute top-0 left-0 h-full w-1/12 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${containerBgColor}, transparent)`,
          }}
        />
        {/* Right gradient overlay */}
        <div
          className="absolute top-0 right-0 h-full w-1/12 pointer-events-none"
          style={{
            background: `linear-gradient(to left, ${containerBgColor}, transparent)`,
          }}
        />
      </div>

      {/* File upload button */}
      <div className="flex items-center mt-4">
        <label
          htmlFor="file-upload"
          className={`text-sm md:text-base cursor-pointer px-4 py-2 border rounded-none ${
            metadata?.fileName ? '' : 'w-full text-center'
          } ${
            darkMode
              ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
              : 'bg-white text-black border-black hover:bg-gray-200'
          } transition-all`}
        >
          {t('FileUpload.selectFile')}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".txt"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) =>
            handleFileUpload(
              e,
              setOriginalMessages,
              setMetadata,
              setIsPanelOpen,
              setUseShortNames,
              tempSetUseShortNames,
            )
          }
        />
      </div>
    </div>
  );
}
