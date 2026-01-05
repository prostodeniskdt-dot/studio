import { cn } from "@/lib/utils";
import Image from "next/image";

interface AppLogoProps {
  className?: string;
  variant?: 'dark' | 'light';
  /**
   * Размер логотипа. По умолчанию 'default' (h-8)
   * 'small' - для компактных мест (h-6)
   * 'default' - стандартный размер (h-8)
   * 'large' - для крупных отображений (h-12)
   */
  size?: 'small' | 'default' | 'large';
}

export function AppLogo({ className, variant, size = 'default' }: AppLogoProps) {
  // Определяем вариант логотипа:
  // - Если передан явно через prop, используем его
  // - Если className содержит 'text-sidebar' - это сайдбар с черным фоном, нужен светлый логотип
  // - Иначе - главная страница с серым фоном, нужен темный логотип
  const logoVariant = variant || (className?.includes('text-sidebar') ? 'light' : 'dark');
  
  // Выбираем соответствующий файл логотипа:
  // - logo-light.png - для черного фона (сайдбар) - золотистый текст на черном фоне
  // - logo-dark.png - для серого фона (главная страница) - темный текст на сером фоне
  const logoPath = logoVariant === 'light' 
    ? '/images/logo/logo-light.png'  // Для черного фона (сайдбар) - золотистый текст "BAR BOSS ONLINE"
    : '/images/logo/logo-dark.png';   // Для серого фона (главная страница) - темный текст "BAR BOSS ONLINE"

  // Определяем размеры в зависимости от пропа size
  const sizeClasses = {
    small: 'h-6',
    default: 'h-8',
    large: 'h-12'
  };

  // Базовые размеры изображения (соотношение примерно 3:1 для логотипа с текстом "BAR BOSS ONLINE")
  const imageDimensions = {
    small: { width: 90, height: 30 },
    default: { width: 150, height: 50 },
    large: { width: 240, height: 80 }
  };

  const dimensions = imageDimensions[size];

  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src={logoPath}
        alt="BAR BOSS ONLINE"
        width={dimensions.width}
        height={dimensions.height}
        className={cn("w-auto object-contain", sizeClasses[size])}
        priority
      />
    </div>
  );
}
