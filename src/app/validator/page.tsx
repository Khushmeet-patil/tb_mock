'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

interface SampleEntry {
  id: string;
  nameOfSTP: string;
  patientName: string;
  nikshayId: string;
  tuberculosisUnit: string;
  sampleFrom: string;
  typology: string;
  testType: string;
  sampleType: string;
  collectionSite: string;
  collectionDate: string;
  collectionTime: string;
  signOfChoNtep: string;
  submissionSite: string;
  submissionDate: string;
  submissionTime: string;
  labNo: string;
  signOfLt: string;
  daysDifference: number;
  timeDifferenceHours: number;
  tatStatus: 'Within TAT' | 'TAT Exceeded';
  status: 'Pending' | 'Approved' | 'Rejected';
  validatorNotes?: string;
  validatedAt?: string;
  createdAt: string;
}

export default function ValidatorPanel() {
  const [samples, setSamples] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stpFilter, setStpFilter] = useState('All');
  const [tatFilter, setTatFilter] = useState('All');

  // Inspection Modal state
  const [selectedSample, setSelectedSample] = useState<SampleEntry | null>(null);
  const [validatorNotes, setValidatorNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch samples from backend API
  const fetchSamples = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/samples');
      if (response.ok) {
        const data = await response.json();
        setSamples(data.samples || []);
      }
    } catch (error) {
      console.error('Error fetching samples:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  // Compute KPI Statistics
  const totalCount = samples.length;
  const pendingCount = samples.filter((s) => s.status === 'Pending').length;
  const approvedCount = samples.filter((s) => s.status === 'Approved').length;
  const rejectedCount = samples.filter((s) => s.status === 'Rejected').length;
  
  const complianceCount = samples.filter((s) => s.tatStatus === 'Within TAT').length;
  const tatComplianceRate = totalCount > 0 
    ? Math.round((complianceCount / totalCount) * 100) 
    : 100;

  // Handle Quick Validation status update
  const handleQuickStatusUpdate = async (id: string, newStatus: 'Approved' | 'Rejected', notes: string = '') => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/samples/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, validatorNotes: notes }),
      });

      if (response.ok) {
        const updated = await response.json();
        // Update local list state
        setSamples((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updated.sample } : s))
        );
        setSelectedSample(null);
        setValidatorNotes('');
      } else {
        const err = await response.json();
        alert(`Error: ${err.message || 'Failed to update sample status'}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Network error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Samples on frontend
  const filteredSamples = samples.filter((sample) => {
    const matchesSearch = 
      sample.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.nikshayId.includes(searchTerm) ||
      sample.labNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || sample.status === statusFilter;
    const matchesSTP = stpFilter === 'All' || sample.nameOfSTP === stpFilter;
    const matchesTAT = tatFilter === 'All' || sample.tatStatus === tatFilter;

    return matchesSearch && matchesStatus && matchesSTP && matchesTAT;
  });

  // Handle CSV Export for PowerBI sync simulation
  const exportToCSV = () => {
    if (filteredSamples.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = [
      'Sample ID', 'Name of STP', 'Patient Name', 'Nikshay ID', 'Tuberculosis Unit',
      'Sample From', 'Typology', 'Test Type', 'Sample Type', 'Collection Site',
      'Collection Date', 'Collection Time', 'Sign of CHO/NTEP', 'Submission Site',
      'Submission Date', 'Submission Time', 'Lab No.', 'Sign of LT', 'Days Difference',
      'Time Difference (H)', 'TAT Status', 'Validation Status', 'Validator Notes', 'Validated At'
    ];

    const csvRows = [headers.join(',')];

    for (const sample of filteredSamples) {
      const rowValues = [
        sample.id,
        `"${sample.nameOfSTP.replace(/"/g, '""')}"`,
        `"${sample.patientName.replace(/"/g, '""')}"`,
        sample.nikshayId,
        `"${sample.tuberculosisUnit.replace(/"/g, '""')}"`,
        `"${sample.sampleFrom.replace(/"/g, '""')}"`,
        `"${sample.typology.replace(/"/g, '""')}"`,
        sample.testType,
        sample.sampleType,
        `"${sample.collectionSite.replace(/"/g, '""')}"`,
        sample.collectionDate,
        sample.collectionTime,
        `"${sample.signOfChoNtep.replace(/"/g, '""')}"`,
        `"${sample.submissionSite.replace(/"/g, '""')}"`,
        sample.submissionDate,
        sample.submissionTime,
        sample.labNo,
        `"${sample.signOfLt.replace(/"/g, '""')}"`,
        sample.daysDifference,
        sample.timeDifferenceHours,
        sample.tatStatus,
        sample.status,
        `"${(sample.validatorNotes || '').replace(/"/g, '""')}"`,
        sample.validatedAt || ''
      ];
      csvRows.push(rowValues.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TB_Samples_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openInspection = (sample: SampleEntry) => {
    setSelectedSample(sample);
    setValidatorNotes(sample.validatorNotes || '');
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerArea}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>🛡️</span> Validator Control Panel
        </h1>
        <button type="button" onClick={exportToCSV} className={styles.exportBtn}>
          📊 Export CSV (For PowerBI Sync)
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiTotal}`}>
          <span className={styles.kpiLabel}>Total Samples</span>
          <span className={styles.kpiValue}>{loading ? '...' : totalCount}</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiPending}`}>
          <span className={styles.kpiLabel}>Pending Review</span>
          <span className={styles.kpiValue}>{loading ? '...' : pendingCount}</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiApproved}`}>
          <span className={styles.kpiLabel}>Approved</span>
          <span className={styles.kpiValue}>{loading ? '...' : approvedCount}</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiRejected}`}>
          <span className={styles.kpiLabel}>Rejected</span>
          <span className={styles.kpiValue}>{loading ? '...' : rejectedCount}</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiCompliance}`}>
          <span className={styles.kpiLabel}>TAT Compliance</span>
          <span className={styles.kpiValue}>{loading ? '...' : `${tatComplianceRate}%`}</span>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Search Details</label>
          <input
            type="text"
            placeholder="Search Name, Nikshay ID, Lab No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.filterInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">⏳ Pending</option>
            <option value="Approved">✓ Approved</option>
            <option value="Rejected">✗ Rejected</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Filter by STP</label>
          <select
            value={stpFilter}
            onChange={(e) => setStpFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="All">All STPs</option>
            <option value="Delhi STP">Delhi STP</option>
            <option value="Punjab STP">Punjab STP</option>
            <option value="Haryana STP">Haryana STP</option>
            <option value="Uttar Pradesh STP">Uttar Pradesh STP</option>
            <option value="Maharashtra STP">Maharashtra STP</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Filter by TAT Status</label>
          <select
            value={tatFilter}
            onChange={(e) => setTatFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="All">All TAT Statuses</option>
            <option value="Within TAT">✓ Within TAT (≤ 24h)</option>
            <option value="TAT Exceeded">⚠️ TAT Exceeded (&gt; 24h)</option>
          </select>
        </div>
      </div>

      {/* Main Table view */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⏳</div>
            <p>Fetching TB diagnostic entries from server...</p>
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📂</div>
            <p>No matching sample records found in the tracking database.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Nikshay ID</th>
                <th className={styles.th}>Patient Name</th>
                <th className={styles.th}>Name of STP</th>
                <th className={styles.th}>Test / Sample</th>
                <th className={styles.th}>Time Gap</th>
                <th className={styles.th}>TAT Status</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSamples.map((sample) => (
                <tr 
                  key={sample.id} 
                  className={`${styles.tr} ${sample.tatStatus === 'TAT Exceeded' && sample.status === 'Pending' ? styles.trExceeded : ''}`}
                >
                  <td className={styles.td}>
                    <span className={styles.nikshayIdCell}>{sample.nikshayId}</span>
                  </td>
                  <td className={`${styles.td} ${styles.patientNameCell}`}>{sample.patientName}</td>
                  <td className={styles.td}>{sample.nameOfSTP}</td>
                  <td className={styles.td}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sample.testType}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{sample.sampleType}</div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: 700 }}>{sample.timeDifferenceHours} hrs</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{sample.daysDifference} day{sample.daysDifference !== 1 ? 's' : ''} diff</div>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${sample.tatStatus === 'Within TAT' ? styles.badgeWithin : styles.badgeExceeded}`}>
                      {sample.tatStatus === 'Within TAT' ? '✓ Within TAT' : '⚠️ Delayed'}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${
                      sample.status === 'Approved' ? styles.badgeApproved : 
                      sample.status === 'Rejected' ? styles.badgeRejected : 
                      styles.badgePending
                    }`}>
                      {sample.status === 'Approved' ? '✓ Approved' : 
                       sample.status === 'Rejected' ? '✗ Rejected' : 
                       '⏳ Pending'}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actionGroup}>
                      <button 
                        type="button" 
                        onClick={() => openInspection(sample)} 
                        className={styles.inspectBtn}
                      >
                        🔍 Inspect
                      </button>
                      {sample.status === 'Pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusUpdate(sample.id, 'Approved')}
                            className={styles.approveBtn}
                            disabled={actionLoading}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusUpdate(sample.id, 'Rejected')}
                            className={styles.rejectBtn}
                            disabled={actionLoading}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detailed Inspection Modal */}
      {selectedSample && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                🔍 Inspecting Sample: {selectedSample.id} ({selectedSample.patientName})
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedSample(null)} 
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {/* Section 1: Patient and Administration */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>1. Patient & Administrative Info</h4>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Patient Name</span>
                    <span className={styles.infoValue}>{selectedSample.patientName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Nikshay ID</span>
                    <span className={styles.infoValue} style={{ fontFamily: 'var(--font-mono)' }}>
                      {selectedSample.nikshayId}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Tuberculosis Unit (TU)</span>
                    <span className={styles.infoValue}>{selectedSample.tuberculosisUnit}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Name of STP</span>
                    <span className={styles.infoValue}>{selectedSample.nameOfSTP}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Sample From</span>
                    <span className={styles.infoValue}>{selectedSample.sampleFrom}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Typology</span>
                    <span className={styles.infoValue}>{selectedSample.typology}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Sample Specifications */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>2. Diagnostic & Laboratory Specs</h4>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Test Type</span>
                    <span className={styles.infoValue} style={{ color: 'var(--primary-dark)' }}>
                      {selectedSample.testType}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Sample Type</span>
                    <span className={styles.infoValue}>{selectedSample.sampleType}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Lab No.</span>
                    <span className={styles.infoValue}>{selectedSample.labNo}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Sign of LT (Lab Tech)</span>
                    <span className={styles.infoValue}>{selectedSample.signOfLt}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Created Timestamp</span>
                    <span className={styles.infoValue} style={{ fontSize: '0.8rem' }}>
                      {new Date(selectedSample.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Time Journey */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>3. Time Journey Analysis</h4>
                
                <div className={styles.journeyCompare}>
                  <div className={styles.journeyNode}>
                    <span className={styles.infoLabel}>🟢 COLLECTION NODE</span>
                    <span className={styles.infoValue}>{selectedSample.collectionSite}</span>
                    <span style={{ fontSize: '0.85rem' }}>
                      📅 {selectedSample.collectionDate} &nbsp; 🕒 {selectedSample.collectionTime}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      Authorized By: {selectedSample.signOfChoNtep}
                    </span>
                  </div>
                  
                  <div className={styles.journeyDivider}>➔</div>
                  
                  <div className={styles.journeyNode}>
                    <span className={styles.infoLabel}>🔵 SUBMISSION LAB NODE</span>
                    <span className={styles.infoValue}>{selectedSample.submissionSite}</span>
                    <span style={{ fontSize: '0.85rem' }}>
                      📅 {selectedSample.submissionDate} &nbsp; 🕒 {selectedSample.submissionTime}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      Technician: {selectedSample.signOfLt}
                    </span>
                  </div>
                </div>

                <div className={styles.infoGrid} style={{ marginTop: '0.5rem' }}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Days Difference</span>
                    <span className={styles.infoValue}>{selectedSample.daysDifference} Day(s)</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Time Difference</span>
                    <span className={styles.infoValue}>{selectedSample.timeDifferenceHours} Hours</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>TAT Evaluation</span>
                    <div>
                      <span className={`${styles.badge} ${selectedSample.tatStatus === 'Within TAT' ? styles.badgeWithin : styles.badgeExceeded}`}>
                        {selectedSample.tatStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Validation / Decisions */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>4. Verification Decision</h4>
                
                <div className={styles.validationCard}>
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel} style={{ marginBottom: '0.25rem' }}>
                      Validator Feedback Comments (Optional)
                    </label>
                    <textarea
                      placeholder="Add specific comments on sample condition, TAT delay reasons, or verification status..."
                      value={validatorNotes}
                      onChange={(e) => setValidatorNotes(e.target.value)}
                      disabled={selectedSample.status !== 'Pending' || actionLoading}
                      className={styles.notesInput}
                    />
                  </div>

                  {selectedSample.status === 'Pending' ? (
                    <div className={styles.decisionActions}>
                      <button
                        type="button"
                        onClick={() => handleQuickStatusUpdate(selectedSample.id, 'Rejected', validatorNotes)}
                        className={styles.rejectBtn}
                        style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
                        disabled={actionLoading}
                      >
                        ✗ Reject Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickStatusUpdate(selectedSample.id, 'Approved', validatorNotes)}
                        className={styles.approveBtn}
                        style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
                        disabled={actionLoading}
                      >
                        ✓ Approve & Verify
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>
                        <strong>Current Status:</strong>{' '}
                        <span className={`${styles.badge} ${
                          selectedSample.status === 'Approved' ? styles.badgeApproved : styles.badgeRejected
                        }`}>
                          {selectedSample.status}
                        </span>
                      </div>
                      {selectedSample.validatedAt && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                          Validated on {new Date(selectedSample.validatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
