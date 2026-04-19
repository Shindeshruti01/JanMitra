import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const INSIGHT_PAGE_SIZE = 5;

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 18.5c0-2.5 3.2-4.5 7-4.5s7 2 7 4.5v.5H4v-.5Zm12.4.5c-.1-1.1-.6-2.1-1.5-2.9 2.2.2 4.1 1.3 4.1 2.9h-2.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M7 3h7l5 5v13H7V3Zm7 1.5V9h4.5L14 4.5ZM9 12h6v1.5H9V12Zm0 3h6v1.5H9V15Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M12 3 5 6v5c0 4.7 2.8 8.9 7 10 4.2-1.1 7-5.3 7-10V6l-7-3Zm0 2.1 5 2.1v3.8c0 3.7-2.1 7-5 8.1-2.9-1.1-5-4.4-5-8.1V7.2l5-2.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M12 4 3.5 19h17L12 4Zm0 4.2 4.1 9H7.9l4.1-9Zm-.8 2.3v3.8h1.6v-3.8h-1.6Zm0 5.1v1.6h1.6v-1.6h-1.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DashboardStat({ icon, value, label, tone, active, onClick }) {
  return (
    <button
      type="button"
      className={`dashboard-stat-card dashboard-stat-button${active ? " active" : ""}`}
      onClick={onClick}
    >
      <div className={`dashboard-stat-icon ${tone}`}>{icon}</div>
      <div>
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </button>
  );
}

