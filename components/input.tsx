import React from "react";
import { UseFormRegister, useFormContext } from "react-hook-form";

type Props = {
	register?: UseFormRegister<any>;
	placeholder?: string;
	label?: string;
	append?: string;
	prepend?: string;
	disabled?: boolean;
	classoverride?: string;
	textarea?: boolean | false
	id?: string;
	type?: string | "text";
	value?: string
};

const Input = React.forwardRef<
	HTMLInputElement | HTMLTextAreaElement,
	Props & ReturnType<UseFormRegister<any>>
>(({ placeholder, label, classoverride, id, onChange, onBlur, name, type, textarea, append, prepend, disabled, value }, ref) => {
	const { formState: { errors } } = useFormContext();
	return (
		<div className="mb-3">
			{label &&
				<label htmlFor={id} className="text-gray-500 text-sm dark:text-gray-200">
					{label}
				</label>
			}
			{!textarea ? <div className="flex flex-wrap items-stretch w-full mb-0 relative">
				{prepend && (
					<div className="flex -ml-px">
						<span className="flex items-center leading-normal bg-grey-lighter rounded-lg rounded-r-none border-2 border-r-0 border-grey-light px-3 whitespace-no-wrap text-grey-dark text-sm">{prepend}</span>
					</div>
				)}
				<input
					id={id}
					placeholder={placeholder}
					disabled={disabled}
					type={type}
					onChange={onChange}
					onBlur={onBlur}
					name={name}
					value={value}
					ref={(ref as any)}
					className={
						`text-gray-600 dark:text-white flex-1 rounded-lg p-2 border-2 border-gray-300  dark:border-gray-500 w-full  bg-gray-50 disabled:bg-gray-200 focus-visible:outline-none dark:bg-gray-700 ${prepend ? 'rounded-l-none' : 'rounded-l-lg'} ${append ? 'rounded-r-none' : 'rounded-r-lg'} ` + classoverride + ` block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-primary focus:border-primary transition`
					}
				/>
				{append && (
					<div className="flex -mr-px">
						<span className="flex items-center leading-normal bg-grey-lighter rounded-lg rounded-l-none border-2 border-l-0 border-grey-light px-3 whitespace-no-wrap text-grey-dark dark:text-white text-sm">{append}</span>
					</div>
				)}
			</div> : <textarea
				id={id}
				placeholder={placeholder}
				onChange={onChange}
				onBlur={onBlur}
				name={name}
				ref={(ref as any)}
				value={value}
				className={
					"text-gray-600 dark:text-white rounded-lg p-2 border-2 border-gray-300  dark:border-gray-500 w-full bg-gray-50 focus-visible:outline-none dark:bg-gray-700 " + classoverride + `${errors[name] ? " focus-visible:ring-red-500 focus-visible:border-red-500" : "focus-visible:ring-blue-500 focus-visible:border-blue-500"}`
				}
			/>}
			{errors[name] && (
				<p className="text-red-500 block h-10 -mb-7 mt-1">{(errors[name]?.message as string)}</p>
			)}
		</div>
	)
});

Input.displayName = "Input";

export default Input;
