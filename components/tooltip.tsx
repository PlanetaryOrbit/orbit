import React, { FC, ReactNode } from "react";
import { workspacestate } from "@/state";
import { useRecoilState } from "recoil";

type Props = {
	children?: ReactNode;
	orientation: "right" | "top" | "bottom" | "left";
	tooltipText?: string;
};

const Tooltip: FC<Props> = ({ children, orientation, tooltipText }: Props) => {
	const tipRef = React.createRef<HTMLDivElement>();

	function handleMouseEnter() {
		tipRef.current!.style.opacity = '1';
	}

	function handleMouseLeave() {
		tipRef.current!.style.opacity = '0';
	}

	const setContainerPosition = (orientation: string) => {
		switch (orientation) {
			case "right":
				return "top-0 left-full ml-4";
			case "left":
				return "top-0 right-full mr-4";
			case "top":
				return "bottom-full left-[50%] translate-x-[-50%] -translate-y-2";
			case "bottom":
				return "top-full left-[50%] translate-x-[-50%] translate-y-2";
			default:
				return "";
		}
	};

	const setPointerPosition = (orientation: string) => {
		switch (orientation) {
			case "right":
				return "left-[-6px]";
			case "left":
				return "right-[-6px]";
			case "top":
				return "top-full left-[50%] translate-x-[-50%] -translate-y-2";
			case "bottom":
				return "bottom-full left-[50%] translate-x-[-50%] translate-y-2";
			default:
				return "";
		}
	};

	const containerClasses = `w-max absolute z-50 ${setContainerPosition(
		orientation
	)} bg-[rgb(var(--group-theme))] text-white text-sm px-3 py-2 rounded-xl flex items-center transition-all duration-150 pointer-events-none`;

	const pointerClasses = `bg-[rgb(var(--group-theme))] h-3 w-3 absolute z-10 ${setPointerPosition(
		orientation
	)} rotate-45 pointer-events-none`;

	return (
		<div className="relative flex items-center" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
			<div className={containerClasses} style={{ opacity: 0 }} ref={tipRef}>
				<div className={pointerClasses} />
				{tooltipText}
			</div>
			{children}
		</div>
	);
};

export default Tooltip;