function BarChartCard({ title, items }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <article className="dashboard-panel">
      <div className="dashboard-panel-header">
        <h3>{title}</h3>
      </div>
      <div className="bar-chart">
        <div className="bar-chart-grid" />
        <div className="bar-chart-bars">
          {items.map((item) => (
            <div key={item.label} className="bar-chart-item">
              <div
                className="bar-chart-bar"
                style={{ height: `${Math.max(14, (item.value / maxValue) * 100)}%` }}
                title={`${item.label}: ${item.value}`}
              />
              <span className="bar-chart-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function DonutChartCard({ title, items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let start = 0;
  const gradientStops = items
    .map((item) => {
      const slice = (item.value / total) * 100;
      const segment = `${item.color} ${start}% ${start + slice}%`;
      start += slice;
      return segment;
    })
    .join(", ");

  return (
    <article className="dashboard-panel">
      <div className="dashboard-panel-header">
        <h3>{title}</h3>
      </div>
      <div className="donut-panel-body">
        <div className="donut-chart" style={{ background: `conic-gradient(${gradientStops})` }}>
          <div className="donut-hole">
            <strong>{total}</strong>
            <span>Total</span>
          </div>
        </div>
        <div className="donut-legend">
          {items.map((item) => (
            <div key={item.label} className="donut-legend-item">
              <span className="donut-color" style={{ background: item.color }} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function InsightTable({ columns, rows, emptyMessage }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={row.key || `${row.id || "row"}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {typeof column.render === "function" ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty-state small">{emptyMessage}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function getAddressStatus(voterCount) {
  if (voterCount > 10) return { label: "Abnormal", tone: "danger" };
  if (voterCount > 6) return { label: "Elevated", tone: "warning" };
  return { label: "Normal", tone: "success" };
}

function normalizeAddressKey(voter) {
  return [
    String(voter.State || "").trim().toLowerCase(),
    String(voter.City || "").trim().toLowerCase(),
    String(voter.Address || "").trim().toLowerCase(),
  ].join("|");
}

export default function AdminDashboard() {
  const [activeInsight, setActiveInsight] = useState(null);
  const [visibleInsightRows, setVisibleInsightRows] = useState(INSIGHT_PAGE_SIZE);
  const [data, setData] = useState({
    voters: [],
    verifiedVoters: [],
    duplicates: [],
    suspicious: [],
    anomalies: [],
    loading: true,
    error: "",
    lastUpdated: null,
  });
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [savingApplicationId, setSavingApplicationId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [votersRes, verifiedRes, duplicatesRes, fakeRes, anomalyRes] = await Promise.all([
          api.get("/api/voters"),
          api.get("/api/verified-voters"),
          api.get("/api/duplicates"),
          api.get("/api/fake"),
          api.get("/api/address-anomaly"),
        ]);

        if (cancelled) return;

        setData({
          voters: votersRes.data,
          verifiedVoters: verifiedRes.data,
          duplicates: duplicatesRes.data,
          suspicious: fakeRes.data.filter((row) => row.Status === "Suspicious"),
          anomalies: anomalyRes.data,
          loading: false,
          error: "",
          lastUpdated: new Date(),
        });
      } catch (error) {
        if (cancelled) return;

        setData((current) => ({
          ...current,
          loading: false,
          error: error.response?.data?.message || "Unable to load dashboard data.",
        }));
      }
    }

    loadDashboard();
    const intervalId = setInterval(loadDashboard, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const refreshDashboard = async () => {
    const [votersRes, verifiedRes, duplicatesRes, fakeRes, anomalyRes] = await Promise.all([
      api.get("/api/voters"),
      api.get("/api/verified-voters"),
      api.get("/api/duplicates"),
      api.get("/api/fake"),
      api.get("/api/address-anomaly"),
    ]);

    setData({
      voters: votersRes.data,
      verifiedVoters: verifiedRes.data,
      duplicates: duplicatesRes.data,
      suspicious: fakeRes.data.filter((row) => row.Status === "Suspicious"),
      anomalies: anomalyRes.data,
      loading: false,
      error: "",
      lastUpdated: new Date(),
    });
  };

  const handleAcceptApplication = async (voterId) => {
    setActionError("");
    setActionSuccess("");
    setSavingApplicationId(String(voterId));

    try {
      const response = await api.post(`/api/voters/${voterId}/register-clean`);
      setActionSuccess(response.data.message);
      await refreshDashboard();
    } catch (error) {
      setActionError(error.response?.data?.message || "Unable to accept application.");
    } finally {
      setSavingApplicationId("");
    }
  };

  const registeredVoters = useMemo(() => data.verifiedVoters, [data.verifiedVoters]);

  const verifiedIds = useMemo(
    () => new Set(data.verifiedVoters.map((row) => String(row.source_voter_id || ""))),
    [data.verifiedVoters]
  );

  const verifiedAadhars = useMemo(
    () =>
      new Set(
        data.verifiedVoters
          .map((row) => String(row.Aadhar || "").trim().toLowerCase())
          .filter(Boolean)
      ),
    [data.verifiedVoters]
  );

  const duplicateIds = useMemo(
    () => new Set(data.duplicates.flatMap((group) => group.map((row) => String(row.Voter_ID)))),
    [data.duplicates]
  );

  const suspiciousIds = useMemo(
    () => new Set(data.suspicious.map((row) => String(row.Voter_ID))),
    [data.suspicious]
  );

  const anomalyAddresses = useMemo(
    () => new Set(data.anomalies.map((row) => String(row.address_key || ""))),
    [data.anomalies]
  );

  const pendingVoters = useMemo(
    () =>
      data.voters.filter((voter) => {
        const voterId = String(voter.Voter_ID || "");
        const aadhar = String(voter.Aadhar || "").trim().toLowerCase();
        return !verifiedIds.has(voterId) && (!aadhar || !verifiedAadhars.has(aadhar));
      }),
    [data.voters, verifiedAadhars, verifiedIds]
  );

  const isSuspiciousApplication = (voter) => {
    const voterId = String(voter.Voter_ID || "");
    return (
      duplicateIds.has(voterId) ||
      suspiciousIds.has(voterId) ||
      anomalyAddresses.has(normalizeAddressKey(voter))
    );
  };

  if (data.loading) {
    return <div className="empty-state">Loading dashboard...</div>;
  }

  if (data.error) {
    return <div className="message error">{data.error}</div>;
  }

  const districtSummary = Object.entries(
    data.voters.reduce((summary, voter) => {
      const district = voter.City || "Unknown";
      summary[district] = (summary[district] || 0) + 1;
      return summary;
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const addressDensity = Object.values(
    data.voters.reduce((summary, voter) => {
      const key = `${voter.Address}||${voter.City}||${voter.State}`;

      if (!summary[key]) {
        summary[key] = {
          key,
          address: voter.Address,
          city: voter.City,
          state: voter.State,
          voterCount: 0,
        };
      }

      summary[key].voterCount += 1;
      return summary;
    }, {})
  )
    .map((item) => ({
      ...item,
      ...getAddressStatus(item.voterCount),
    }))
    .sort((a, b) => b.voterCount - a.voterCount)
    .slice(0, 4);

  const pendingCount = pendingVoters.length;
  const registeredCount = registeredVoters.length;

  const donutItems = [
    { label: "Ghost Voters", value: data.suspicious.length, color: "#ef4444" },
    { label: "Duplicate Aadhaar", value: data.duplicates.length, color: "#fb923c" },
    { label: "Deceased on Roll", value: data.anomalies.length, color: "#1d2a90" },
    { label: "Age Mismatch", value: pendingCount, color: "#fbbf24" },
  ];

  const insightConfig = {
    registered: {
      title: "Registered Voters List",
      description: "Showing voters whose status is marked as registered.",
      columns: [
        { key: "source_voter_id", label: "Voter ID" },
        { key: "Name", label: "Name" },
        { key: "Age", label: "Age" },
        { key: "location", label: "Location", render: (row) => `${row.City}, ${row.State}` },
        {
          key: "status",
          label: "Status",
          render: () => <span className="badge success">Registered</span>,
        },
      ],
      rows: registeredVoters,
      emptyMessage: "No clean verified voters found.",
    },
    applications: {
      title: "New Applications",
      description: "Showing voters who are not registered in the clean verified dataset yet.",
      columns: [
        { key: "Voter_ID", label: "Voter ID" },
        { key: "Name", label: "Name" },
        { key: "DOB", label: "DOB" },
        { key: "location", label: "Location", render: (row) => `${row.City}, ${row.State}` },
        {
          key: "status",
          label: "Status",
          render: (row) =>
            isSuspiciousApplication(row) ? (
              <span className="badge danger">Suspicious</span>
            ) : (
              <span className="badge warning">New</span>
            ),
        },
        {
          key: "action",
          label: "Action",
          render: (row) => (
            isSuspiciousApplication(row) ? (
              <span className="table-action-text">Review in flag pages</span>
            ) : (
              <button
                className="primary-button small-button"
                onClick={() => handleAcceptApplication(row.Voter_ID)}
                disabled={savingApplicationId === String(row.Voter_ID)}
              >
                {savingApplicationId === String(row.Voter_ID) ? "Saving..." : "Accept"}
              </button>
            )
          ),
        },
      ],
      rows: pendingVoters,
      emptyMessage: "No new applications found.",
    },
    verification: {
      title: "Under Verification",
      description: "Showing address entries currently under review.",
      columns: [
        { key: "address", label: "Address", render: (row) => `${row.address}, ${row.city}` },
        { key: "voterCount", label: "Voters", render: (row) => <strong>{row.voterCount}</strong> },
        {
          key: "status",
          label: "Status",
          render: (row) => <span className={`badge ${row.tone}`}>{row.label}</span>,
        },
      ],
      rows: addressDensity,
      emptyMessage: "No verification records found.",
    },
    flagged: {
      title: "AI-Flagged Records",
      description: "Showing suspicious records detected by the review pipeline.",
      columns: [
        { key: "Voter_ID", label: "Voter ID" },
        { key: "Name", label: "Name" },
        {
          key: "reason",
          label: "Reason",
          render: (row) => ((row.Reasons || []).join(", ") || "Suspicious entry"),
        },
        { key: "location", label: "Location", render: (row) => `${row.City}, ${row.State}` },
      ],
      rows: data.suspicious,
      emptyMessage: "No AI-flagged records found.",
    },
  };

  const selectedInsight = activeInsight ? insightConfig[activeInsight] : null;
  const visibleRows = selectedInsight ? selectedInsight.rows.slice(0, visibleInsightRows) : [];

  const lastUpdatedText = data.lastUpdated
    ? data.lastUpdated.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Just now";

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Monitoring voter verification, application review, and AI-assisted alerts.</p>
        </div>
        <div className="auto-refresh-badge">
          <strong>Auto refresh</strong>
          <span>Every 10 min | Last update {lastUpdatedText}</span>
        </div>
      </div>

      <section className="admin-kpi-grid">
        <DashboardStat
          icon={<PeopleIcon />}
          value={registeredCount.toLocaleString()}
          label="Total Registered Voters"
          tone="blue"
          active={activeInsight === "registered"}
          onClick={() => {
            setActiveInsight("registered");
            setVisibleInsightRows(INSIGHT_PAGE_SIZE);
          }}
        />
        <DashboardStat
          icon={<DocumentIcon />}
          value={pendingCount}
          label="New Applications"
          tone="sky"
          active={activeInsight === "applications"}
          onClick={() => {
            setActiveInsight("applications");
            setVisibleInsightRows(INSIGHT_PAGE_SIZE);
          }}
        />
        <DashboardStat
          icon={<ShieldIcon />}
          value={data.anomalies.length}
          label="Under Verification"
          tone="amber"
          active={activeInsight === "verification"}
          onClick={() => {
            setActiveInsight("verification");
            setVisibleInsightRows(INSIGHT_PAGE_SIZE);
          }}
        />
        <DashboardStat
          icon={<AlertIcon />}
          value={data.suspicious.length}
          label="AI-Flagged Records"
          tone="red"
          active={activeInsight === "flagged"}
          onClick={() => {
            setActiveInsight("flagged");
            setVisibleInsightRows(INSIGHT_PAGE_SIZE);
          }}
        />
      </section>

      {selectedInsight && (
        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>{selectedInsight.title}</h3>
              <p className="table-note">{selectedInsight.description}</p>
            </div>
            <button
              className="secondary-button"
              onClick={() => {
                setActiveInsight(null);
                setVisibleInsightRows(INSIGHT_PAGE_SIZE);
              }}
            >
              Close
            </button>
          </div>
          {actionError && <div className="message error">{actionError}</div>}
          {actionSuccess && <div className="message success">{actionSuccess}</div>}
          <InsightTable
            columns={selectedInsight.columns}
            rows={visibleRows}
            emptyMessage={selectedInsight.emptyMessage}
          />
          {selectedInsight.rows.length > INSIGHT_PAGE_SIZE && (
            <div className="button-row">
              <button
                className="secondary-button review-more-button"
                onClick={() =>
                  setVisibleInsightRows((current) =>
                    Math.min(current + INSIGHT_PAGE_SIZE, selectedInsight.rows.length)
                  )
                }
                disabled={visibleRows.length >= selectedInsight.rows.length}
              >
                {visibleRows.length >= selectedInsight.rows.length ? "All records shown" : "Show more"}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="admin-chart-grid">
        <BarChartCard title="Duplicate Voter Entries by District" items={districtSummary} />
        <DonutChartCard title="Fake Entries Detected" items={donutItems} />
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <h3>Address-Wise Voter Density</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>Voters</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {addressDensity.map((item) => (
                <tr key={`${item.address}-${item.city}-${item.state}`}>
                  <td>{item.address}, {item.city}</td>
                  <td><strong>{item.voterCount}</strong></td>
                  <td>
                    <span className={`badge ${item.tone}`}>{item.label}</span>
                  </td>
                </tr>
              ))}
              {!addressDensity.length && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state small">No address density data available.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
