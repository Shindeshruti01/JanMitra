import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, maskAadhar } from "../api";

function normalizeAddressKey(voter) {
  return [
    String(voter.State || "").trim().toLowerCase(),
    String(voter.City || "").trim().toLowerCase(),
    String(voter.Address || "").trim().toLowerCase(),
  ].join("|");
}

function normalizeSearchValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function matchesVoterSearch(voter, searchText) {
  const rawTerm = String(searchText || "").trim().toLowerCase();
  const normalizedTerm = normalizeSearchValue(searchText);

  if (!rawTerm && !normalizedTerm) {
    return true;
  }

  const nameValue = String(voter.Name || "").toLowerCase().trim();
  const voterIdValue = String(voter.Voter_ID || "").toLowerCase().trim();
  const aadharValue = String(voter.Aadhar || "").toLowerCase().trim();

  const normalizedName = normalizeSearchValue(nameValue);
  const normalizedVoterId = normalizeSearchValue(voterIdValue);
  const normalizedAadhar = normalizeSearchValue(aadharValue);

  return (
    nameValue.includes(rawTerm) ||
    voterIdValue.includes(rawTerm) ||
    aadharValue.includes(rawTerm) ||
    normalizedName.includes(normalizedTerm) ||
    normalizedVoterId.includes(normalizedTerm) ||
    normalizedAadhar.includes(normalizedTerm)
  );
}

