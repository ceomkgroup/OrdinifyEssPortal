"use client";

import { useState } from "react";
import Image from "next/image";
import { getDisplayName, getInitials } from "@/lib/format";
import { getPersonPhoto, resolveMediaUrl } from "@/lib/media";

export function Avatar({ name, src, person, size = 40, className = "" }) {
  const displayName = name || getDisplayName(person);
  const photo = src || getPersonPhoto(person);
  const url = resolveMediaUrl(photo);
  const dim = `${size}px`;
  const initials = getInitials(displayName);
  const [broken, setBroken] = useState(false);

  if (url && !broken) {
    return (
      <Image
        src={url}
        alt={displayName || "avatar"}
        width={size}
        height={size}
        className={`relative z-0 rounded-full object-cover ${className}`}
        style={{ width: dim, height: dim }}
        unoptimized
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--lavender-soft)] font-semibold text-[var(--violet)] ${className}`}
      style={{ width: dim, height: dim, fontSize: Math.max(12, size * 0.34) }}
      aria-label={displayName || "avatar"}
    >
      {initials}
    </div>
  );
}
