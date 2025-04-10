import React from "react";
import { FC } from '@/types/settingsComponent'
import moment from "moment";
import { IconCheck, IconX, IconClock } from "@tabler/icons";

interface Props {
	notices: any[];
}

const Notices: FC<Props> = ({ notices }) => {
	const getStatusIcon = (notice: any) => {
	  if (notice.approved) return <IconCheck className="w-5 h-5 text-green-500" />;
	  if (notice.reviewed) return <IconX className="w-5 h-5 text-red-500" />;
	  return <IconClock className="w-5 h-5 text-yellow-500" />;
	};
  
	const getStatusText = (notice: any) => {
	  if (notice.approved) return "Approved";
	  if (notice.reviewed) return "Declined";
	  return "Under Review";
	};
  
	return (
	  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
		<div className="p-6">
		  <h2 className="text-lg font-medium text-gray-900 mb-4">Inactivity Notices</h2>
		  {notices.length === 0 ? (
			<p className="text-sm text-gray-500 italic">No inactivity notices found.</p>
		  ) : (
			<div className="space-y-4">
			  {notices.map((notice: any) => (
				<div key={notice.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
				  <div className="flex-shrink-0">
					{getStatusIcon(notice)}
				  </div>
				  <div className="flex-grow">
					<div className="flex items-center justify-between mb-1">
					  <div className="flex items-center gap-2">
						<span className={`text-sm font-medium ${
						  notice.approved ? "text-green-600" : 
						  notice.reviewed ? "text-red-600" : 
						  "text-yellow-600"
						}`}>
						  {getStatusText(notice)}
						</span>
						<span className="text-xs text-gray-500">
						  {moment(notice.startTime).format("DD MMM")} - {moment(notice.endTime).format("DD MMM YYYY")}
						</span>
					  </div>
					</div>
					<p className="text-sm text-gray-600">{notice.reason}</p>
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
