"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "../data";

interface FarmerAvatarProps {
  name: string;
  avatar?: string;
  size?: "sm" | "lg";
  className?: string;
}

const isRemote = (src: string) => /^https?:\/\//.test(src);

export function FarmerAvatar({ name, avatar, size = "sm", className }: FarmerAvatarProps) {
  const sizeClasses = size === "lg" ? "h-20 w-20 text-[28px]" : "h-8 w-8 text-[12px]";
  // A registry photo link expires after about an hour, so a failed load falls back to the initials.
  const [failed, setFailed] = useState<string | null>(null);

  if (avatar && failed !== avatar) {
    // Registry photos come from the storage host with a signed link, so they bypass the image optimizer.
    return isRemote(avatar) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatar} alt={name} width={80} height={80} onError={() => setFailed(avatar)} className={cn("shrink-0 rounded-full object-cover", sizeClasses, className)} />
    ) : (
      <Image src={avatar} alt={name} width={80} height={80} className={cn("shrink-0 rounded-full object-cover", sizeClasses, className)} />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "lg" ? "bg-brand-green text-white" : "bg-brand-tint text-brand-green",
        sizeClasses,
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
