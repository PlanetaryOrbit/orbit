import React, { FC, Children, ReactNode, useRef } from "react";
import { motion } from "framer-motion";

type Props = {
	children: ReactNode;
	activeSlide: number;
};

const Slider: FC<Props> = ({ children, activeSlide }: Props) => {
	const elementsRef = useRef<(HTMLDivElement | null)[]>([]);
	const count = Children.count(children);

	return (
		<div className="relative w-full overflow-hidden">
			<motion.div
				className="flex items-stretch shrink-0"
				style={{
					width: `${count * 100}%`,
					minWidth: `${count * 100}%`,
				}}
				animate={{ x: `${(-activeSlide * 100) / count}%` }}
				transition={{
					type: "spring",
					stiffness: 400,
					damping: 35,
					mass: 0.8,
				}}
			>
				{Children.map(children, (child, index) => {
					return (
						<div
							key={index}
							className="shrink-0 p-8 rounded-2xl bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-700/50 shadow-xl shadow-zinc-900/5 dark:shadow-black/20 box-border"
							id={index.toString()}
							ref={el => { elementsRef.current[index] = el; }}
							style={{ width: `${100 / count}%`, minWidth: `${100 / count}%` }}
						>
							{child}
						</div>
					);
				})}
			</motion.div>
		</div>
	);
};



export default Slider
