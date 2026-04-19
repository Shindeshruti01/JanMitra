import { useEffect, useMemo, useState } from "react";
import { api, maskAadhar } from "../api";

function getAuditStatus(voterCount) {
  if (voterCount > 10) return { label: "Abnormal", tone: "danger" };
  if (voterCount > 6) return { label: "Elevated", tone: "warning" };
  return { label: "Normal", tone: "success" };
}

export default function AddressAudit() {
  const [voters, setVoters] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [savingVoterId, setSavingVoterId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVoters();
  }, []);

  async function loadVoters() {
    try {
      const response = await api.get("/api/voters");
      setVoters(response.data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to fetch address audit data.");
    } finally {
      setLoading(false);
    }
  }

  const handleVerifyRecord = async (voterId) => {
    setError("");
    setSuccess("");
    setSavingVoterId(String(voterId));

    try {
      const response = await api.post(`/api/voters/${voterId}/verify-and-remove`);
      setSuccess(response.data.message);
      setVoters((current) => current.filter((voter) => String(voter.Voter_ID) !== String(voterId)));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to save verified voter.");
    } finally {
      setSavingVoterId("");
    }
  };

  const handleRejectRecord = async (voterId) => {
    setError("");
    setSuccess("");
    setSavingVoterId(String(voterId));

    try {
      const response = await api.delete(`/api/voters/${voterId}`);
      setSuccess(response.data.message);
      setVoters((current) => current.filter((voter) => String(voter.Voter_ID) !== String(voterId)));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to delete voter.");
    } finally {
      setSavingVoterId("");
    }
  };

  const groupedRows = useMemo(() => {
    return Object.values(
      voters.reduce((summary, voter) => {
        const key = `${voter.Address}||${voter.City}||${voter.State}`;

        if (!summary[key]) {
          summary[key] = {
            key,
            address: voter.Address,
            city: voter.City,
            state: voter.State,
            voterCount: 0,
            records: [],
          };
        }

        summary[key].voterCount += 1;
        summary[key].records.push(voter);
        return summary;
      }, {})
    )
      .map((row) => ({
        ...row,
        ...getAuditStatus(row.voterCount),
      }))
      .sort((a, b) => b.voterCount - a.voterCount);
  }, [voters]);

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-header">
          <h2>Address-Wise Voter Audit</h2>
          <p>Expand any address row to view full voter records linked to that location.</p>
        </div>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}
        {loading ? (
          <div className="empty-state">Loading address audit...</div>
        ) : groupedRows.length ? (
          <div className="address-audit-table">
            <div className="address-audit-header">
              <span></span>
              <span>Address</span>
              <span>Voters</span>
              <span>Status</span>
            </div>

            {groupedRows.map((row) => (
              <div key={row.key} className={`address-audit-group ${expanded === row.key ? "expanded" : ""}`}>
                <button
                  type="button"
                  className={`address-audit-row ${row.tone}`}
                  onClick={() => setExpanded(expanded === row.key ? null : row.key)}
                >
                  <span className="address-audit-toggle">{expanded === row.key ? "⌄" : "›"}</span>
                  <span>{row.address}, {row.city}</span>
                  <span><strong>{row.voterCount}</strong></span>
                  <span>
                    <span className={`badge ${row.tone}`}>{row.label}</span>
                  </span>
                </button>

                {expanded === row.key && (
                  <div className="address-audit-expanded">
                    <p className="address-audit-expanded-title">Registered Voters at this Address:</p>
                    <div className="address-record-list">
                      {row.records.map((record) => (
                        <div key={record.Voter_ID} className="address-record-line">
                          <strong>{record.Voter_ID}</strong>
                          <span>{record.Name}</span>
                          <span>Age {record.Age}</span>
                          <span>{record.Gender}</span>
                          <span>{maskAadhar(record.Aadhar)}</span>
                          <span>{record.City}, {record.State}</span>
                          <span>{record.status || "Pending"}</span>
                          <div className="address-record-actions">
                            <button
                              type="button"
                              className="primary-button small-button"
                              onClick={() => handleVerifyRecord(record.Voter_ID)}
                              disabled={savingVoterId === String(record.Voter_ID)}
                            >
                              {savingVoterId === String(record.Voter_ID) ? "Wait..." : "Verify"}
                            </button>
                            <button
                              type="button"
                              className="outline-button small-button"
                              onClick={() => handleRejectRecord(record.Voter_ID)}
                              disabled={savingVoterId === String(record.Voter_ID)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No address audit records found.</div>
        )}
      </section>
    </div>
  );
}
