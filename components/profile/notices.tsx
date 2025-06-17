import React from "react";
import { FC } from '@/types/settingsComponent'
import moment from "moment";
import { IconCheck, IconX, IconClock } from "@tabler/icons";

interface Props {
	notices: any[];
}

const Notices: FC<Props> = ({ notices }) => {
	const getStatusIcon = (notice: any) => {
	  if (notice.approved) return <IconCheck className="w-5 h-5 text-green-500 dark:text-green-400" />;
	  if (notice.reviewed) return <IconX className="w-5 h-5 text-red-500 dark:text-red-400" />;
	  if (notice.revoked) return <IconX className="w-5 h-5 text-red-500 dark:text-red-400" />;
	  return <IconClock className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />;
	};
  
	const getStatusText = (notice: any) => {
	  if (notice.approved) return "Approved";
	  if (notice.revoked) return "Revoked";
	  if (notice.reviewed) return "Declined";
	  return "Under Review";
	};
  
	return (
	  <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden">
		<div className="p-6">
		  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Inactivity Notices</h2>
		  {notices.length === 0 ? (
			<p className="text-sm text-gray-500 dark:text-gray-400 italic">No inactivity notices found.</p>
		  ) : (
			<div className="space-y-4">
			  {notices.map((notice: any) => (
				<div key={notice.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
				  <div className="flex-shrink-0">
					{getStatusIcon(notice)}
				  </div>
				  <div className="flex-grow">
					<div className="flex items-center justify-between mb-1">
					  <span className={`text-sm font-medium ${
						  notice.approved ? "text-green-600 dark:text-green-400" : 
						  notice.reviewed ? "text-red-600 dark:text-red-400" : 
						  "text-yellow-600 dark:text-yellow-400"
						}`}>
						  {getStatusText(notice)}
					  </span>
					  <span className="text-xs text-gray-500 dark:text-gray-300">
						{moment(notice.startTime).format("DD MMM YYYY")} - {moment(notice.endTime).format("DD MMM YYYY")}
					  </span>
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-300">{notice.reason}</p>
				  </div>
				</div>
			  ))}
			</div>
		  )}
		</div>
	  </div>
	);
};
export default Notices;
