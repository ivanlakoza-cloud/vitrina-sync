// Augment React types so <img src> can accept string | null (not only string | undefined)
import 'react';

declare module 'react' {
  interface ImgHTMLAttributes<T> {
    // Next.js/TS expects string | undefined by default; our fetcher may return null when no photo.
    // This augmentation allows passing null without a type error.
    src?: string | null | undefined;
  }
}
