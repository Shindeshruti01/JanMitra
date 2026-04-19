import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, maskAadhar } from "../api";

const INITIAL_DUPLICATE_COUNT = 3;
const INITIAL_SUSPICIOUS_COUNT = 3;

function RecordField({ label, value, strong = false }) {
  return (
    <span className="review-field">
      <span className="review-field-label">{label}</span>
      <span className={strong ? "review-field-value strong" : "review-field-value"}>
        {value || "-"}
      </span>
    </span>
  );
}

function ClusterCard({ group, clusterId, index, selectedRecord, onSelect, resolved, onResolve, saving }) {
  const recordCount = group.length;

  return (
    <article className="review-card review-card-warning">
      <div className="review-card-header">
        <div>
          <h3>Similar Records Cluster {index + 1}</h3>
        </div>
        <span className={`badge ${resolved ? "success" : "warning"}`}>
          {resolved ? "Verified" : "Pending"}
        </span>
      </div>

      <div className="review-record-list">
        <div className="review-record-header">
          <span></span>
          <span>Voter ID</span>
          <span>Name</span>
          <span>Gender</span>
          <span>Location</span>
          <span>Aadhaar</span>
        </div>
        {group.map((person, personIndex) => {
          const recordKey = `${clusterId}-${personIndex}`;
          const checked = selectedRecord?.recordKey === recordKey;

          return (
            <div key={recordKey} className={`review-record-card ${checked ? "selected" : ""}`}>
              <label className="review-record-row selectable">
                <input
                  type="radio"
                  name={`cluster-${index}`}
                  checked={checked}
                  onChange={() => onSelect({ recordKey, voterId: person.Voter_ID })}
                />
                <strong>{person.Voter_ID}</strong>
                <span>{person.Name}</span>
                <span>{person.Gender}</span>
                <span>{person.City}, {person.State}</span>
                <span>{maskAadhar(person.Aadhar)}</span>
              </label>
            </div>
          );
        })}
      </div>

      {!resolved && (
        <div className="button-row">
          <button
            className="primary-button"
            onClick={onResolve}
            disabled={!selectedRecord?.voterId || saving}
          >
            {saving ? "Saving..." : "Save selected clean record"}
          </button>
        </div>
      )}
    </article>
  );
}

