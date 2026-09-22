import { useEffect, useState } from "react";
import { getMyReports } from "../services/postService";
import "../styles/MyReports.css";

function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      const data = await getMyReports();
      setReports(data || []);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="my-reports-container">
        <div className="my-reports-card">
          <p>Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-reports-container">
      <div className="my-reports-card">
        <h1>My Reports 🚩</h1>

        <p className="my-reports-description">
          Track the reports you have submitted.
        </p>

        {reports.length === 0 ? (
          <div className="no-reports">
            <h3>No reports yet</h3>
            <p>You have not reported any posts.</p>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => (
              <div className="my-report-card" key={report.id}>
                <h3>Report #{report.id}</h3>

                <p>
                  <strong>Post:</strong>{" "}
                  {report.post?.content || "Post unavailable"}
                </p>

                <p>
                  <strong>Reason:</strong> {report.reason}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`report-status ${report.status.toLowerCase()}`}
                  >
                    {report.status}
                  </span>
                </p>

                {report.response && (
                  <div className="manager-response">
                    <strong>Content Manager Response:</strong>

                    <p>{report.response}</p>
                  </div>
                )}

                {!report.response && report.status === "PENDING" && (
                  <p className="waiting-message">
                    Your report is waiting for review.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyReports;
