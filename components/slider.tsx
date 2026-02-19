import React, { FC, Children, ReactNode, useState, useRef, useEffect } from "react";

type Props = {
	children: ReactNode;
	activeSlide: number;
};


const Slider: FC<Props> = ({ children, activeSlide }: Props) => {
	const elementsRef = useRef(new Array(Children.count(children)))
	const [sliderHeight, setSliderHeight] = useState('');

	useEffect(() => {
		const nextHeights = `height-[${elementsRef.current[activeSlide].clientHeight}px]`;
		setSliderHeight(nextHeights);
	  }, [elementsRef.current, activeSlide]);	

	return (
		<div
			className={`flex items-start overflow-clip w-11/12 sm:w-4/6 md:3/6 xl:w-5/12 mx-auto my-auto`}
		>
			<div
				className={`flex items-start transition w-full h-auto translate-x-[calc(var(--active)*-100%)] duration-700`}
				style={{ "--active": activeSlide } as React.CSSProperties}
			>
				{Children.map(children, (child, index) => {
					return (
						<div key={index} className="w-full my-auto bg-white dark:bg-zinc-800 dark:bg-opacity-50 dark:backdrop-blur-lg shrink-0 p-6 rounded-3xl " id={index.toString()} ref={el => { elementsRef.current[index] = el; }}						>
							{child}
						</div>
					);
				})}
			</div>
		</div>
	);
};



export default Slider
