import { useEffect, useState } from "react";
import { getStatusHistory } from "../services/memberApi";

function StatusHistory({ subtaskId }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getStatusHistory(subtaskId);
        setHistory(data);
      } catch (error) {
        console.error("Error fetching status history:", error);
      }
    };

    fetchHistory();
  }, [subtaskId]);

  if (history.length === 0) {
    return <p className="text-sm text-slate-500">No status history found.</p>;
  }

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-slate-800">Status History</h4>

      {history.map((item, index) => (
        <div key={index} className="rounded-lg border bg-white p-3">
          <p className="text-sm font-semibold text-blue-600">
            {item.update_date}
          </p>
          <p className="mt-1 text-sm text-slate-700">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
export default StatusHistory;