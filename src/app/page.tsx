'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

// Initial state for form data
const initialFormState = {
  nameOfSTP: 'Delhi STP',
  patientName: '',
  nikshayId: '',
  tuberculosisUnit: '',
  sampleFrom: 'OPD',
  typology: 'New case',
  testType: 'CBNAAT',
  sampleType: 'Sputum',
  collectionSite: '',
  collectionDate: '',
  collectionTime: '',
  signOfChoNtep: '',
  submissionSite: '',
  submissionDate: '',
  submissionTime: '',
  labNo: '',
  signOfLt: '',
};

export default function Home() {
  const [formData, setFormData] = useState(initialFormState);
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdEntry, setCreatedEntry] = useState<any>(null);

  // Dynamic calculations state
  const [daysDiff, setDaysDiff] = useState(0);
  const [hoursDiff, setHoursDiff] = useState(0);
  const [tatStatus, setTatStatus] = useState<'Within TAT' | 'TAT Exceeded'>('Within TAT');

  // Set default dates to today on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().slice(0, 5);
    setFormData((prev) => ({
      ...prev,
      collectionDate: today,
      collectionTime: time,
      submissionDate: today,
      submissionTime: time,
    }));
  }, []);

  // Run dynamic calculation when date/time fields change
  useEffect(() => {
    const { collectionDate, collectionTime, submissionDate, submissionTime } = formData;
    if (collectionDate && collectionTime && submissionDate && submissionTime) {
      const collDT = new Date(`${collectionDate}T${collectionTime}`);
      const subDT = new Date(`${submissionDate}T${submissionTime}`);

      if (!isNaN(collDT.getTime()) && !isNaN(subDT.getTime())) {
        // 1. Days difference
        const cDate = new Date(collectionDate);
        const sDate = new Date(submissionDate);
        const timeDiff = sDate.getTime() - cDate.getTime();
        const days = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
        setDaysDiff(days);

        // 2. Hours difference
        const msDiff = subDT.getTime() - collDT.getTime();
        const hours = Math.max(0, Math.round((msDiff / (1000 * 60 * 60)) * 100) / 100);
        setHoursDiff(hours);

        // 3. TAT status
        setTatStatus(hours <= 24 ? 'Within TAT' : 'TAT Exceeded');
      }
    }
  }, [formData.collectionDate, formData.collectionTime, formData.submissionDate, formData.submissionTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.patientName.trim()) newErrors.patientName = 'Patient Name is required';
      if (!formData.nikshayId.trim()) {
        newErrors.nikshayId = 'Nikshay ID is required';
      } else if (!/^\d+$/.test(formData.nikshayId)) {
        newErrors.nikshayId = 'Nikshay ID must contain numbers only';
      }
      if (!formData.tuberculosisUnit.trim()) newErrors.tuberculosisUnit = 'Tuberculosis Unit is required';
    } else if (step === 2) {
      // Step 2 has mostly dropdowns with initial defaults. Add custom checks here if required.
    } else if (step === 3) {
      if (!formData.collectionSite.trim()) newErrors.collectionSite = 'Collection Site is required';
      if (!formData.collectionDate) newErrors.collectionDate = 'Collection Date is required';
      if (!formData.collectionTime) newErrors.collectionTime = 'Collection Time is required';
      if (!formData.signOfChoNtep.trim()) newErrors.signOfChoNtep = 'CHO/NTEP signature is required';
      
      if (!formData.submissionSite.trim()) newErrors.submissionSite = 'Submission Site is required';
      if (!formData.submissionDate) newErrors.submissionDate = 'Submission Date is required';
      if (!formData.submissionTime) newErrors.submissionTime = 'Submission Time is required';
      if (!formData.labNo.trim()) newErrors.labNo = 'Lab Number is required';
      if (!formData.signOfLt.trim()) newErrors.signOfLt = 'Lab Tech signature is required';

      // Logical sanity check: submission should be after collection
      if (formData.collectionDate && formData.collectionTime && formData.submissionDate && formData.submissionTime) {
        const collDT = new Date(`${formData.collectionDate}T${formData.collectionTime}`);
        const subDT = new Date(`${formData.submissionDate}T${formData.submissionTime}`);
        if (subDT.getTime() < collDT.getTime()) {
          newErrors.submissionDate = 'Submission must be after collection time';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setCreatedEntry(result.sample);
        setSubmitSuccess(true);
        setFormData(initialFormState); // reset form
        setCurrentStep(1); // reset step
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.message || 'Failed to submit entry'}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Network error occurred. Please check if NextJS server is active.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitSuccess(false);
    setCreatedEntry(null);
  };

  const downloadReceipt = () => {
    if (!createdEntry) return;
    const jsonStr = JSON.stringify(createdEntry, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${createdEntry.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.main}>
      {/* Hero Banner Area */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>SAMPLE TRACKING PORTAL</h1>
          <p className={styles.heroSubtitle}>
            Real-Time Monitoring of TB Diagnostic Sample Journey & TAT Compliance
          </p>

          {/* journey stepper flow visualizer */}
          <div className={styles.stepper}>
            <div className={`${styles.step} ${currentStep >= 1 ? styles.stepActive : ''}`}>
              <div className={styles.stepIcon}>🩸</div>
              <span className={styles.stepText}>Collection</span>
            </div>
            <div className={styles.stepArrow}>➔</div>
            <div className={`${styles.step} ${currentStep >= 2 ? styles.stepActive : ''}`}>
              <div className={styles.stepIcon}>🚚</div>
              <span className={styles.stepText}>Transport</span>
            </div>
            <div className={styles.stepArrow}>➔</div>
            <div className={`${styles.step} ${currentStep >= 3 ? styles.stepActive : ''}`}>
              <div className={styles.stepIcon}>🏢</div>
              <span className={styles.stepText}>Lab Receipt</span>
            </div>
            <div className={styles.stepArrow}>➔</div>
            <div className={styles.step}>
              <div className={styles.stepIcon}>🔬</div>
              <span className={styles.stepText}>Testing</span>
            </div>
            <div className={styles.stepArrow}>➔</div>
            <div className={styles.step}>
              <div className={styles.stepIcon}>📄</div>
              <span className={styles.stepText}>Result Report</span>
            </div>
          </div>

          {/* Quick Static Info for visual wow */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Sample Target</div>
              <div className={styles.statValue}>477,242</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Verified Diagnostics</div>
              <div className={styles.statValue}>476,777</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Entry Form Card */}
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>
          <span>📝</span> TB Diagnostic Sample Registration
        </h2>

        {/* Step Tabs indicator */}
        <div className={styles.tabs}>
          <button 
            type="button"
            className={`${styles.tab} ${currentStep === 1 ? styles.tabActive : ''}`}
            onClick={() => currentStep > 1 && setCurrentStep(1)}
          >
            <span className={styles.tabNumber}>1</span>
            Patient & Center Info
          </button>
          <button 
            type="button"
            className={`${styles.tab} ${currentStep === 2 ? styles.tabActive : ''}`}
            onClick={() => (validateStep(1) ? setCurrentStep(2) : null)}
          >
            <span className={styles.tabNumber}>2</span>
            Sample Details
          </button>
          <button 
            type="button"
            className={`${styles.tab} ${currentStep === 3 ? styles.tabActive : ''}`}
            onClick={() => (validateStep(1) && validateStep(2) ? setCurrentStep(3) : null)}
          >
            <span className={styles.tabNumber}>3</span>
            Timestamps & Lab Receipt
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Patient & STP info */}
          {currentStep === 1 && (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name of STP</label>
                <select 
                  name="nameOfSTP" 
                  value={formData.nameOfSTP} 
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="Delhi STP">Delhi STP</option>
                  <option value="Punjab STP">Punjab STP</option>
                  <option value="Haryana STP">Haryana STP</option>
                  <option value="Uttar Pradesh STP">Uttar Pradesh STP</option>
                  <option value="Maharashtra STP">Maharashtra STP</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Patient Name *</label>
                <input 
                  type="text" 
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  placeholder="Enter patient full name"
                  className={`${styles.input} ${errors.patientName ? styles.inputError : ''}`}
                />
                {errors.patientName && <span className={styles.errorMsg}>{errors.patientName}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Nikshay ID *</label>
                <input 
                  type="text" 
                  name="nikshayId"
                  value={formData.nikshayId}
                  onChange={handleChange}
                  placeholder="Enter Nikshay ID (digits only)"
                  className={`${styles.input} ${errors.nikshayId ? styles.inputError : ''}`}
                />
                {errors.nikshayId && <span className={styles.errorMsg}>{errors.nikshayId}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tuberculosis Unit (TU) *</label>
                <input 
                  type="text" 
                  name="tuberculosisUnit"
                  value={formData.tuberculosisUnit}
                  onChange={handleChange}
                  placeholder="e.g. TU East Delhi"
                  className={`${styles.input} ${errors.tuberculosisUnit ? styles.inputError : ''}`}
                />
                {errors.tuberculosisUnit && <span className={styles.errorMsg}>{errors.tuberculosisUnit}</span>}
              </div>
            </div>
          )}

          {/* STEP 2: Diagnostic & Typology Info */}
          {currentStep === 2 && (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Sample From</label>
                <select 
                  name="sampleFrom" 
                  value={formData.sampleFrom} 
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="OPD">OPD (Outpatient Department)</option>
                  <option value="IPD">IPD (Inpatient Department)</option>
                  <option value="Active Case Finding">Active Case Finding (ACF)</option>
                  <option value="Private Provider Referral">Private Provider Referral</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Typology</label>
                <select 
                  name="typology" 
                  value={formData.typology} 
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="New case">New case</option>
                  <option value="Previously Treated Case">Previously Treated Case</option>
                  <option value="Drug Resistant TB Suspect">Drug Resistant TB Suspect</option>
                  <option value="Contact of DRTB Case">Contact of DRTB Case</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Test Type</label>
                <select 
                  name="testType" 
                  value={formData.testType} 
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="CBNAAT">CBNAAT (GeneXpert)</option>
                  <option value="Truenat">Truenat</option>
                  <option value="Smear Microscopy">Smear Microscopy</option>
                  <option value="Culture & DST">Culture & DST</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sample Type</label>
                <select 
                  name="sampleType" 
                  value={formData.sampleType} 
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="Sputum">Sputum</option>
                  <option value="CSF">CSF (Cerebrospinal Fluid)</option>
                  <option value="Pus">Pus</option>
                  <option value="Pleural Fluid">Pleural Fluid</option>
                  <option value="Lymph Node Aspirate">Lymph Node Aspirate</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: Collection and Submission Dates + Signatures */}
          {currentStep === 3 && (
            <div className={styles.formGrid}>
              {/* Collection Section */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Collection Site *</label>
                <input 
                  type="text" 
                  name="collectionSite"
                  value={formData.collectionSite}
                  onChange={handleChange}
                  placeholder="e.g. PHC Kalyanpur"
                  className={`${styles.input} ${errors.collectionSite ? styles.inputError : ''}`}
                />
                {errors.collectionSite && <span className={styles.errorMsg}>{errors.collectionSite}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sign of CHO/ NTEP Staff *</label>
                <input 
                  type="text" 
                  name="signOfChoNtep"
                  value={formData.signOfChoNtep}
                  onChange={handleChange}
                  placeholder="Enter name/signature tag"
                  className={`${styles.input} ${errors.signOfChoNtep ? styles.inputError : ''}`}
                />
                {errors.signOfChoNtep && <span className={styles.errorMsg}>{errors.signOfChoNtep}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Collection Date *</label>
                <input 
                  type="date" 
                  name="collectionDate"
                  value={formData.collectionDate}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.collectionDate ? styles.inputError : ''}`}
                />
                {errors.collectionDate && <span className={styles.errorMsg}>{errors.collectionDate}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Collection Time *</label>
                <input 
                  type="time" 
                  name="collectionTime"
                  value={formData.collectionTime}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.collectionTime ? styles.inputError : ''}`}
                />
                {errors.collectionTime && <span className={styles.errorMsg}>{errors.collectionTime}</span>}
              </div>

              {/* Submission Section */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Submission Site *</label>
                <input 
                  type="text" 
                  name="submissionSite"
                  value={formData.submissionSite}
                  onChange={handleChange}
                  placeholder="e.g. DTC Lab Noida"
                  className={`${styles.input} ${errors.submissionSite ? styles.inputError : ''}`}
                />
                {errors.submissionSite && <span className={styles.errorMsg}>{errors.submissionSite}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Lab No. *</label>
                <input 
                  type="text" 
                  name="labNo"
                  value={formData.labNo}
                  onChange={handleChange}
                  placeholder="e.g. LAB-2026-9281"
                  className={`${styles.input} ${errors.labNo ? styles.inputError : ''}`}
                />
                {errors.labNo && <span className={styles.errorMsg}>{errors.labNo}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Submission Date *</label>
                <input 
                  type="date" 
                  name="submissionDate"
                  value={formData.submissionDate}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.submissionDate ? styles.inputError : ''}`}
                />
                {errors.submissionDate && <span className={styles.errorMsg}>{errors.submissionDate}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Submission Time *</label>
                <input 
                  type="time" 
                  name="submissionTime"
                  value={formData.submissionTime}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.submissionTime ? styles.inputError : ''}`}
                />
                {errors.submissionTime && <span className={styles.errorMsg}>{errors.submissionTime}</span>}
              </div>

              <div className={styles.formGroupFull}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Sign of LT (Lab Technician) *</label>
                  <input 
                    type="text" 
                    name="signOfLt"
                    value={formData.signOfLt}
                    onChange={handleChange}
                    placeholder="Enter Lab Technician name"
                    className={`${styles.input} ${errors.signOfLt ? styles.inputError : ''}`}
                  />
                  {errors.signOfLt && <span className={styles.errorMsg}>{errors.signOfLt}</span>}
                </div>
              </div>

              {/* Dynamic Turnaround Calculations display */}
              <div className={styles.calcSummary}>
                <div className={styles.calcTitle}>
                  <span>⚡</span> Live Turnaround Time (TAT) Calculation
                </div>
                <div className={styles.calcGrid}>
                  <div className={styles.calcItem}>
                    <div className={styles.calcLabel}>Days Difference</div>
                    <div className={styles.calcValue}>{daysDiff} Day{daysDiff !== 1 ? 's' : ''}</div>
                  </div>
                  <div className={styles.calcItem}>
                    <div className={styles.calcLabel}>Time Difference</div>
                    <div className={styles.calcValue}>{hoursDiff} hr{hoursDiff !== 1 ? 's' : ''}</div>
                  </div>
                  <div className={styles.calcItem}>
                    <div className={styles.calcLabel}>TAT Compliance</div>
                    <div>
                      <span className={`${styles.badge} ${tatStatus === 'Within TAT' ? styles.badgeWithin : styles.badgeExceeded}`}>
                        {tatStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Actions */}
          <div className={styles.formActions}>
            {currentStep > 1 ? (
              <button 
                type="button" 
                onClick={handlePrev} 
                className={styles.btnSec}
              >
                ◀ Back
              </button>
            ) : (
              <div></div> // dummy spacing
            )}

            {currentStep < 3 ? (
              <button 
                type="button" 
                onClick={handleNext} 
                className={styles.btnPri}
              >
                Continue ▶
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className={styles.btnPri}
              >
                {isSubmitting ? 'Registering Sample...' : '🚀 Submit Diagnostic Entry'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Success Modal Overlay */}
      {submitSuccess && createdEntry && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>✓</div>
            <h3 className={styles.modalTitle}>Entry Registered Successfully!</h3>
            <p className={styles.modalSubtitle}>
              The TB diagnostic sample details have been safely written to the tracking database and queued for verification.
            </p>

            <div className={styles.receipt}>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Sample ID:</span>
                <span className={styles.receiptValue}>{createdEntry.id}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Patient Name:</span>
                <span className={styles.receiptValue}>{createdEntry.patientName}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Nikshay ID:</span>
                <span className={styles.receiptValue}>{createdEntry.nikshayId}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Days / Time Diff:</span>
                <span className={styles.receiptValue}>
                  {createdEntry.daysDifference} d / {createdEntry.timeDifferenceHours} h
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>TAT Status:</span>
                <span className={styles.receiptValue}>
                  <span className={`${styles.badge} ${createdEntry.tatStatus === 'Within TAT' ? styles.badgeWithin : styles.badgeExceeded}`}>
                    {createdEntry.tatStatus}
                  </span>
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Verification Status:</span>
                <span className={styles.receiptValue} style={{ color: 'var(--pending)' }}>
                  ⏳ PENDING VALIDATION
                </span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => {
                  window.location.href = '/validator';
                }} 
                className={styles.btnPri}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                🛡️ Open Validator Panel
              </button>
              <button 
                type="button" 
                onClick={downloadReceipt} 
                className={styles.btnSec}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                📥 Download JSON Receipt
              </button>
              <button 
                type="button" 
                onClick={handleReset} 
                className={styles.btnSec}
                style={{ width: '100%', justifyContent: 'center', background: 'transparent', border: 'none' }}
              >
                Register another sample
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
