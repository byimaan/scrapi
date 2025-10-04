export const EXTRACT_ATTRIBUTES = ['src','srcset','data-src','data-original'] as const;
export const MEDIAS = ['image','video'] as const;
export const RENDER_MODES = ['auto', 'html', 'headless'] as const;
export const SWITCHES = ['on','off'] as const;

type ImgExts = '*' | 'jpg' | 'jpeg' | 'png' | 'webp';

export const DEFAULT_IMG_FORMATS:ImgExts[] = ['*'] as const;
export const DEFAULT_EXCLUDE_IMG_FORMATS:string[] = [] as const;