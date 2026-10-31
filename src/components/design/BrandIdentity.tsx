import Image from "next/image";

/** Shared wordmark for the workspace and launch page. Edit the name here once. */
export function BrandIdentity() {
  return (
    <>
      <Image
        className="brand-mark"
        src="/clarity-symbol.svg"
        alt=""
        width={32}
        height={32}
        priority
      />
      <span className="brand-name">Clarity</span>
    </>
  );
}