function SuspiciousCard({ row, resolved, expanded, onVerifyToggle, onApprove, onReject, saving }) {
  return (
    <article className="review-card review-card-danger">
      <div className="review-card-header">
        <div>
          <h3>{row.Name} <span className="review-inline-id">({row.Voter_ID})</span></h3>
          <p>{row.City}, {row.State}</p>
        </div>
        <span className={`badge ${resolved ? "success" : "danger"}`}>
          {resolved ? "Reviewed" : "Suspicious"}
        </span>
      </div>

      <div className="review-flag-detail">
        <span className="review-label">Reason for Flag</span>
        <p>{(row.Reasons || []).join(" | ")}</p>
      </div>

      <div className="review-reason-block">
        <span className="review-label">Suggested Action</span>
        <p className="review-action-copy">{row.SuggestedAction || "Review the voter record manually."}</p>
      </div>

      {expanded ? (
        <div className="review-suspicious-grid">
          <RecordField label="Voter ID" value={row.Voter_ID} strong />
          <RecordField label="Name" value={row.Name} />
          <RecordField label="Age" value={row.Age} />
          <RecordField label="Gender" value={row.Gender} />
          <RecordField label="DOB" value={row.DOB} />
          <RecordField label="Aadhaar" value={maskAadhar(row.Aadhar)} />
          <RecordField label="City" value={row.City} />
          <RecordField label="State" value={row.State} />
          <RecordField label="Address" value={row.Address} />
          <RecordField label="Status" value={row.Status} />
        </div>
      ) : null}

      <div className="review-reason-block">
        <span className="review-label">Suspicious Entry Reasons</span>
        <ul className="review-reason-list">
          {(row.Reasons || []).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      {!resolved && (
        <div className="button-row">
          <button className="primary-button" onClick={onApprove} disabled={saving}>
            {saving ? "Saving..." : "Approve"}
          </button>
          <button className="outline-button small-button" onClick={onReject}>
            Reject
          </button>
          <button className="secondary-button" onClick={onVerifyToggle}>
            {expanded ? "Back" : "Verify"}
          </button>
        </div>
      )}
    </article>
  );
}

export default function AIFlagReview() {
  const [searchParams] = useSearchParams();
  const targetRef = useRef(null);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [suspiciousRows, setSuspiciousRows] = useState([]);
  const [visibleDuplicateCount, setVisibleDuplicateCount] = useState(INITIAL_DUPLICATE_COUNT);
  const [visibleSuspiciousCount, setVisibleSuspiciousCount] = useState(INITIAL_SUSPICIOUS_COUNT);
  const [resolvedIds, setResolvedIds] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState({});
  const [expandedSuspiciousIds, setExpandedSuspiciousIds] = useState([]);
  const [savingClusterId, setSavingClusterId] = useState("");
  const [savingSuspiciousId, setSavingSuspiciousId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const targetVoterId = String(searchParams.get("voterId") || "");

  useEffect(() => {
    async function loadFlags() {
      try {
        const [duplicateRes, fakeRes] = await Promise.all([
          api.get("/api/duplicates"),
          api.get("/api/fake"),
        ]);

        setDuplicateGroups(duplicateRes.data);
        setSuspiciousRows(fakeRes.data.filter((row) => row.Status === "Suspicious"));
        setVisibleDuplicateCount(INITIAL_DUPLICATE_COUNT);
        setVisibleSuspiciousCount(INITIAL_SUSPICIOUS_COUNT);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load AI flags.");
      } finally {
        setLoading(false);
      }
    }

    loadFlags();
  }, []);

  useEffect(() => {
    if (!targetVoterId || loading) {
      return;
    }

    const suspiciousId = `suspicious-${targetVoterId}`;
    const matchingSuspicious = suspiciousRows.some((row) => String(row.Voter_ID) === targetVoterId);
    if (matchingSuspicious) {
      setExpandedSuspiciousIds((current) =>
        current.includes(suspiciousId) ? current : [...current, suspiciousId]
      );
      setVisibleSuspiciousCount((current) => Math.max(current, suspiciousRows.length));
      return;
    }

    const clusterIndex = duplicateGroups.findIndex((group) =>
      group.some((person) => String(person.Voter_ID) === targetVoterId)
    );

    if (clusterIndex >= 0) {
      setVisibleDuplicateCount((current) => Math.max(current, clusterIndex + 1));
    }
  }, [targetVoterId, loading, suspiciousRows, duplicateGroups]);

  useEffect(() => {
    if (!targetVoterId || loading) {
      return;
    }

    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [targetVoterId, loading, visibleDuplicateCount, visibleSuspiciousCount, suspiciousRows, duplicateGroups]);

  const handleSaveVerifiedRecord = async (clusterId) => {
    const selectedRecord = selectedRecords[clusterId];
    if (!selectedRecord?.voterId) return;

    setError("");
    setSuccess("");
    setSavingClusterId(clusterId);

    try {
      const group = duplicateGroups[Number(clusterId.replace("duplicate-", "")) - 1] || [];
      const response = await api.post("/api/duplicates/verify", {
        voter_id: selectedRecord.voterId,
        remove_voter_ids: group.map((person) => person.Voter_ID),
      });
      setDuplicateGroups((current) =>
        current.filter((_, index) => `duplicate-${index + 1}` !== clusterId)
      );
      setSelectedRecords((current) => {
        const next = { ...current };
        delete next[clusterId];
        return next;
      });
      setSuccess(response.data.message);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to save verified voter.");
    } finally {
      setSavingClusterId("");
    }
  };

  const toggleExpandedSuspicious = (id) => {
    setExpandedSuspiciousIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleApproveSuspicious = async (row) => {
    const id = `suspicious-${row.Voter_ID}`;
    setError("");
    setSuccess("");
    setSavingSuspiciousId(id);

    try {
      const response = await api.post("/api/fake/verify", { voter_id: row.Voter_ID });
      setSuspiciousRows((current) =>
        current.filter((item) => String(item.Voter_ID) !== String(row.Voter_ID))
      );
      setExpandedSuspiciousIds((current) => current.filter((item) => item !== id));
      setSuccess(response.data.message);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to save suspicious record.");
    } finally {
      setSavingSuspiciousId("");
    }
  };

  const handleRejectSuspicious = async (row) => {
    const id = `suspicious-${row.Voter_ID}`;
    setError("");
    setSuccess("");
    setSavingSuspiciousId(id);

    try {
      const response = await api.post("/api/fake/reject", {
        voter_id: row.Voter_ID,
        reason: (row.Reasons || []).join(", ") || "Rejected during suspicious record review.",
      });
      setSuspiciousRows((current) =>
        current.filter((item) => String(item.Voter_ID) !== String(row.Voter_ID))
      );
      setExpandedSuspiciousIds((current) => current.filter((item) => item !== id));
      setSuccess(response.data.message);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to reject suspicious record.");
    } finally {
      setSavingSuspiciousId("");
    }
  };

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-header">
          <h2>AI Flag Review Panel</h2>
        </div>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}
        {loading && <div className="empty-state">Loading flags...</div>}

        {!loading && (
          <div className="review-board">
            <section className="review-section">
              <div className="review-section-header">
                <div className="review-title-group">
                  <h3>Clusters of Similar Records</h3>
                  <span className="badge warning">{duplicateGroups.length}</span>
                </div>
              </div>

              {duplicateGroups.length ? (
                <div className="review-card-list">
                  {duplicateGroups.slice(0, visibleDuplicateCount).map((group, index) => {
                    const id = `duplicate-${index + 1}`;
                    const hasTarget = group.some((person) => String(person.Voter_ID) === targetVoterId);

                    return (
                      <div key={id} ref={hasTarget ? targetRef : null}>
                        <ClusterCard
                          group={group}
                          clusterId={id}
                          index={index}
                          selectedRecord={selectedRecords[id]}
                          onSelect={(record) =>
                            setSelectedRecords((current) => ({ ...current, [id]: record }))
                          }
                          resolved={resolvedIds.includes(id)}
                          saving={savingClusterId === id}
                          onResolve={() => handleSaveVerifiedRecord(id)}
                        />
                      </div>
                    );
                  })}

                  {visibleDuplicateCount < duplicateGroups.length ? (
                    <button
                      className="secondary-button review-more-button"
                      onClick={() =>
                        setVisibleDuplicateCount((current) =>
                          Math.min(current + INITIAL_DUPLICATE_COUNT, duplicateGroups.length)
                        )
                      }
                    >
                      Show more duplicate clusters
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="empty-state small">No duplicate clusters found.</div>
              )}
            </section>

            <section className="review-section">
              <div className="review-section-header">
                <div className="review-title-group">
                  <h3>Suspicious Entries</h3>
                  <span className="badge danger">{suspiciousRows.length}</span>
                </div>
              </div>

              {suspiciousRows.length ? (
                <div className="review-card-list">
                  {suspiciousRows.slice(0, visibleSuspiciousCount).map((row) => {
                    const id = `suspicious-${row.Voter_ID}`;
                    const isTarget = String(row.Voter_ID) === targetVoterId;

                    return (
                      <div key={id} ref={isTarget ? targetRef : null}>
                        <SuspiciousCard
                          row={row}
                          resolved={resolvedIds.includes(id)}
                          expanded={expandedSuspiciousIds.includes(id)}
                          saving={savingSuspiciousId === id}
                          onVerifyToggle={() => toggleExpandedSuspicious(id)}
                          onApprove={() => handleApproveSuspicious(row)}
                          onReject={() => handleRejectSuspicious(row)}
                        />
                      </div>
                    );
                  })}

                  {visibleSuspiciousCount < suspiciousRows.length ? (
                    <button
                      className="secondary-button review-more-button"
                      onClick={() =>
                        setVisibleSuspiciousCount((current) =>
                          Math.min(current + INITIAL_SUSPICIOUS_COUNT, suspiciousRows.length)
                        )
                      }
                    >
                      Show more suspicious records
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="empty-state small">No suspicious entries found.</div>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