export default function VoterDatabase() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [voters, setVoters] = useState([]);
  const [verifiedRecords, setVerifiedRecords] = useState([]);
  const [visibleRows, setVisibleRows] = useState([]);
  const [verifiedState, setVerifiedState] = useState({
    verifiedIds: new Set(),
    verifiedAadhars: new Set(),
  });
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingVoterId, setSavingVoterId] = useState("");
  const [riskState, setRiskState] = useState({
    duplicateIds: new Set(),
    suspiciousIds: new Set(),
    anomalyAddresses: new Set(),
  });

  const statusFilter = searchParams.get("status") || "all";

  useEffect(() => {
    async function loadData() {
      try {
        const [votersRes, duplicatesRes, fakeRes, anomalyRes, verifiedRes] = await Promise.all([
          api.get("/api/voters"),
          api.get("/api/duplicates"),
          api.get("/api/fake"),
          api.get("/api/address-anomaly"),
          api.get("/api/verified-voters"),
        ]);

        const duplicateIds = new Set(
          duplicatesRes.data.flatMap((group) => group.map((person) => String(person.Voter_ID)))
        );
        const suspiciousIds = new Set(
          fakeRes.data
            .filter((row) => row.Status === "Suspicious")
            .map((row) => String(row.Voter_ID))
        );
        const anomalyAddresses = new Set(
          anomalyRes.data.map((row) => String(row.address_key || ""))
        );
        const verifiedIds = new Set(
          verifiedRes.data.map((row) => String(row.source_voter_id || ""))
        );
        const verifiedAadhars = new Set(
          verifiedRes.data
            .map((row) => String(row.Aadhar || "").trim().toLowerCase())
            .filter(Boolean)
        );

        setVoters(votersRes.data);
        setVerifiedRecords(verifiedRes.data);
        setRiskState({ duplicateIds, suspiciousIds, anomalyAddresses });
        setVerifiedState({ verifiedIds, verifiedAadhars });
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to fetch voters.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const refreshVoters = async () => {
    const [votersRes, duplicatesRes, fakeRes, anomalyRes, verifiedRes] = await Promise.all([
      api.get("/api/voters"),
      api.get("/api/duplicates"),
      api.get("/api/fake"),
      api.get("/api/address-anomaly"),
      api.get("/api/verified-voters"),
    ]);

    const duplicateIds = new Set(
      duplicatesRes.data.flatMap((group) => group.map((person) => String(person.Voter_ID)))
    );
    const suspiciousIds = new Set(
      fakeRes.data
        .filter((row) => row.Status === "Suspicious")
        .map((row) => String(row.Voter_ID))
    );
    const anomalyAddresses = new Set(
      anomalyRes.data.map((row) => String(row.address_key || ""))
    );
    const verifiedIds = new Set(
      verifiedRes.data.map((row) => String(row.source_voter_id || ""))
    );
    const verifiedAadhars = new Set(
      verifiedRes.data
        .map((row) => String(row.Aadhar || "").trim().toLowerCase())
        .filter(Boolean)
    );

    setVoters(votersRes.data);
    setVerifiedRecords(verifiedRes.data);
    setRiskState({ duplicateIds, suspiciousIds, anomalyAddresses });
    setVerifiedState({ verifiedIds, verifiedAadhars });

    if (selectedVoter) {
      const verifiedLikeRows = verifiedRes.data.map((record) => ({
        Voter_ID: record.source_voter_id,
        Name: record.Name,
        Age: record.Age,
        DOB: record.DOB,
        Gender: record.Gender,
        City: record.City,
        State: record.State,
        Address: record.Address,
        Aadhar: record.Aadhar,
        status: "Registered",
        rowType: "registered",
      }));
      const updated = [...votersRes.data, ...verifiedLikeRows].find(
        (voter) => String(voter.Voter_ID) === String(selectedVoter.Voter_ID)
      );
      setSelectedVoter(updated || null);
    }
  };

  const isSuspiciousVoter = (voter) => {
    const voterId = String(voter.Voter_ID);
    return (
      riskState.duplicateIds.has(voterId) ||
      riskState.suspiciousIds.has(voterId) ||
      riskState.anomalyAddresses.has(normalizeAddressKey(voter))
    );
  };

  const isAlreadyVerified = (voter) => {
    const voterId = String(voter.Voter_ID || "");
    const aadhar = String(voter.Aadhar || "").trim().toLowerCase();

    return (
      verifiedState.verifiedIds.has(voterId) ||
      (aadhar && verifiedState.verifiedAadhars.has(aadhar))
    );
  };

  const handleApprove = async (voterId) => {
    setError("");
    setSuccess("");
    setSavingVoterId(String(voterId));

    try {
      const response = await api.post(`/api/voters/${voterId}/register-clean`);
      setSuccess(response.data.message);
      await refreshVoters();
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to register voter.");
    } finally {
      setSavingVoterId("");
    }
  };

  const openSuspiciousReview = (voterId) => {
    navigate(`/admin/flags?voterId=${encodeURIComponent(voterId)}`);
  };
  const tableRows = useMemo(() => {
    const pending = voters
      .filter((voter) => !isAlreadyVerified(voter))
      .map((voter) => ({
        ...voter,
        displayStatus: "pending",
        rowType: "pending",
        suspicious: isSuspiciousVoter(voter),
      }));

    const registered = verifiedRecords.map((record) => ({
      Voter_ID: record.source_voter_id,
      Name: record.Name,
      Age: record.Age,
      DOB: record.DOB,
      Gender: record.Gender,
      City: record.City,
      State: record.State,
      Address: record.Address,
      Aadhar: record.Aadhar,
      status: "Registered",
      displayStatus: "registered",
      rowType: "registered",
      suspicious: false,
    }));

    return { pending, registered };
  }, [voters, verifiedRecords, riskState, verifiedState]);

  useEffect(() => {
    const sourceRows =
      statusFilter === "registered"
        ? tableRows.registered
        : statusFilter === "pending"
          ? tableRows.pending
          : [...tableRows.pending, ...tableRows.registered];

    const nextRows = sourceRows
      .filter((voter) => matchesVoterSearch(voter, search))
      .sort((left, right) => {
        const rawTerm = String(search || "").trim().toLowerCase();
        const leftName = String(left.Name || "").toLowerCase().trim();
        const rightName = String(right.Name || "").toLowerCase().trim();
        const leftId = Number(left.Voter_ID) || 0;
        const rightId = Number(right.Voter_ID) || 0;

        if (!rawTerm) {
          if (statusFilter === "all" && left.displayStatus !== right.displayStatus) {
            return left.displayStatus === "pending" ? -1 : 1;
          }

          return rightId - leftId;
        }

        const leftRank = rawTerm && leftName.startsWith(rawTerm) ? 0 : 1;
        const rightRank = rawTerm && rightName.startsWith(rawTerm) ? 0 : 1;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        if (statusFilter === "all" && left.displayStatus !== right.displayStatus) {
          return left.displayStatus === "pending" ? -1 : 1;
        }

        return rightId - leftId;
      });

    setVisibleRows(nextRows);
  }, [search, statusFilter, tableRows]);

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-header split">
          <div>
            <h2>Voter Database</h2>
          </div>
          <div className="voter-toolbar">
            <select
              className="status-filter"
              value={statusFilter}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue === "all") {
                  setSearchParams({});
                } else {
                  setSearchParams({ status: nextValue });
                }
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="registered">Registered</option>
            </select>
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by voter ID, name, or Aadhaar"
            />
          </div>
        </div>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}
        {loading ? (
          <div className="empty-state">Loading voters...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Voter ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Location</th>
                  <th>Aadhaar</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody key={`${statusFilter}-${search}-${visibleRows.length}`}>
                {visibleRows.map((voter, index) => {
                  const suspicious = voter.rowType === "pending" && voter.suspicious;
                  const alreadyVerified = voter.displayStatus === "registered";
                  const isRegistered = voter.displayStatus === "registered";
                  const rowKey = [
                    voter.rowType,
                    voter.Voter_ID,
                    voter.Name,
                    voter.Aadhar,
                    index,
                  ].join("-");

                  return (
                    <tr key={rowKey} onClick={() => setSelectedVoter(voter)}>
                      <td>{voter.Voter_ID}</td>
                      <td>{voter.Name}</td>
                      <td>{voter.Age}</td>
                      <td>{voter.City}, {voter.State}</td>
                      <td>{maskAadhar(voter.Aadhar)}</td>
                      <td>
                        {alreadyVerified ? (
                          <span className="badge success">Verified</span>
                        ) : suspicious ? (
                          <button
                            type="button"
                            className="badge danger clickable-badge"
                            onClick={(event) => {
                              event.stopPropagation();
                              openSuspiciousReview(voter.Voter_ID);
                            }}
                          >
                            Suspicious
                          </button>
                        ) : (
                          <span className={`badge ${isRegistered ? "success" : "warning"}`}>
                            {voter.status || "Pending"}
                          </span>
                        )}
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        {alreadyVerified ? (
                          <span className="table-action-text">Already Accepted</span>
                        ) : suspicious ? (
                          <button
                            type="button"
                            className="table-action-link"
                            onClick={() => openSuspiciousReview(voter.Voter_ID)}
                          >
                            Suspicious
                          </button>
                        ) : isRegistered ? (
                          <span className="table-action-text">Approved</span>
                        ) : (
                          <button
                            className="primary-button small-button"
                            onClick={() => handleApprove(voter.Voter_ID)}
                            disabled={savingVoterId === String(voter.Voter_ID)}
                          >
                            {savingVoterId === String(voter.Voter_ID) ? "Saving..." : "Register"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!visibleRows.length && <div className="empty-state small">No matching voters found.</div>}
          </div>
        )}
      </section>

      {selectedVoter && (
        <section className="card">
          <div className="card-header split">
            <h3>Selected voter details</h3>
            <button className="secondary-button" onClick={() => setSelectedVoter(null)}>
              Close
            </button>
          </div>
          <div className="detail-grid">
            <div><span>Voter ID</span><strong>{selectedVoter.Voter_ID}</strong></div>
            <div><span>Name</span><strong>{selectedVoter.Name}</strong></div>
            <div><span>Date of Birth</span><strong>{selectedVoter.DOB}</strong></div>
            <div><span>Gender</span><strong>{selectedVoter.Gender}</strong></div>
            <div><span>City</span><strong>{selectedVoter.City}</strong></div>
            <div><span>State</span><strong>{selectedVoter.State}</strong></div>
            <div>
              <span>Status</span>
              <strong>
                {isAlreadyVerified(selectedVoter)
                  ? "Verified"
                  : isSuspiciousVoter(selectedVoter)
                    ? "Suspicious"
                    : (selectedVoter.status || "Pending")}
              </strong>
            </div>
            <div className="full"><span>Address</span><strong>{selectedVoter.Address}</strong></div>
          </div>
        </section>
      )}
    </div>
  );
}
