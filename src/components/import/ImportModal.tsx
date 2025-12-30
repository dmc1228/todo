import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  parseCSVFile,
  detectAsanaColumns,
  transformRows,
  TransformedTask,
} from "../../lib/csvImport";
import { Project, Section, ColumnMapping, AsanaCSVRow } from "../../types";
import "./ImportModal.css";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  projects: Project[];
  onImport: (
    tasks: TransformedTask[],
    createSections: boolean,
    defaultSectionId?: string,
  ) => Promise<void>;
}

type ImportStep = "upload" | "mapping" | "options" | "importing";

export function ImportModal({
  isOpen,
  onClose,
  sections,
  projects,
  onImport,
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<AsanaCSVRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: "" });
  const [createSections, setCreateSections] = useState(true);
  const [defaultSectionId, setDefaultSectionId] = useState<string>("");
  const [transformedTasks, setTransformedTasks] = useState<TransformedTask[]>(
    [],
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    try {
      setError(null);
      const parsed = await parseCSVFile(selectedFile);
      setFile(selectedFile);
      setHeaders(parsed.headers);
      setRows(parsed.rows);

      const detectedMapping = detectAsanaColumns(parsed.headers);
      setMapping(detectedMapping);

      setStep("mapping");
    } catch (err) {
      setError("Failed to parse CSV file. Please check the file format.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping({ ...mapping, [field]: value || undefined });
  };

  const handleContinueFromMapping = () => {
    const tasks = transformRows(rows, mapping, projects);
    setTransformedTasks(tasks);

    if (!defaultSectionId && sections.length > 0) {
      setDefaultSectionId(sections[0].id);
    }

    setStep("options");
  };

  const handleStartImport = async () => {
    setStep("importing");
    setProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await onImport(
        transformedTasks,
        createSections,
        createSections ? undefined : defaultSectionId,
      );

      clearInterval(interval);
      setProgress(100);
      setImportResults({ success: transformedTasks.length, failed: 0 });
    } catch (err) {
      setError("Import failed. Please try again.");
      setImportResults({ success: 0, failed: transformedTasks.length });
    }
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({ name: "" });
    setTransformedTasks([]);
    setProgress(0);
    setError(null);
    setImportResults(null);
    onClose();
  };

  const getNewProjects = () => {
    const projectNames = new Set<string>();
    transformedTasks.forEach((task) => {
      if (task._newProject) {
        projectNames.add(task._newProject);
      }
    });
    return Array.from(projectNames);
  };

  const getNewSections = () => {
    const sectionNames = new Set<string>();
    transformedTasks.forEach((task) => {
      if (task._newSection) {
        sectionNames.add(task._newSection);
      }
    });
    return Array.from(sectionNames);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="import-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="import-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="import-header">
              <h2 className="import-title">Import from CSV</h2>
              <button onClick={handleClose} className="import-close">
                <X size={20} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="import-steps">
              <div
                className={`step ${step === "upload" ? "active" : ["mapping", "options", "importing"].includes(step) ? "completed" : ""}`}
              >
                <div className="step-circle">1</div>
                <div className="step-label">Upload</div>
              </div>
              <div className="step-line" />
              <div
                className={`step ${step === "mapping" ? "active" : ["options", "importing"].includes(step) ? "completed" : ""}`}
              >
                <div className="step-circle">2</div>
                <div className="step-label">Mapping</div>
              </div>
              <div className="step-line" />
              <div
                className={`step ${step === "options" ? "active" : step === "importing" ? "completed" : ""}`}
              >
                <div className="step-circle">3</div>
                <div className="step-label">Options</div>
              </div>
              <div className="step-line" />
              <div className={`step ${step === "importing" ? "active" : ""}`}>
                <div className="step-circle">4</div>
                <div className="step-label">Import</div>
              </div>
            </div>

            {/* Content */}
            <div className="import-content">
              {/* Step 1: Upload */}
              {step === "upload" && (
                <div className="upload-step">
                  <div
                    className="upload-zone"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <Upload size={48} />
                    <p className="upload-title">Drop CSV file here</p>
                    <p className="upload-subtitle">or</p>
                    <label className="upload-button">
                      Choose File
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileInput}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                  {file && (
                    <div className="file-selected">
                      <Check size={16} />
                      {file.name}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Column Mapping */}
              {step === "mapping" && (
                <div className="mapping-step">
                  <p className="step-description">
                    Map your CSV columns to task fields
                  </p>

                  <div className="mapping-grid">
                    {[
                      {
                        field: "name" as const,
                        label: "Task Name",
                        required: true,
                      },
                      { field: "dueDate" as const, label: "Due Date" },
                      { field: "project" as const, label: "Project" },
                      { field: "tags" as const, label: "Tags" },
                      { field: "notes" as const, label: "Notes" },
                      { field: "section" as const, label: "Section" },
                    ].map(({ field, label, required }) => (
                      <div key={field} className="mapping-row">
                        <label className="mapping-label">
                          {label}{" "}
                          {required && <span className="required">*</span>}
                        </label>
                        <select
                          value={mapping[field] || ""}
                          onChange={(e) =>
                            handleMappingChange(field, e.target.value)
                          }
                          className="mapping-select"
                        >
                          <option value="">Don't import</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="preview-section">
                    <h4 className="preview-title">Preview (first 3 rows)</h4>
                    <div className="preview-table">
                      <table>
                        <thead>
                          <tr>
                            {Object.entries(mapping).map(([key, value]) =>
                              value ? <th key={key}>{key}</th> : null,
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 3).map((row, i) => (
                            <tr key={i}>
                              {Object.entries(mapping).map(([key, value]) =>
                                value ? <td key={key}>{row[value]}</td> : null,
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Options */}
              {step === "options" && (
                <div className="options-step">
                  <div className="option-group">
                    <label className="option-label">Section Handling</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          checked={createSections}
                          onChange={() => setCreateSections(true)}
                        />
                        <span>Create sections from CSV</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          checked={!createSections}
                          onChange={() => setCreateSections(false)}
                        />
                        <span>Import all to:</span>
                        {!createSections && (
                          <select
                            value={defaultSectionId}
                            onChange={(e) =>
                              setDefaultSectionId(e.target.value)
                            }
                            className="inline-select"
                          >
                            {sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>
                    </div>
                  </div>

                  {createSections && getNewSections().length > 0 && (
                    <div className="info-box">
                      <h4>Sections to be created:</h4>
                      <ul>
                        {getNewSections().map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {getNewProjects().length > 0 && (
                    <div className="info-box">
                      <h4>Projects to be created:</h4>
                      <ul>
                        {getNewProjects().map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="summary-box">
                    <p>
                      Ready to import <strong>{transformedTasks.length}</strong>{" "}
                      tasks
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Importing */}
              {step === "importing" && (
                <div className="importing-step">
                  {!importResults ? (
                    <>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="progress-text">
                        Importing{" "}
                        {Math.round((progress / 100) * transformedTasks.length)}{" "}
                        of {transformedTasks.length} tasks...
                      </p>
                    </>
                  ) : (
                    <div className="import-results">
                      {importResults.failed === 0 ? (
                        <>
                          <Check size={48} className="success-icon" />
                          <h3>Import Complete!</h3>
                          <p>
                            Successfully imported {importResults.success} tasks
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={48} className="error-icon" />
                          <h3>Import Failed</h3>
                          <p>
                            {importResults.success} succeeded,{" "}
                            {importResults.failed} failed
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="import-footer">
              {step !== "upload" && step !== "importing" && (
                <button
                  onClick={() =>
                    setStep(
                      step === "mapping"
                        ? "upload"
                        : step === "options"
                          ? "mapping"
                          : "upload",
                    )
                  }
                  className="footer-button secondary"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}

              {step === "mapping" && (
                <button
                  onClick={handleContinueFromMapping}
                  disabled={!mapping.name}
                  className="footer-button primary"
                >
                  Continue
                  <ChevronRight size={16} />
                </button>
              )}

              {step === "options" && (
                <button
                  onClick={handleStartImport}
                  className="footer-button primary"
                >
                  Import {transformedTasks.length} Tasks
                </button>
              )}

              {step === "importing" && importResults && (
                <button onClick={handleClose} className="footer-button primary">
                  Done
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
