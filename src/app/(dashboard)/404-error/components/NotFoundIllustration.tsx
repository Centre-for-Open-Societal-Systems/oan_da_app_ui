import Image from "next/image";

export function NotFoundIllustration() {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/images/errors/404-magnifying-sprout.svg"
        alt="Page not found illustration"
        width={144}
        height={144}
        unoptimized
        priority
        className="h-32 w-32 sm:h-36 sm:w-36"
      />
    </div>
  );
}

