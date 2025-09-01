// global.d.ts — ambient React augmentation to allow `null` in <img src>
import 'react';

declare module 'react' {
  interface ImgHTMLAttributes<T> {
    src?: string | null | undefined;
  }
}
