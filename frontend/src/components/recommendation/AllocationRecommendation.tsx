import React from "react";
import type { AllocationRecommendationType } from "../../types";

interface Props {
  recommendation: AllocationRecommendationType;
  onApprove?: () => void;
  onReject?: () => void;
}

const AllocationRecommendation: React.FC<Props> = ({
  recommendation,
  onApprove,
  onReject,
}) => {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold">{recommendation.location}</h3>
      <p className="text-gray-600 mt-2">{recommendation.reason}</p>
      <div className="mt-4">
        <p>Required Resources:</p>
        <ul className="list-disc pl-5">
          <li>Food Kits: {recommendation.foodKits}</li>
          <li>Medical Kits: {recommendation.medicalKits}</li>
          <li>Rescue Boats: {recommendation.rescueBoats}</li>
          <li>Blankets: {recommendation.blankets}</li>
        </ul>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onApprove}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Approve
        </button>
        <button
          onClick={onReject}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default AllocationRecommendation;
