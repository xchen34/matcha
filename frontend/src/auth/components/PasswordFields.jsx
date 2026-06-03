import { PasswordInput } from "@/utils/components";

const labelClass = "text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold";

export default function PasswordFields({
	firstLabel,
	firstName,
	firstValue,
	firstPlaceholder,
	secondLabel,
	secondName,
	secondValue,
	secondPlaceholder,
	onChange,
	className,
	mismatchMessage = "Passwords do not match",
}) {
	return (
		<div className="space-y-1">
			<label className={labelClass}>{firstLabel}</label>
			<span className="text-primary-dark ml-1">*</span>

			<PasswordInput
				name={firstName}
				value={firstValue}
				onChange={onChange}
				placeholder={firstPlaceholder}
				className={className}
				required
			/>

			<label className={labelClass}>{secondLabel}</label>
	        <span className="text-primary-dark ml-1">*</span>

			<PasswordInput
				name={secondName}
				value={secondValue}
				onChange={onChange}
				placeholder={secondPlaceholder}
				className={className}
				required
			/>

			{secondValue && firstValue !== secondValue && (
				<p className="text-xs text-red-500">{mismatchMessage}</p>
			)}
		</div>
	);
}
