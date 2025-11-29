import React, { FC, useState, useRef, useEffect } from "react";
import { motion } from 'framer-motion';
import { IconX, IconCheck, IconClock, IconFileText, IconExternalLink } from "@tabler/icons-react";
import axios from "axios";
import toast from "react-hot-toast";

interface PolicyDocument {
	id: string;
	name: string;
	content: any;
	acknowledgmentDeadline?: Date | string | null;
	acknowledgmentMethod?: 'signature' | 'checkbox' | 'type_username' | 'type_word' | string | null;
	acknowledgmentWord?: string | null;
	isTrainingDocument: boolean;
}

interface PolicyAcknowledgmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	document: PolicyDocument;
	workspaceId: string;
	onAcknowledged: () => void;
	initialExternalDocVisited?: boolean;
	currentUsername?: string;
}

const PolicyAcknowledgmentModal: FC<PolicyAcknowledgmentModalProps> = ({
	isOpen,
	onClose,
	document,
	workspaceId,
	onAcknowledged,
	initialExternalDocVisited = false,
	currentUsername
}) => {
	const [signature, setSignature] = useState<string>('');
	const [isSliderCompleted, setIsSliderCompleted] = useState(false);
	const [isAcknowledging, setIsAcknowledging] = useState(false);
	const [typedWord, setTypedWord] = useState('');
	const [hasVisitedExternalDoc, setHasVisitedExternalDoc] = useState(initialExternalDocVisited);
	const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);

	if (!isOpen) return null;

	const isExternalDocument = document.content && typeof document.content === 'object' && document.content.external;

	const getAcknowledmentMethod = () => document.acknowledgmentMethod || 'signature';

	const getIsAcknowledgmentComplete = () => {
		const method = getAcknowledmentMethod();
		switch (method) {
			case 'signature':
				return signature.trim().length > 0;
			case 'type_username':
				return signature.trim().length > 0 && currentUsername &&
					   signature.trim().toLowerCase() === currentUsername.toLowerCase();
			case 'type_word':
				return typedWord.trim().toLowerCase() === (document.acknowledgmentWord || '').toLowerCase();
			case 'checkbox':
			default:
				return true; // For checkbox mode, no additional validation needed
		}
	};

	const validateAcknowledgment = () => {
		if (isExternalDocument && !hasVisitedExternalDoc) {
			toast.error('Please visit the external document before acknowledging');
			return false;
		}

		const method = getAcknowledmentMethod();
		switch (method) {
			case 'signature':
				if (!signature.trim()) {
					toast.error('Please provide your digital signature');
					return false;
				}
				break;
			case 'type_username':
				if (!signature.trim()) {
					toast.error('Please provide your username');
					return false;
				}
				if (!currentUsername) {
					toast.error('Unable to verify username. Please try again.');
					return false;
				}
				if (signature.trim().toLowerCase() !== currentUsername.toLowerCase()) {
					toast.error('Please enter your correct username exactly as it appears in your account');
					return false;
				}
				break;
			case 'type_word':
				if (!typedWord.trim()) {
					toast.error('Please type the required word to acknowledge');
					return false;
				}
				if (typedWord.trim().toLowerCase() !== (document.acknowledgmentWord || '').toLowerCase()) {
					toast.error('Please type the correct word to acknowledge');
					return false;
				}
				break;
			case 'checkbox':
				// Checkbox mode has no additional validation
				break;
		}
		return true;
	};

	const handleAcknowledge = async () => {
		if (!validateAcknowledgment()) {
			return;
		}

		setIsAcknowledging(true);
		try {
			const method = getAcknowledmentMethod();
			const acknowledgmentData: any = {
				acknowledgmentMethod: method,
				ipAddress: 'client-provided'
			};

			// Add method-specific data
			switch (method) {
				case 'signature':
				case 'type_username':
					acknowledgmentData.signature = signature;
					break;
				case 'type_word':
					acknowledgmentData.signature = `Word acknowledgment: "${typedWord}" at ${new Date().toISOString()}`;
					break;
				case 'checkbox':
					acknowledgmentData.signature = `Checkbox acknowledgment at ${new Date().toISOString()}`;
					break;
			}

			await axios.post(`/api/workspace/${workspaceId}/policies/${document.id}/acknowledge`, acknowledgmentData);

			toast.success('Policy acknowledged successfully');
			onAcknowledged();
			onClose();
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Failed to acknowledge policy');
		} finally {
			setIsAcknowledging(false);
		}
	};

	// Canvas drawing functions for signature pad
	const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
		setIsDrawing(true);
		const canvas = signatureCanvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		ctx.beginPath();
		ctx.moveTo(x, y);
	};

	const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;

		const canvas = signatureCanvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		ctx.lineTo(x, y);
		ctx.stroke();
	};

	const stopDrawing = () => {
		setIsDrawing(false);
		// Convert canvas to signature text
		const canvas = signatureCanvasRef.current;
		if (canvas) {
			// Check if anything was actually drawn on the canvas
			const ctx = canvas.getContext('2d');
			if (ctx) {
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const hasDrawing = imageData.data.some((pixel, index) => {
					// Check alpha channel (every 4th value) - if any pixel is not transparent, there's a drawing
					return index % 4 === 3 && pixel > 0;
				});

				if (hasDrawing) {
					setSignature(`Digital signature captured at ${new Date().toISOString()}`);
				}
			}
		}
	};

	const clearCanvas = () => {
		const canvas = signatureCanvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setSignature('');
	};


	const handleExternalDocClick = (url: string) => {
		setHasVisitedExternalDoc(true);
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	const renderAcknowledgmentInput = () => {
		const method = getAcknowledmentMethod();

		switch (method) {
			case 'signature':
				return (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
								Digital Signature
							</label>
							<div className="space-y-3">
								<div className="border border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden">
									<canvas
										ref={signatureCanvasRef}
										width={400}
										height={100}
										className="w-full cursor-crosshair bg-white dark:bg-zinc-800"
										onMouseDown={startDrawing}
										onMouseMove={draw}
										onMouseUp={stopDrawing}
										onMouseLeave={stopDrawing}
									/>
								</div>
								<div className="flex items-center justify-between">
									<p className="text-xs text-zinc-500 dark:text-zinc-400">
										Draw your signature above
									</p>
									<button
										onClick={clearCanvas}
										className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
									>
										Clear
									</button>
								</div>
							</div>
						</div>
					</div>
				);

			case 'type_username':
				return (
					<div>
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							Username
						</label>
						<input
							type="text"
							placeholder="Type your username"
							value={signature}
							onChange={(e) => setSignature(e.target.value)}
							className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
						/>
						<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
							Please enter your username exactly as it appears in your account
						</p>
					</div>
				);

			case 'type_word':
				return (
					<div>
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							Type Required Word
						</label>
						<input
							type="text"
							placeholder="Type the required word to acknowledge"
							value={typedWord}
							onChange={(e) => setTypedWord(e.target.value)}
							className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
						/>
						<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
							Please type the required word from the policy to acknowledge
						</p>
					</div>
				);

			case 'checkbox':
			default:
				return (
					<div>
						<p className="text-sm text-zinc-600 dark:text-zinc-400">
							Please confirm your acknowledgment using the checkboxes above.
						</p>
					</div>
				);
		}
	};

	const isOverdue = document.acknowledgmentDeadline &&
		new Date() > new Date(document.acknowledgmentDeadline);

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
			<motion.div
				initial={{ opacity: 0, scale: 0.98 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.18 }}
				className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
			>
				{/* Header */}
				<div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
								<IconFileText className="w-5 h-5 text-primary" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
									Policy Acknowledgment Required
								</h2>
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									{document.isTrainingDocument ? 'Training Document' : 'Policy Document'}
								</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
						>
							<IconX className="w-5 h-5" />
						</button>
					</div>

					{document.acknowledgmentDeadline && (
						<div className={`mt-3 p-3 rounded-lg flex items-center space-x-2 ${
							isOverdue
								? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
								: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
						}`}>
							<IconClock className="w-4 h-4" />
							<span className="text-sm font-medium">
								{isOverdue
									? `Overdue - Deadline was ${new Date(document.acknowledgmentDeadline).toLocaleDateString()}`
									: `Deadline: ${new Date(document.acknowledgmentDeadline).toLocaleDateString()}`
								}
							</span>
						</div>
					)}
				</div>

				{/* Document Content */}
				<div className="px-6 py-4 max-h-80 overflow-y-auto">
					<h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
						{document.name}
					</h3>

					<div className="prose prose-sm dark:prose-invert max-w-none">
						{document.content && typeof document.content === 'object' && document.content.external ? (
							<div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
								<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
									This policy links to an external document:
								</p>
								<button
									onClick={() => handleExternalDocClick(document.content.url)}
									className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
								>
									<IconExternalLink className="w-4 h-4" />
									<span>Open External Document</span>
								</button>
								{hasVisitedExternalDoc && (
									<div className="flex items-center space-x-2 mt-3">
										<IconCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
										<span className="text-sm text-green-600 dark:text-green-400">
											External document visited
										</span>
									</div>
								)}
								<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
									You must visit the external document before you can acknowledge this policy.
								</p>
							</div>
						) : (
							<div className="text-zinc-700 dark:text-zinc-300">
								{/* Render document content - simplified version */}
								<p>Please read the full policy document carefully before acknowledging.</p>
								{document.content && (
									<div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
										<div className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100 font-sans leading-relaxed">
											{typeof document.content === 'string'
												? document.content
												: JSON.stringify(document.content, null, 2)
											}
										</div>
									</div>
								)}
							</div>
						)}
					</div>

				</div>

				{/* Acknowledgment Method Section */}
				<div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700">
					<div className="space-y-4">
						{renderAcknowledgmentInput()}

						{/* Action Buttons */}
						<div className="flex items-center justify-end space-x-3 pt-4">
							<button
								onClick={onClose}
								className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleAcknowledge}
								disabled={isAcknowledging || (isExternalDocument && !hasVisitedExternalDoc) || !getIsAcknowledgmentComplete()}
								className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isAcknowledging ? (
									<>
										<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
										Acknowledging...
									</>
								) : (
									<>
										<IconCheck className="w-4 h-4 mr-2" />
										Acknowledge Policy
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
};

export default PolicyAcknowledgmentModal;