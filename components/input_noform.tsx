import React, { FC } from "react";

type Props = {
	placeholder?: string;
	label?: string;
	append?: string;
	prepend?: string;
	disabled?: boolean;
	maxLength?: number;
	classoverride?: string;
	textarea?: boolean | false
	id?: string;
	type?: string | "text";
	onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	name?: string;
	value?: any

};

const Input: FC<Props> = ({ placeholder, label, classoverride, id, onChange, onBlur, name, value, type, textarea, append, prepend, disabled, maxLength }) => {
	return (
		<div className="mb-3">
			{label &&
				<label htmlFor={id} className="text-zinc-500 text-sm dark:text-zinc-200">
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
					value={value}
					disabled={disabled}
					type={type}
					maxLength={maxLength}
					onChange={onChange}
					onBlur={onBlur}
					name={name}
					className={
						`text-zinc-600 dark:text-white flex-1 rounded-lg p-2 border-2 border-gray-300  dark:border-zinc-500 w-full  bg-zinc-50 disabled:bg-zinc-200 focus-visible:outline-none dark:bg-zinc-700 ${prepend ? 'rounded-l-none' : 'rounded-l-lg'} ${append ? 'rounded-r-none' : 'rounded-r-lg'} ` + classoverride
					}
				/>
			</div> : <textarea
				id={id}
				placeholder={placeholder}
				maxLength={maxLength}
				onChange={onChange || undefined}
				onBlur={onBlur || undefined}
				value={value}
				name={name}
				className={
					"text-zinc-600 dark:text-white rounded-lg p-2 border-2 border-gray-300  dark:border-zinc-500 w-full bg-zinc-50 focus-visible:outline-none dark:bg-zinc-700 " + classoverride 
				}
			/>}
		</div>
	)
};

Input.displayName = "Input";

export default Input;
