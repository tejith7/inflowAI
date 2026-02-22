import type { SVGProps } from 'react';

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-1.9 1.9a2.5 2.5 0 0 0 0 3.54l1.9 1.9" />
      <path d="m12 21 1.9-1.9a2.5 2.5 0 0 0 0-3.54l-1.9-1.9" />
      <path d="M3 12h18" />
      <path d="M16.2 7.8a2.5 2.5 0 0 0-3.54 0L7.8 12.66a2.5 2.5 0 0 0 0 3.54l4.84 4.84a2.5 2.5 0 0 0 3.54 0l4.84-4.84a2.5 2.5 0 0 0 0-3.54Z" />
    </svg>
  );
}
