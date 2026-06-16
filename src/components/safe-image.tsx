"use client";

import { type ImgHTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react";

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback: ReactNode;
};

export function SafeImage({ fallback, src, alt, ...props }: SafeImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;

  return (
    <img
      {...props}
      ref={imageRef}
      src={src}
      alt={alt}
      onLoad={(event) => {
        props.onLoad?.(event);
        if (event.currentTarget.naturalWidth === 0) setFailed(true);
      }}
      onError={(event) => {
        props.onError?.(event);
        setFailed(true);
      }}
    />
  );
}
