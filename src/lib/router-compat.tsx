"use client";

import React, { useMemo, useCallback } from "react";
import NextLink from "next/link";
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from "next/navigation";

export function useNavigate() {
  const router = useNextRouter();

  return useCallback(
    (to: string | number, options?: { replace?: boolean }) => {
      if (typeof to === "number") {
        if (to < 0) {
          router.back();
        } else {
          router.forward();
        }
        return;
      }

      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    },
    [router]
  );
}

export function useParams<T extends Record<string, string | string[] | undefined> = Record<string, string>>(): T {
  const params = useNextParams() || {};
  const rawId = (params.id || params.assessmentId || params.applicationId || params.jobId) as string | undefined;

  const merged = {
    ...params,
    ...(rawId ? { id: rawId, assessmentId: rawId, applicationId: rawId, jobId: rawId } : {})
  };

  return merged as unknown as T;
}

export function useSearchParams(): [
  URLSearchParams,
  (nextInit: any, navigateOptions?: { replace?: boolean }) => void
] {
  const router = useNextRouter();
  const pathname = useNextPathname();
  const searchParams = useNextSearchParams();

  const currentParams = useMemo(() => {
    return new URLSearchParams(searchParams?.toString() || "");
  }, [searchParams]);

  const setSearchParams = useCallback(
    (nextInit: any, navigateOptions?: { replace?: boolean }) => {
      const newSearchParams = new URLSearchParams(
        typeof nextInit === "function" ? nextInit(currentParams) : nextInit
      );
      const queryStr = newSearchParams.toString();
      const url = queryStr ? `${pathname}?${queryStr}` : pathname;
      if (navigateOptions?.replace) {
        router.replace(url);
      } else {
        router.push(url);
      }
    },
    [router, pathname, currentParams]
  );

  return [currentParams, setSearchParams];
}

export function useLocation() {
  const pathname = useNextPathname();
  const searchParams = useNextSearchParams();

  const search = useMemo(() => {
    const s = searchParams?.toString();
    return s ? `?${s}` : "";
  }, [searchParams]);

  return {
    pathname: pathname || "/",
    search,
    hash: typeof window !== "undefined" ? window.location.hash : "",
    state: null,
  };
}

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
  children?: React.ReactNode;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, children, className, ...props }, ref) => {
    return (
      <NextLink ref={ref} href={to || "#"} className={className} {...props}>
        {children}
      </NextLink>
    );
  }
);

Link.displayName = "Link";
