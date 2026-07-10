import type { DetailedHTMLProps, HTMLAttributes } from "react";

type IconifyIconAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  icon?: string;
  inline?: boolean;
  width?: string | number;
  height?: string | number;
  rotate?: string | number;
  flip?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "iconify-icon": IconifyIconAttributes;
    }
  }
}
