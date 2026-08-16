import { NextPage } from "next";
import type { ReactElement } from "react";

export type pageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
	layout?: LayoutProps
};

export type LayoutProps = ({
	children,
}: {
	children: ReactElement
}) => ReactElement

export type LayoutComponent = NextPage & {
	Layout: LayoutProps
}
