import { useEffect, useState } from "react";
import { api, maskAadhar } from "../api";

export default function VerifiedVoters() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecords() {
      try {
        const response = await api.get("/api/verified-voters");
        setRecords(response.data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to fetch clean verified voters.");
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, []);

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-header">
          <h2>Clean Verified Voters</h2>
        </div>

        {error && <div className="message error">{error}</div>}
        {loading ? (
          <div className="empty-state">Loading clean verified voters...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Source Voter ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>DOB</th>
                  <th>Gender</th>
                  <th>Location</th>
                  <th>Aadhaar</th>
                  <th>Reviewed At</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.source_voter_id}>
                    <td>{record.source_voter_id}</td>
                    <td>{record.Name}</td>
                    <td>{record.Age}</td>
                    <td>{record.DOB}</td>
                    <td>{record.Gender}</td>
                    <td>{record.City}, {record.State}</td>
                    <td>{maskAadhar(record.Aadhar)}</td>
                    <td>{record.reviewed_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.length && <div className="empty-state small">No clean verified records found.</div>}
          </div>
        )}
      </section>
    </div>
  );
}
