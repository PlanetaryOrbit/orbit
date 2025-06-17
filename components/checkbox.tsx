import { HTMLProps, useEffect, useRef } from "react";

type Props = {
	indeterminate?: boolean;
}

const Checkbox = ({ indeterminate, className = "", ...rest }: Props & HTMLProps<HTMLInputElement>) => {
	const ref = useRef<HTMLInputElement>(null!);

	useEffect(() => {
		if (typeof indeterminate === "boolean") {
			ref.current.indeterminate = !rest.checked && indeterminate
		}
	}, [ref, indeterminate]);

	return (
		<input
			type="checkbox"
			ref={ref}
			className={className + " w-4 h-4 text-primary bg-gray-100 rounded border-gray-300 focus:ring-primary cursor-pointer"}
			{...rest}
		/>
	)
}

export default Checkbox;
